package edu.uclm.tp3.common.services;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

import edu.uclm.tp3.common.deterministic.Coder;
import edu.uclm.tp3.common.deterministic.FreqTable;
import edu.uclm.tp3.common.deterministic.Pair;
import edu.uclm.tp3.common.deterministic.QCircuit;
import edu.uclm.tp3.common.hamming.MixedCombination;

@Service
public class HammingService {
	
	public Map<String, Object> calculate(int qubits, FreqTable expectedFrequencies, String functionPrefix) throws Exception {
		int shots = expectedFrequencies.getShots();
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


		List<Pair> pairs = expectedFrequencies.getPairs();
		int numberOfPairs = pairs.size();

		List<MixedCombination> ternas = new ArrayList<>();
		for (int i = 0; i < pairs.size(); i++) {
			int a = pairs.get(i).getIndex();
			boolean added = false;
			for (int j = i+1; j < pairs.size(); j++) {
				int b = pairs.get(j).getIndex();
				int distance = weightedHammingDistance(a, b, qubits);
				if (distance==1) {
					ternas.add(new MixedCombination(a, b, qubits));
					added = true;
					pairs.remove(j);
					pairs.remove(i);
					i=i-1;
					break;
				}
			}
			if (!added) {
				ternas.add(new MixedCombination(a, -1, qubits));
				pairs.remove(i);
				i = i-1;
			}
		}

		boolean simplified = false;
		do {
			simplified = this.simplify(ternas);
		} while (simplified);

		this.sort(ternas);

		List<Map<String, Object>> partialCircuits = new ArrayList<>();
		StringBuilder code = new StringBuilder();
		List<Integer> values = new ArrayList<>();
		for (MixedCombination terna : ternas) {
			QCircuit circuit = terna.getCircuit();
			Map<String, Object> cleanCircuit = circuit.clean(qubits, functionPrefix);
			partialCircuits.add(cleanCircuit);
			code.append(terna.getCode());
			values.add(terna.values.size());
		}

		String diceCircuit = this.getDice(numberOfPairs);

		Map<String, Object> result = new HashMap<>();
		result.put("#QUBITS#", qubits);
		result.put("#OUTPUT_QUBITS#", qubits);
		result.put("#SHOTS#", shots);
		result.put("#CALCULUS#", "circuits[0].append(get" + functionPrefix + "0(), [" + Coder.getTargetQubits(0, qubits) + "])");
		result.put("#ALGORITHM#", "Hamming");
		result.put("#INITIALIZE#", code);
		result.put("#EXPECTED#", sbExpected.toString());
		result.put("#CIRCUITS_DECLARATION#", "QuantumCircuit(qubits, qubits)");
		result.put("QUIRK", partialCircuits);
		return result;
	}

	private String getDice(int functions) {
		int bits = Integer.SIZE - Integer.numberOfLeadingZeros(functions);
		StringBuilder sb = new StringBuilder("def getDice() :\n");
		sb.append("\tU = QuantumCircuit(" + bits + ")\n");
		sb.append("\tfor i in range (" + bits + ") :\n");
		sb.append("\t\tU.h(i)\n");
		sb.append("\treturn U\n");
		return sb.toString();
	}

	private boolean simplify(List<MixedCombination> ternas) {
		for (int i=0; i<ternas.size(); i++) {
			MixedCombination a = ternas.get(i);
			for (int j=i+1; j<ternas.size(); j++) {
				MixedCombination b = ternas.get(j);
				MixedCombination t = MixedCombination.unify(a, b);
				if (t!=null) {
					ternas.set(i, t);
					ternas.remove(j);
					return true;
				}
			}
		}
		return false;
	}

	private void sort(List<MixedCombination> ternas) {
		ternas.sort((t1, t2) -> t1.unified.compareTo(t2.unified));
	}

	private void print(List<MixedCombination> ternas) {
		int size = ternas.size();
		for (int i=0; i<size; i++) {
			MixedCombination a = ternas.get(i);
			System.out.println(i + "-> " + a.toString());
		}
	}

	private static int weightedHammingDistance(int a, int b, int qubits) {
		return Integer.bitCount(a ^ b);	

		/*int distance = 0;
		for (int i = 0; i < qubits; i++) {
			int bitA = (a >> i) & 1;
			int bitB = (b >> i) & 1;
			if (bitA != bitB) {
				int weight = 1; // qubits - i;
				distance += weight;
			}
		}
		return distance;*/
	}
}
