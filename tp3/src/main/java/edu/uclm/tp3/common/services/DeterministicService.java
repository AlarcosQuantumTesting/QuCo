package edu.uclm.tp3.common.services;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Service;

import edu.uclm.tp3.Utils;
import edu.uclm.tp3.coders.Quirk2Cirq;
import edu.uclm.tp3.coders.Quirk2Qiskit;
import edu.uclm.tp3.common.deterministic.BinaryTree;
import edu.uclm.tp3.common.deterministic.Coder;
import edu.uclm.tp3.common.deterministic.FreqTable;
import edu.uclm.tp3.common.deterministic.Pair;
import edu.uclm.tp3.common.deterministic.QCircuit;
import edu.uclm.tp3.common.deterministic.UnifierSolver;
import edu.uclm.tp3.common.utils.BinaryTreesUtils;
import edu.uclm.tp3.dao.BinaryTreeDao;

@Service
public class DeterministicService {
	@Autowired
	private BinaryTreeDao btDao;
	
	public Map<String, Object> calculate(int qubits, FreqTable expectedFrequencies, double physicalAngle, String prefix, boolean originalGR, String backend) throws Exception {
		BinaryTree tree = BinaryTreesUtils.buildTree(this.btDao, qubits, expectedFrequencies.getPairs(), prefix, originalGR, physicalAngle);

		QCircuit quirkCircuit = BinaryTree2Quirk.buildQuirk(tree, qubits, -1, originalGR);
		
		int shots = expectedFrequencies.getShots();
		UnifierSolver solver = new UnifierSolver(tree, prefix, originalGR);
		Map<String, Object> result = solver.solve(shots, backend);

		Map<String, Object> cleanCircuit = quirkCircuit.toJson().toMap();

		result.put("#QUBITS#", qubits);
		result.put("#OUTPUT_QUBITS#", qubits);
		result.put("#SHOTS#", Math.max(shots, 1024));
		result.put("#EXPECTED#", getExpected(expectedFrequencies, shots, false, qubits));
		result.put("#CIRCUITS_DECLARATION#", getCircuitsDeclaration(backend, qubits, false, expectedFrequencies.getPairs().size()));

		String sCalculus = this.getFunction0(backend, qubits, prefix, 1);

		result.put("#CALCULUS#", sCalculus);
		result.put("tree", tree.toMap());
		result.put("#ALGORITHM#", originalGR ? "Grover and Rudolph" : "Greenoble");

		List<Map<String, Object>> partialCircuits = new ArrayList<>();
		partialCircuits.add(cleanCircuit);
		result.put("QUIRK", partialCircuits);
		return result;
	}

	public Map<String, Object> calculateInParallel(int qubits, FreqTable expectedFrequencies, double physicalAngle, String prefix, boolean originalGR, String backend) throws Exception {
		int numberOfPairs = expectedFrequencies.getPairs().size();
		List<QCircuit> circuits = BinaryTree2Quirk.buildQuirkParallel(this.btDao, expectedFrequencies, qubits, originalGR, physicalAngle, prefix);

		QCircuit parallelCircuit = BinaryTree2Quirk.parallelize(circuits, qubits); 
		int shots = expectedFrequencies.getShots();

		Map<String, Object> result = new HashMap<>();
        result.put("#QUBITS#", qubits*numberOfPairs);
		result.put("#OUTPUT_QUBITS#", qubits*numberOfPairs);
		result.put("#SHOTS#", Math.max(1024, expectedFrequencies.getShots()));
		result.put("#EXPECTED#", this.getExpected(expectedFrequencies, shots, true, qubits));

		List<Map<String, Object>> circuit = new ArrayList<>();
        circuit.add(parallelCircuit.toJson().toMap());
		result.put("QUIRK", circuit);
		StringBuilder code;
		if (backend.equalsIgnoreCase("qiskit"))
			code = Quirk2Qiskit.getGatesDeclaration(parallelCircuit); 
		else
			code = Quirk2Cirq.getGatesDeclaration(parallelCircuit);
		
		result.put("#INITIALIZE#", code);
		result.put("#CIRCUITS_DECLARATION#", getCircuitsDeclaration(backend, qubits, false, numberOfPairs));	
		result.put("#ALGORITHM#", originalGR ? "Grover and Rudolph parallel" : "Greenoble parallel");

		String sCalculus = this.getFunction0(backend, qubits, prefix, numberOfPairs);
		result.put("#CALCULUS#", sCalculus);
		return result;
	}
	
	public Map<String, Object> calculateSplitting(int qubits, FreqTable expectedFrequencies, double physicalAngle, String prefix, boolean originalGR, String backend) throws Exception {
		int numberOfPairs = expectedFrequencies.getPairs().size();

		List<QCircuit> circuits = BinaryTree2Quirk.buildQuirkSplitting(this.btDao, expectedFrequencies, qubits, originalGR, physicalAngle, prefix);

		Map<String, Object> result = new HashMap<>();
		result.put("#QUBITS#", qubits);
		result.put("#OUTPUT_QUBITS#", qubits);
		result.put("#SHOTS#", Math.max(1024, expectedFrequencies.getShots()));
		result.put("#EXPECTED#", this.getExpected(expectedFrequencies, numberOfPairs, originalGR, qubits));
		result.put("#CIRCUITS_DECLARATION#", getCircuitsDeclaration(backend, qubits, true, numberOfPairs));		
		result.put("QUIRK", BinaryTree2Quirk.toMap(circuits));
		result.put("#ALGORITHM#", originalGR ? "Grover and Rudolph split" : "Greenoble split");

		String sCalculus = "for i in range(0, len(circuits)) :\n" + 
			"\tfor j in range(startQubit, qubits) :\n" +
			"\t\tcircuits[i].h(j)\n";
		StringBuilder sbExpected = new StringBuilder("expected = [");
		for (int i=0; i<numberOfPairs; i++) {
			sCalculus = sCalculus + "circuits[" + i + "].append(getcirc" + i + "_0(), [" + Coder.getTargetQubits(0, qubits) + "])\n";
			Pair pair = expectedFrequencies.getPairs().get(i);
			int index = pair.getIndex();
			sbExpected.append("(" + index + ", 1),");
			if (i>0 && i%10==0)
				sbExpected.append("\n");
		}
		sbExpected.append("]");

		result.put("#CALCULUS#", sCalculus);
	
		StringBuilder code;
		if (backend.equalsIgnoreCase("qiskit"))
			code = Quirk2Qiskit.getGatesDeclaration(circuits); 
		else
			code = Quirk2Cirq.getGatesDeclaration(circuits);
		result.put("#INITIALIZE#", code);

		return result;
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

	private String getCircuitsDeclaration(String backend, int qubits, boolean splitting, int numberOfPairs) {
		if (backend.equalsIgnoreCase("qiskit")) {
			if (!splitting)
				return "QuantumCircuit(qubits, qubits)";
			 else {
				StringBuilder circuitsDeclaration = new StringBuilder();
				for (int i=0; i<numberOfPairs; i++)
					circuitsDeclaration.append("QuantumCircuit(qubits, qubits), ");
				return circuitsDeclaration.toString();
			 }
		} else {
			if (!splitting)
				return "cirq.Circuit()";
			 else {
				StringBuilder circuitsDeclaration = new StringBuilder();
				for (int i=0; i<numberOfPairs; i++)
					circuitsDeclaration.append("cirq.Circuit(), ");
				return circuitsDeclaration.toString();
			}
		}
	}

	private String getExpected(FreqTable expectedFrequencies, int shots, boolean parallel, int qubits) {
		StringBuilder sbExpected = new StringBuilder("expected = [");
		if (parallel) {
			int startQubit = 0;
			String sCalculus = "for i in range(0, len(circuits)) :\n" + 
				"\tfor j in range(startQubit, qubits) :\n" +
				"\t\tcircuits[i].h(j)\n";
			for (int i=0; i<expectedFrequencies.getPairs().size(); i++) {
				sCalculus = sCalculus + "circuits[0].append(getcirc" + i + "_0(), [" + Coder.getTargetQubits(startQubit, startQubit+qubits) + "])\n";

				Pair pair = expectedFrequencies.getPairs().get(i);
				int index = pair.getIndex();
				int freq = pair.getFreq();
				sbExpected.append("(" + index + ", " + (1.0*freq/shots) + "),");
				if (i>0 && i%10==0)
					sbExpected.append("\n");
				startQubit = startQubit + qubits;
			}
		} else {
			for (int i=0; i<expectedFrequencies.getPairs().size(); i++) {
				Pair pair = expectedFrequencies.getPairs().get(i);
				int index = pair.getIndex();
				int freq = pair.getFreq();
				sbExpected.append("(" + index + ", " + (1.0*freq/shots) + "),");
				if (i>0 && i%10==0)
					sbExpected.append("\n");
			}
		}
		sbExpected.append("]");
		return sbExpected.toString();
	}

	private String getFunction0(String backend, int qubits, String prefix, int circuits) {
		String sCalculus;
		if (backend.equalsIgnoreCase("qiskit")) {
			sCalculus = "for i in range(0, len(circuits)) :\n" + 
					"\tfor j in range(startQubit, qubits) :\n" +
					"\t\tcircuits[i].h(j)\n";
			if (circuits==1) {
				sCalculus = sCalculus + "\tcircuits[i].append(get" + prefix + "0(), [" + Coder.getTargetQubits(0, qubits) + "])";
			} else {
				int startQubit = 0;
				for (int i=0; i<circuits; i++) {
					sCalculus = sCalculus + "circuits[0].append(getcirc" + i + "_0(), [" + Coder.getTargetQubits(startQubit, startQubit+qubits) + "])\n";
					startQubit = startQubit + qubits;
				}
			}
		} else {
			int startQubit = 0;
			sCalculus = "all_qs = cirq.LineQubit.range(qubits)\n";
			sCalculus = sCalculus + "for circuit in circuits:\n";
			for (int i=0; i<circuits; i++) {
				sCalculus = sCalculus + "\tappend_subcircuit(circuit, getcirc" + i + "_0(), all_qs[" + startQubit + ":" + (startQubit+qubits) + "])\n";
				startQubit = startQubit + qubits;
			}
		}
		return sCalculus;
	}
}
