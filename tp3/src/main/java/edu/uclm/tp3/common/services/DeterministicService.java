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
import edu.uclm.tp3.coders.Quirk2Qiskit;
import edu.uclm.tp3.common.deterministic.BinaryTree;
import edu.uclm.tp3.common.deterministic.Coder;
import edu.uclm.tp3.common.deterministic.FreqTable;
import edu.uclm.tp3.common.deterministic.GRCircuit;
import edu.uclm.tp3.common.deterministic.Pair;
import edu.uclm.tp3.common.deterministic.QCircuit;
import edu.uclm.tp3.common.deterministic.QColumn;
import edu.uclm.tp3.common.deterministic.QGate;
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
				if (tree.getDepth() == qubits + 1) {
					tree.setCircuit(new GRCircuit());
					return tree;
				}
			} catch (IOException | ClassNotFoundException e) {
				// throw new IllegalStateException("Error al descomprimir BinaryTree para " +
				// qubits, e);
			}
		}

		// 2) No existe → creamos
		BinaryTree tree = new BinaryTree();
		tree.setQubits(qubits);
		for (int j = 0; j < qubits; j++)
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
				GZIPOutputStream gos = new GZIPOutputStream(bos);
				ObjectOutputStream oos = new ObjectOutputStream(gos)) {
			oos.writeObject(obj);
			oos.flush();
			gos.finish(); // cierra el flujo GZIP correctamente
			return bos.toByteArray();
		}
	}

	private BinaryTree decompress(byte[] data) throws IOException, ClassNotFoundException {
		try (ByteArrayInputStream bis = new ByteArrayInputStream(data);
				GZIPInputStream gis = new GZIPInputStream(bis);
				ObjectInputStream ois = new ObjectInputStream(gis)) {
			return (BinaryTree) ois.readObject();
		}
	}

	private BinaryTree buildTree(int qubits, List<Pair> pairs, String prefix) {
		BinaryTree tree = this.findTree(qubits);
		for (int i = 0; i < pairs.size(); i++) {
			Pair pair = pairs.get(i);
			int index = pair.getIndex();
			String binary = String.format("%" + qubits + "s", Integer.toBinaryString(index)).replace(' ', '0');
			int freq = pair.getFreq();
			tree.setFrequencies(binary, freq);
		}

		if (prefix.length() > 0)
			tree.setPrefixes("", prefix);

		tree.normalizeProbabilities();
		tree.getCircuit().setQubits(qubits);
		return tree;
	}

	public Map<String, Object> calculate(int qubits, FreqTable expectedFrequencies, double physicalAngle, String prefix,
			boolean originalGR) throws Exception {
		BinaryTree tree = this.buildTree(qubits, expectedFrequencies.getPairs(), prefix);

		if (!originalGR && physicalAngle > 0) {
			double minProb = Math.cos(physicalAngle / 2 + Math.PI / 4);
			minProb = minProb * minProb;
			tree.removeLowAngles(physicalAngle);
		}

		QCircuit quirkCircuit = BinaryTree2Quirk.buildQuirk(tree, qubits, -1, originalGR);

		int shots = expectedFrequencies.getShots();
		UnifierSolver solver = new UnifierSolver(tree, prefix, originalGR);
		Map<String, Object> result = solver.solve(shots);

		Map<String, Object> cleanCircuit = quirkCircuit.toJson().toMap();

		result.put("#QUBITS#", qubits);
		result.put("#OUTPUT_QUBITS#", qubits);
		result.put("#SHOTS#", "1024");
		String sCalculus = "for i in range(0, len(circuits)) :\n" +
				"\tfor j in range(startQubit, qubits) :\n" +
				"\t\tcircuits[i].h(j)\n" +
				"circuits[0].append(get" + prefix + "0(), [" + Coder.getTargetQubits(0, qubits) + "])";
		result.put("#CALCULUS#", sCalculus);
		result.put("tree", tree.toMap());
		result.put("#ALGORITHM#", originalGR ? "Grover and Rudolph" : "Grenoble");

		List<Map<String, Object>> partialCircuits = new ArrayList<>();
		partialCircuits.add(cleanCircuit);
		result.put("QUIRK", partialCircuits);

		StringBuilder sbExpected = new StringBuilder("expected = [");
		for (int i = 0; i < expectedFrequencies.getPairs().size(); i++) {
			Pair pair = expectedFrequencies.getPairs().get(i);
			int index = pair.getIndex();
			int freq = pair.getFreq();
			sbExpected.append("(" + index + ", " + (1.0 * freq / shots) + "),");
			if (i > 0 && i % 10 == 0)
				sbExpected.append("\n");
		}
		sbExpected.append("]");
		result.put("#EXPECTED#", sbExpected.toString());
		result.put("#CIRCUITS_DECLARATION#", "QuantumCircuit(qubits, qubits)");
		return result;
	}

	public Map<String, Object> calculateSplitting(int qubits, FreqTable expectedFrequencies, double physicalAngle,
			String prefix, boolean originalGR) throws Exception {
		int numberOfPairs = expectedFrequencies.getPairs().size();

		List<Map<String, Object>> partialCircuits = new ArrayList<>();
		List<QCircuit> circuits = new ArrayList<>();
		for (int i = 0; i < expectedFrequencies.getPairs().size(); i++) {
			Pair pair = expectedFrequencies.getPairs().get(i);
			FreqTable ft = new FreqTable();
			ft.addPair(pair);
			BinaryTree tree = this.buildTree(qubits, ft.getPairs(), prefix + "circ" + i + "_");
			if (!originalGR && physicalAngle > 0) {
				double minProb = Math.cos(physicalAngle / 2 + Math.PI / 4);
				minProb = minProb * minProb;
				tree.removeLowAngles(physicalAngle);
			}
			QCircuit pairCircuit = BinaryTree2Quirk.buildQuirk(tree, qubits, i, originalGR);
			circuits.add(pairCircuit);
			partialCircuits.add(pairCircuit.toJson().toMap());
		}

		StringBuilder circuitsDeclaration = new StringBuilder();
		String sCalculus = "for i in range(0, len(circuits)) :\n" +
				"\tfor j in range(startQubit, qubits) :\n" +
				"\t\tcircuits[i].h(j)\n";
		StringBuilder sbExpected = new StringBuilder("expected = [");
		for (int i = 0; i < numberOfPairs; i++) {
			sCalculus = sCalculus + "circuits[" + i + "].append(getcirc" + i + "_0(), ["
					+ Coder.getTargetQubits(0, qubits) + "])\n";
			Pair pair = expectedFrequencies.getPairs().get(i);
			int index = pair.getIndex();
			sbExpected.append("(" + index + ", 1),");
			if (i > 0 && i % 10 == 0)
				sbExpected.append("\n");
			circuitsDeclaration.append("QuantumCircuit(qubits, qubits), ");
		}
		sbExpected.append("]");
		Map<String, Object> result = new HashMap<>();
		result.put("#QUBITS#", qubits);
		result.put("#OUTPUT_QUBITS#", qubits);
		result.put("#SHOTS#", "1024");
		result.put("#EXPECTED#", sbExpected.toString());
		result.put("#CALCULUS#", sCalculus);
		result.put("#CIRCUITS_DECLARATION#", circuitsDeclaration);
		result.put("#ALGORITHM#", originalGR ? "Grover and Rudolph split" : "Grenoble split");
		result.put("QUIRK", partialCircuits);
		result.put("#INITIALIZE#", Quirk2Qiskit.getGatesDeclaration(circuits));

		return result;
	}

	public Map<String, Object> calculateInParallel(int qubits, FreqTable expectedFrequencies, double physicalAngle,
			String prefix, boolean originalGR) throws Exception {
		int numberOfPairs = expectedFrequencies.getPairs().size();
		List<QCircuit> circuits = new ArrayList<>();

		for (int i = 0; i < expectedFrequencies.getPairs().size(); i++) {
			Pair pair = expectedFrequencies.getPairs().get(i);
			FreqTable ft = new FreqTable();
			ft.addPair(pair);
			BinaryTree tree = this.buildTree(qubits, ft.getPairs(), prefix + "circ" + i + "_");
			if (!originalGR && physicalAngle > 0) {
				double minProb = Math.cos(physicalAngle / 2 + Math.PI / 4);
				minProb = minProb * minProb;
				tree.removeLowAngles(physicalAngle);
			}
			QCircuit pairCircuit = BinaryTree2Quirk.buildQuirk(tree, qubits, i, originalGR);
			circuits.add(pairCircuit);
		}

		QCircuit parallelCircuit = this.parallelize(circuits, qubits);

		Map<String, Object> result = new HashMap<>();
		List<Map<String, Object>> circuit = new ArrayList<>();
		circuit.add(parallelCircuit.toJson().toMap());
		result.put("QUIRK", circuit);
		result.put("#QUBITS#", qubits * numberOfPairs);
		result.put("#OUTPUT_QUBITS#", qubits * numberOfPairs);
		result.put("#SHOTS#", "1024");
		StringBuilder code = Quirk2Qiskit.getGatesDeclaration(parallelCircuit);
		result.put("#INITIALIZE#", code);

		int shots = expectedFrequencies.getShots();

		result.put("#CIRCUITS_DECLARATION#", "QuantumCircuit(qubits, qubits),");

		result.put("#ALGORITHM#", originalGR ? "Grover and Rudolph parallel" : "Grenoble parallel");

		StringBuilder sbExpected = new StringBuilder("expected = [");
		int startQubit = 0;
		String sCalculus = "for i in range(0, len(circuits)) :\n" +
				"\tfor j in range(startQubit, qubits) :\n" +
				"\t\tcircuits[i].h(j)\n";
		for (int i = 0; i < numberOfPairs; i++) {
			sCalculus = sCalculus + "circuits[0].append(getcirc" + i + "_0(), ["
					+ Coder.getTargetQubits(startQubit, startQubit + qubits) + "])\n";

			Pair pair = expectedFrequencies.getPairs().get(i);
			int index = pair.getIndex();
			int freq = pair.getFreq();
			sbExpected.append("(" + index + ", " + (1.0 * freq / shots) + "),");
			if (i > 0 && i % 10 == 0)
				sbExpected.append("\n");
			startQubit = startQubit + qubits;
		}
		sbExpected.append("]");
		result.put("#EXPECTED#", sbExpected.toString());
		result.put("#CALCULUS#", sCalculus);
		return result;
	}

	private QCircuit parallelize(List<QCircuit> circuits, int qubits) {
		QCircuit quirkCircuit = new QCircuit();
		int maxCols = this.addGates(quirkCircuit, circuits);

		for (int i = 0; i < maxCols; i++) {
			List<QColumn> columns = this.getColumn(i, circuits);
			QColumn column = QColumn.merge(columns, qubits, quirkCircuit);
			quirkCircuit.addColumn(column);
		}

		return quirkCircuit;
	}

	private int addGates(QCircuit quirkCircuit, List<QCircuit> circuits) {
		int maxCols = 0;
		for (int i = 0; i < circuits.size(); i++) {
			QCircuit circuit = circuits.get(i);
			if (circuit.getColumns().size() > maxCols)
				maxCols = circuit.getColumns().size();
			for (int j = 0; j < circuit.getGates().size(); j++) {
				QGate gate = circuit.getGates().get(j);
				quirkCircuit.addGate(gate);
			}
		}
		return maxCols;
	}

	private List<QColumn> getColumn(int index, List<QCircuit> circuits) {
		List<QColumn> columns = new ArrayList<>();
		for (int i = 0; i < circuits.size(); i++) {
			QCircuit circuit = circuits.get(i);
			if (index < circuit.getColumns().size())
				columns.add(circuit.getColumns().get(index));
			else
				columns.add(null);
		}
		return columns;
	}

	public List<Map<String, String>> getTemplates() throws IOException {
		List<Map<String, String>> templates = new ArrayList<>();
		PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
		Resource[] resources = resolver.getResources("classpath*:d.*");
		for (Resource resource : resources) {
			String fn = resource.getFilename();
			HashMap<String, String> template = new HashMap<>();
			template.put("code", Utils.readFileAsString(this, resource.getFilename()));
			fn = fn.substring(fn.lastIndexOf(File.separatorChar) + 1);
			template.put("name", fn);
			templates.add(template);
		}
		return templates;
	}

}
