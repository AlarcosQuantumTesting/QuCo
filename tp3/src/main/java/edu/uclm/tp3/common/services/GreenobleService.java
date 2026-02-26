package edu.uclm.tp3.common.services;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;

import jakarta.transaction.Transactional;

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
import edu.uclm.tp3.common.deterministic.UnifierSolver;
import edu.uclm.tp3.dao.BinaryTreeDao;
import edu.uclm.tp3.dao.BinaryTreeEntity;

@Service
public class GreenobleService {

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

	private BinaryTree buildTree(int qubits, List<Pair> pairs, String functionPrefix, String splitIndex) {
		BinaryTree tree = this.findTree(qubits);
		for (int i=0; i<pairs.size(); i++) {
			Pair pair = pairs.get(i);
			int index = pair.getIndex();
			String binary = String.format("%" + qubits + "s", Integer.toBinaryString(index)).replace(' ', '0');
			int freq = pair.getFreq();
			tree.setFrequencies(binary, freq);
		}
		
		if (functionPrefix.length()>0)
			tree.setPrefixes("", functionPrefix);

		if (splitIndex!=null)
			tree.setPrefixes(splitIndex, functionPrefix);

		tree.normalizeProbabilities();		
		tree.getCircuit().setQubits(qubits);
		return tree;
	}
	
	public Map<String, Object> calculate(int qubits, FreqTable expectedFrequencies, double physicalAngle, String functionPrefix, boolean originalGR) throws Exception {
		BinaryTree tree = this.buildTree(qubits, expectedFrequencies.getPairs(), functionPrefix, null);
		
		if (!originalGR && physicalAngle>0) {
			double minProb = Math.cos(physicalAngle/2 + Math.PI/4);
			minProb = minProb * minProb;
			tree.removeLowAngles(physicalAngle);
		}

		int shots = expectedFrequencies.getShots();
		UnifierSolver solver = new UnifierSolver(tree, functionPrefix, originalGR);
		Map<String, Object> result = solver.solve(shots);

		QCircuit quirkCircuit = (QCircuit) result.get("QUIRK");
		Map<String, Object> cleanCircuit = quirkCircuit.clean(qubits);

		result.put("#QUBITS#", qubits);
		result.put("#OUTPUT_QUBITS#", qubits);
		result.put("#SHOTS#", shots);
		result.put("#CALCULUS#", "circuits[0].append(get" + functionPrefix + "0(), [" + Coder.getTargetQubits(0, qubits) + "])");
		result.put("tree", tree.toMap());
		result.put("#ALGORITHM#", originalGR ? "Grover and Rudolph" : "Grenoble");

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
		result.put("#CIRCUITS_DECLARATION#", "QuantumCircuit(qubits, qubits)");
		return result;
	}

	private Map<String, Object> buildSeveral(int qubits, FreqTable expectedFrequencies, double physicalAngle, String functionPrefix, boolean originalGR) throws Exception {
		int shots = expectedFrequencies.getShots();

		int numberOfPairs = expectedFrequencies.getPairs().size();
		Map<String, Object> result = new HashMap<>();

		List<Map<String, Object>> trees = new ArrayList<>();
		StringBuilder initializers = new StringBuilder();
		
		List<Map<String, Object>> partialCircuits = new ArrayList<>();

		for (int i=0; i<numberOfPairs; i++) {
			List<Pair> currentPair = new ArrayList<>();
			Pair pair = expectedFrequencies.getPairs().get(i);
			currentPair.add(pair);
			String splitIndex = "v" + i + "_";
			BinaryTree tree = this.buildTree(qubits, currentPair, functionPrefix, splitIndex);
					
			if (!originalGR && physicalAngle>0) {
				double minProb = Math.cos(physicalAngle/2 + Math.PI/4);
				minProb = minProb * minProb;
				tree.removeLowAngles(physicalAngle);
			}

			UnifierSolver solver = new UnifierSolver(tree, functionPrefix, originalGR);
			Map<String, Object> partialResult = solver.solve(shots);

			QCircuit quirkCircuit = (QCircuit) partialResult.get("QUIRK");
			Map<String, Object> cleanCircuit = quirkCircuit.clean(qubits);

			trees.add(tree.toMap());
			String initializer = "\n\n# Functions for getting the value " + expectedFrequencies.getPairs().get(i).getIndex() + "\n" + partialResult.get("#INITIALIZE#").toString();
			initializers.append(initializer);
			partialCircuits.add(cleanCircuit);
		}
		result.put("#INITIALIZE#", initializers);
		result.put("trees", trees);
		result.put("QUIRK", partialCircuits);		
		result.put("#QUBITS#", qubits);
		result.put("#OUTPUT_QUBITS#", qubits);
		result.put("#SHOTS#", expectedFrequencies.getShots());
		result.put("partialCircuits", partialCircuits);

		return result;
	}

	public Map<String, Object> calculateSplitting(int qubits, FreqTable expectedFrequencies, double physicalAngle, String functionPrefix, boolean originalGR) throws Exception {
		Map<String, Object> result = this.buildSeveral(qubits, expectedFrequencies, physicalAngle, functionPrefix, originalGR);

		int numberOfPairs = expectedFrequencies.getPairs().size();
		StringBuilder circuitsDeclaration = new StringBuilder();
		StringBuilder calculus = new StringBuilder();
		StringBuilder sbExpected = new StringBuilder("expected = [");
		for (int i=0; i<numberOfPairs; i++) {
			calculus.append("circuits[" + i + "].append(get" + functionPrefix + "v" + i + "_0(), [" + Coder.getTargetQubits(0, qubits) + "])\n");
			Pair pair = expectedFrequencies.getPairs().get(i);
			int index = pair.getIndex();
			sbExpected.append("(" + index + ", 1),");
			if (i>0 && i%10==0)
				sbExpected.append("\n");
			circuitsDeclaration.append("QuantumCircuit(qubits, qubits), ");
		}
		sbExpected.append("]");
		result.put("#EXPECTED#", sbExpected.toString());
		result.put("#CALCULUS#", calculus.toString());
		result.put("#CIRCUITS_DECLARATION#", circuitsDeclaration);	
		result.put("#ALGORITHM#", originalGR ? "Grover and Rudolph split" : "Grenoble split");
		return result;
	}

	@SuppressWarnings("unchecked")
	public Map<String, Object> calculateInParallel(int qubits, FreqTable expectedFrequencies, double physicalAngle, String functionPrefix, boolean originalGR) throws Exception {
		Map<String, Object> result = this.buildSeveral(qubits, expectedFrequencies, physicalAngle, functionPrefix, originalGR);
		int shots = expectedFrequencies.getShots();
		int numberOfPairs = expectedFrequencies.getPairs().size();

		List<Map<String, Object>> partialCircuits = (List<Map<String, Object>>) result.remove("partialCircuits");
		Map<String, Object> generalCircuit = this.groupCircuits(partialCircuits, qubits);
		result.put("#CIRCUITS_DECLARATION#", "QuantumCircuit(qubits, qubits),");	

		result.put("#QUBITS#", qubits*numberOfPairs);
		result.put("#OUTPUT_QUBITS#", qubits*numberOfPairs);
		result.put("#SHOTS#", shots);
		result.put("QUIRK", generalCircuit);
		result.put("#ALGORITHM#", originalGR ? "Grover and Rudolph parallel" : "Grenoble parallel");

		StringBuilder calculus = new StringBuilder();
		StringBuilder sbExpected = new StringBuilder("expected = [");
		int startQubit = 0;
		for (int i=0; i<numberOfPairs; i++) {
			calculus.append("circuits[0].append(get" + functionPrefix + "v" + i + "_0(), [" + Coder.getTargetQubits(startQubit, startQubit+qubits) + "])\n");

			Pair pair = expectedFrequencies.getPairs().get(i);
			int index = pair.getIndex();
			int freq = pair.getFreq();
			sbExpected.append("(" + index + ", " + (1.0*freq/shots) + "),");
			if (i>0 && i%10==0)
				sbExpected.append("\n");
			startQubit = startQubit + qubits;
		}
		sbExpected.append("]");
		result.put("#EXPECTED#", sbExpected.toString());
		result.put("#CALCULUS#", calculus.toString());
		return result;
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


}
