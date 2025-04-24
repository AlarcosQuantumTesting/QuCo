package edu.uclm.tp3.common.services;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;

import javax.transaction.Transactional;

import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Service;

import edu.uclm.tp3.Utils;
import edu.uclm.tp3.common.deterministic.BinaryTree;
import edu.uclm.tp3.common.deterministic.Coder;
import edu.uclm.tp3.common.deterministic.FreqTable;
import edu.uclm.tp3.common.deterministic.GRCircuit;
import edu.uclm.tp3.common.deterministic.Pair;
import edu.uclm.tp3.common.deterministic.QCircuit;
import edu.uclm.tp3.common.deterministic.QColumn;
import edu.uclm.tp3.common.deterministic.Solver;
import edu.uclm.tp3.common.deterministic.UnifierSolver;
import edu.uclm.tp3.dao.BinaryTreeDao;
import edu.uclm.tp3.dao.BinaryTreeEntity;

@Service
public class DeterministicService {

	@Autowired
	private BinaryTreeDao btDao;

	@Transactional
    public BinaryTree findTree(int qubits) {
        // 1) Intentamos cargar
        Optional<BinaryTreeEntity> optEntity = btDao.findById(qubits);
        if (optEntity.isPresent()) {
            try {
                // Descompress & deserialize
                BinaryTree tree = decompress(optEntity.get().getTreeData());
				tree.setCircuit(new GRCircuit());
                return tree;
            } catch (IOException | ClassNotFoundException e) {
                //throw new IllegalStateException("Error al descomprimir BinaryTree para " + qubits, e);
            }
        }

        // 2) No existe → creamos
        BinaryTree tree = new BinaryTree();
        tree.setQubits(qubits);
        for (int j = 0; j < qubits-1; j++)
            tree.addChildren();

        try {
            byte[] compressed = compress(tree);
            BinaryTreeEntity entity = new BinaryTreeEntity();
            entity.setQubits(qubits);
            entity.setTreeData(compressed);
            btDao.save(entity);
        } catch (IOException e) {
            throw new IllegalStateException("Error al comprimir BinaryTree para " + qubits, e);
        }

        return tree;
    }

	public static byte[] compress(Serializable obj) throws IOException {
		try (ByteArrayOutputStream bos = new ByteArrayOutputStream();
			GZIPOutputStream gos        = new GZIPOutputStream(bos);
			ObjectOutputStream oos      = new ObjectOutputStream(gos)) {
			oos.writeObject(obj);
			oos.flush();
			gos.finish();  // cierra el flujo GZIP correctamente
			return bos.toByteArray();
		}
	}

	private BinaryTree decompress(byte[] data) throws IOException, ClassNotFoundException {
        try (ByteArrayInputStream bis = new ByteArrayInputStream(data);
             GZIPInputStream gis        = new GZIPInputStream(bis);
             ObjectInputStream ois      = new ObjectInputStream(gis)) {
            return (BinaryTree) ois.readObject();
        }
    }

	private void createTrees(int from, int to) throws IOException {
		for (int i = from; i <= to; i++) {
			System.out.println("Creating tree for " + i + " qubits");
			
			// --- construyes tu árbol ---
			BinaryTree tree = new BinaryTree();
			tree.setQubits(i);
			for (int j = 0; j < i - 1; j++) {
				tree.addChildren();
			}
			
			// --- serializas y comprimes el árbol ---
			byte[] compressedTree = compress(tree);
			
			// --- preparas la entidad con los bytes comprimidos ---
			BinaryTreeEntity entity = new BinaryTreeEntity();
			entity.setQubits(tree.getQubits());
			entity.setTreeData(compressedTree);  // asume que has cambiado el campo en la entidad a byte[]
			
			// --- guardas en BD ---
			this.btDao.save(entity);
		}
	}
	
	public Map<String, Object> calculate(int qubits, FreqTable expectedFrequencies, double physicalAngle, String functionPrefix, boolean originalGR) throws Exception {
		int nOfOutputs = (int) Math.pow(2, qubits);
		int shots = expectedFrequencies.getShots();

		//this.createTrees(2, 50);
		BinaryTree tree = this.findTree(qubits);
		
		for (int i=0; i<nOfOutputs; i++) {
			String binary = String.format("%" + qubits + "s", Integer.toBinaryString(i)).replace(' ', '0');
			int freq = expectedFrequencies.getFreq(i);
			tree.setFrequencies(binary, freq);
		}
		
		if (functionPrefix.length()>0)
			tree.setPrefixes("", functionPrefix);

		tree.normalizeProbabilities();
		
		tree.getCircuit().setQubits(qubits);
		
		Solver solver = null;
		if (!originalGR && physicalAngle>0) {
			double minProb = Math.cos(physicalAngle/2 + Math.PI/4);
			minProb = minProb * minProb;
			tree.removeLowAngles(physicalAngle);
		}

		solver = new UnifierSolver(tree, functionPrefix, originalGR);
		Map<String, Object> result = solver.solve(shots);

		QCircuit qCircuit = (QCircuit) result.get("QUIRK");
		Map<String, Object> cleanCircuit = this.clean(qCircuit, qubits, null);

		result.put("#QUBITS#", qubits);
		result.put("#OUTPUT_QUBITS#", qubits);
		result.put("#SHOTS#", shots);
		result.put("#HADAMARDS#", this.getHadamards());
		result.put("#MEASURES#", this.getMeasures(qubits));
		result.put("#CALCULUS#", "circuit.append(get" + functionPrefix + "0(), qreg)");
		result.put("tree", tree.toMap());

		List<Map<String, Object>> partialCircuits = new ArrayList<>();
		partialCircuits.add(cleanCircuit);
		result.put("QUIRK", partialCircuits);

		StringBuilder sbExpected = new StringBuilder("expected = [");
		for (int i=0; i<expectedFrequencies.getPairs().size(); i++) {
			Pair pair = expectedFrequencies.getPairs().get(i);
			int index = pair.getIndex();
			int freq = pair.getFreq();
			sbExpected.append("(" + index + ", " + (1.0*freq/shots) + "),");
			if (i>0 && i%10==0)
				sbExpected.append("\n");
		}
		sbExpected.append("]");
		result.put("#EXPECTED#", sbExpected.toString());

		return result;
	}

	public Map<String, Object> calculateSplitting(int qubits, FreqTable expectedFrequencies, double physicalAngle, String functionPrefix, boolean originalGR) throws Exception {
		int shots = expectedFrequencies.getShots();

		int numberOfPairs = expectedFrequencies.getPairs().size();
		Map<String, Object> result = new HashMap<>();

		List<Map<String, Object>> trees = new ArrayList<>();
		StringBuilder initializers = new StringBuilder();
		StringBuilder code = new StringBuilder();
		int startQubit = 0, endQubit;
		List<Map<String, Object>> partialCircuits = new ArrayList<>();

		for (int i=0; i<numberOfPairs; i++) {
			BinaryTree tree = this.findTree(qubits);
			
			Pair pair = expectedFrequencies.getPairs().get(i);
			String binary = String.format("%" + qubits + "s", Integer.toBinaryString(pair.getIndex())).replace(' ', '0');
			int freq = expectedFrequencies.getFreq(pair.getIndex());
			tree.setFrequencies(binary, freq);

			String splitIndex = "v" + i + "_";
			tree.setPrefixes(splitIndex, functionPrefix);
			tree.normalizeProbabilities();
		
			GRCircuit circuit = new GRCircuit();
			circuit.setQubits(qubits);
			
			Solver solver = null;
			if (!originalGR && physicalAngle>0) {
				double minProb = Math.cos(physicalAngle/2 + Math.PI/4);
				minProb = minProb * minProb;
				tree.removeLowAngles(physicalAngle);
			}

			solver = new UnifierSolver(tree, functionPrefix, originalGR);
			Map<String, Object> partialResult = solver.solve(shots);

			QCircuit qCircuit = (QCircuit) partialResult.get("QUIRK");
			Map<String, Object> cleanCircuit = this.clean(qCircuit, qubits, splitIndex.toString());

			trees.add(tree.toMap());
			String initializer = "\n\n# Functions for getting the value " + expectedFrequencies.getPairs().get(i).getIndex() + "\n" + partialResult.get("#INITIALIZE#").toString();
			initializers.append(initializer);
			partialCircuits.add(cleanCircuit);
			endQubit = startQubit + qubits;
			code.append("circuits[" + i + "].append(get" + splitIndex + functionPrefix + "0(), [" + Coder.getTargetQubits(startQubit, endQubit) + "]) # Use this line to use functions\n");
			//startQubit = endQubit;
		}

		StringBuilder circuitsDeclaration = new StringBuilder();
		for (int i=0; i<numberOfPairs; i++) 
			circuitsDeclaration.append("QuantumCircuit(qreg, creg),");
		
		result.put("#CIRCUITS_DECLARATION#", circuitsDeclaration.toString());
		result.put("#CALCULUS#", code.toString());
		result.put("#QUBITS#", qubits);
		result.put("#OUTPUT_QUBITS#", qubits);
		result.put("#SHOTS#", shots);
		result.put("#HADAMARDS#", this.getHadamards());
		result.put("#INITIALIZE#", initializers);
		result.put("trees", trees);
		result.put("QUIRK", partialCircuits);
		
		StringBuilder sbExpected = new StringBuilder("expected = [");
		for (int i=0; i<numberOfPairs; i++) {
			Pair pair = expectedFrequencies.getPairs().get(i);
			int index = pair.getIndex();
			//int freq = pair.getFreq();
			sbExpected.append("(" + index + ", 1),");
			if (i>0 && i%10==0)
				sbExpected.append("\n");
		}
		sbExpected.append("]");
		result.put("#EXPECTED#", sbExpected.toString());
		return result;
	}

	public Map<String, Object> calculateInParallel(int qubits, FreqTable expectedFrequencies, double physicalAngle, String functionPrefix, boolean originalGR) throws Exception {
		int shots = expectedFrequencies.getShots();

		int numberOfPairs = expectedFrequencies.getPairs().size();
		Map<String, Object> result = new HashMap<>();

		List<Map<String, Object>> trees = new ArrayList<>();
		StringBuilder initializers = new StringBuilder();
		StringBuilder code = new StringBuilder();
		int startQubit = 0, endQubit;
		List<Map<String, Object>> partialCircuits = new ArrayList<>();

		for (int i=0; i<numberOfPairs; i++) {
			BinaryTree tree = this.findTree(qubits);
			
			Pair pair = expectedFrequencies.getPairs().get(i);
			String binary = String.format("%" + qubits + "s", Integer.toBinaryString(pair.getIndex())).replace(' ', '0');
			int freq = expectedFrequencies.getFreq(pair.getIndex());
			tree.setFrequencies(binary, freq);

			String splitIndex = "v" + i + "_";
			tree.setPrefixes(splitIndex, functionPrefix);
			tree.normalizeProbabilities();
		
			GRCircuit circuit = new GRCircuit();
			circuit.setQubits(qubits);
			
			Solver solver = null;
			if (!originalGR && physicalAngle>0) {
				double minProb = Math.cos(physicalAngle/2 + Math.PI/4);
				minProb = minProb * minProb;
				tree.removeLowAngles(physicalAngle);
			}

			solver = new UnifierSolver(tree, functionPrefix, originalGR);
			Map<String, Object> partialResult = solver.solve(shots);

			QCircuit qCircuit = (QCircuit) partialResult.get("QUIRK");
			Map<String, Object> cleanCircuit = this.clean(qCircuit, qubits, splitIndex.toString());

			trees.add(tree.toMap());
			String initializer = "\n\n# Functions for getting the value " + expectedFrequencies.getPairs().get(i).getIndex() + "\n" + partialResult.get("#INITIALIZE#").toString();
			initializers.append(initializer);
			partialCircuits.add(cleanCircuit);
			endQubit = startQubit + qubits;
			code.append("circuit.append(get" + splitIndex + functionPrefix + "0(), [" + Coder.getTargetQubits(startQubit, endQubit) + "]) # Use this line to use functions\n");
			startQubit = endQubit;
		}

		Map<String, Object> generalCircuit = this.groupCircuits(partialCircuits, qubits);
		result.put("#CALCULUS#", code.toString());
		result.put("#QUBITS#", qubits*numberOfPairs);
		result.put("#OUTPUT_QUBITS#", qubits*numberOfPairs);
		result.put("#SHOTS#", shots);
		result.put("#HADAMARDS#", this.getHadamards());
		result.put("#INITIALIZE#", initializers);
		result.put("trees", trees);
		result.put("QUIRK", generalCircuit);

		List<Pair> expectedPairs = new ArrayList<>();
		int[] totalFrequencies = { 0 };
		int totalQubits = qubits * numberOfPairs;
		for (int i=0; i<numberOfPairs; i++) {
			int leftQubits = qubits*i;
			int rightQubits = totalQubits - qubits*(i+1);

			Pair pair = expectedFrequencies.getPairs().get(i);

			//this.generateAll(qubits, leftQubits, pair, rightQubits, expectedPairs, totalFrequencies);
		}
		
		StringBuilder sbExpected = new StringBuilder("expected = [");
		for (int i=0; i<expectedPairs.size(); i++) {
			Pair pair = expectedPairs.get(i);
			int index = pair.getIndex();
			int freq = pair.getFreq();
			sbExpected.append("(" + index + ", " + (1.0*freq/totalFrequencies[0]) + "),");
			if (i>0 && i%10==0)
				sbExpected.append("\n");
		}
		sbExpected.append("]");
		result.put("#EXPECTED#", sbExpected.toString());
		return result;
	}

	private Map<String, Object> clean(QCircuit circuit, int qubits, String splitIndex) {
		circuit.sortGates();
		QColumn column0 = new QColumn();
		if (splitIndex==null)
			column0.addGate("~0");
		else
			column0.addGate("~" + splitIndex + "0");

		circuit.insertColumn(column0, 0);

		QColumn column1 = new QColumn();
		for (int i=0; i<qubits; i++)
			column1.addGate("H");
		circuit.insertColumn(column1, 0);

		JSONObject jso = circuit.toJson();
		JSONArray jsaCols = jso.getJSONObject("circuit").getJSONArray("cols");
		jso.remove("circuit");
		jso.put("cols", jsaCols);

		return jso.toMap();
	}

	/*private void generateAll(int qubits, int leftQubits, Pair pair, int rightQubits, List<Pair> expectedPairs, int[] totalFrequencies) {
		String sIndex = print(pair.getIndex(), qubits);
		int totalLength = leftQubits + qubits + rightQubits;

		for (int i = 0; i < (1 << leftQubits); i++) {
			String sLeft = print(i, leftQubits);
			for (int j = 0; j < (1 << rightQubits); j++) {
				String sRight = print(j, rightQubits);

				// Construimos sValue con StringBuilder
				StringBuilder sbValue = new StringBuilder(totalLength);
				sbValue.append(sLeft)
					.append(sIndex)
					.append(sRight);
				String sValue = sbValue.toString();

				int value = Integer.parseInt(sValue, 2);

				Pair existingPair = new Pair().setIndex(value);
				int pos = Collections.binarySearch(expectedPairs, existingPair);
				if (pos < 0) {
					pos = -pos - 1;
					existingPair.setFreq(pair.getFreq());
					totalFrequencies[0] += pair.getFreq();
					expectedPairs.add(pos, existingPair);
				} else {
					Pair found = expectedPairs.get(pos);
					totalFrequencies[0] += pair.getFreq();
					found.setFreq(found.getFreq() + pair.getFreq());
				}
			}
		}
	}*/

	private static String print(int index, int length) {
		if (length == 0) {
			return "";
		}
		String bin = Integer.toBinaryString(index);
		int zeros = length - bin.length();

		StringBuilder sb = new StringBuilder(length);
		// Añadimos los ceros a la izquierda
		for (int k = 0; k < zeros; k++) {
			sb.append('0');
		}
		// Añadimos el resto de la representación binaria
		sb.append(bin);
		return sb.toString();
	}


	private Map<String, Object> groupCircuits(List<Map<String, Object>> generalCircuits, int qubits) {
		JSONObject jso = new JSONObject();

		JSONArray jsaGates = new JSONArray();
		for (Map<String, Object> partialCircuit : generalCircuits) {
			JSONObject jsoPartialCircuit = new JSONObject(partialCircuit);
			JSONArray jsaPartialGates = jsoPartialCircuit.getJSONArray("gates");
			jsaGates.putAll(jsaPartialGates);
		}

		JSONArray jsaCols = new JSONArray();
		JSONArray jsaCol0 = new JSONArray();
		for (int i=0; i<qubits*generalCircuits.size(); i++) {
			jsaCol0.put("H");
		}
		jsaCols.put(jsaCol0);

		int ones = 0;
		for (int i=0; i<generalCircuits.size(); i++) {
			JSONArray jsaCol1 = new JSONArray();
			for (int j=0; j<ones; j++)
				jsaCol1.put(1);
			jsaCol1.put("~v" + i + "_0");
			jsaCols.put(jsaCol1);
			ones += qubits;
		}

		jso.put("gates", jsaGates);
		jso.put("cols", jsaCols);
		
		return jso.toMap();
	}

	public List<Map<String, String>> getTemplates() throws IOException {
		List<Map<String, String>> templates = new ArrayList<>();
		PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        Resource[] resources = resolver.getResources("classpath*:d.*");
        for (Resource resource : resources) {
        	String fn = resource.getFilename();
        	HashMap<String, String> template = new HashMap<>();
        	template.put("code", Utils.readFileAsString(this, resource.getFilename()));
        	fn = fn.substring(fn.lastIndexOf(File.separatorChar)+1);
        	template.put("name", fn);
            templates.add(template);
        }
		return templates;
	}

	private String getHadamards() {
		String h = "for i in range (0, qubits) :\n";
		h = h + "\tcircuit.h(i)\n";
		return h;
	}

	private String getMeasures(int qubits) {
		StringBuilder sb = new StringBuilder();
		for (int i=0; i<qubits; i++)
			sb.append("circuit.measure(" + i + ", " + (qubits-i-1) + ")\n");
		return sb.toString();
	}
}
