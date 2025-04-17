package edu.uclm.tp3.common.services;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;
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
import edu.uclm.tp3.common.deterministic.UnifierSolver;
import edu.uclm.tp3.common.deterministic.Solver;

@Service
public class DeterministicService {
	
	public Map<String, Object> calculate(int qubits, FreqTable expectedFrequencies, double physicalAngle, String functionPrefix, boolean originalGR) throws Exception {
		int nOfOutputs = (int) Math.pow(2, qubits);
		int shots = expectedFrequencies.getShots();

		BinaryTree tree = new BinaryTree();
		for (int i=0; i<qubits-1; i++)
			tree.addChildren();
		
		for (int i=0; i<nOfOutputs; i++) {
			String binary = String.format("%" + qubits + "s", Integer.toBinaryString(i)).replace(' ', '0');
			int freq = expectedFrequencies.getFreq(i);
			tree.setFrequencies(binary, freq);
		}
		
		tree.assignNames("", functionPrefix);
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
		result.put("QUIRK", cleanCircuit);

		StringBuilder sbExpected = new StringBuilder("expected = [");
		for (int i=0; i<expectedFrequencies.getPairs().size(); i++) {
			Pair pair = expectedFrequencies.getPairs().get(i);
			int index = pair.getIndex();
			int freq = pair.getFreq();
			sbExpected.append("(" + index + ", " + (1.0*freq/shots) + "),");
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

	public Map<String, Object> calculateSplitting(int qubits, FreqTable expectedFrequencies, double physicalAngle, String functionPrefix, boolean originalGR) throws Exception {
		int shots = expectedFrequencies.getShots();

		int pairs = expectedFrequencies.getPairs().size();
		Map<String, Object> result = new HashMap<>();

		List<Map<String, Object>> trees = new ArrayList<>();
		StringBuilder initializers = new StringBuilder();
		StringBuilder code = new StringBuilder();
		int startQubit = 0, endQubit;
		List<Map<String, Object>> partialCircuits = new ArrayList<>();

		for (int i=0; i<pairs; i++) {
			BinaryTree tree = new BinaryTree();
			for (int j=0; j<qubits-1; j++)
				tree.addChildren();
			
			Pair pair = expectedFrequencies.getPairs().get(i);
			String binary = String.format("%" + qubits + "s", Integer.toBinaryString(pair.getIndex())).replace(' ', '0');
			int freq = expectedFrequencies.getFreq(pair.getIndex());
			tree.setFrequencies(binary, freq);

			String splitIndex = "v" + i + "_";
			tree.assignNames(splitIndex, functionPrefix);
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
			Map<String, Object> cleanCircuit = this.clean(qCircuit, qubits, splitIndex);

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
		result.put("#QUBITS#", qubits*pairs);
		result.put("#OUTPUT_QUBITS#", qubits*pairs);
		result.put("#SHOTS#", shots);
		result.put("#HADAMARDS#", this.getHadamards());
		result.put("#INITIALIZE#", initializers);
		result.put("trees", trees);
		result.put("QUIRK", generalCircuit);

		StringBuilder sbExpected = new StringBuilder("expected = [");
		for (int i=0; i<expectedFrequencies.getPairs().size(); i++) {
			Pair pair = expectedFrequencies.getPairs().get(i);
			int index = pair.getIndex();
			int freq = pair.getFreq();
			sbExpected.append("(" + index + ", " + (1.0*freq/shots) + "),");
		}
		sbExpected.append("]");
		result.put("#EXPECTED#", sbExpected.toString());
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
