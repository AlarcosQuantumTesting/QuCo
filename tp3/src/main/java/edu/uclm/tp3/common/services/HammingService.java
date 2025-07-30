package edu.uclm.tp3.common.services;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

import edu.uclm.tp3.common.deterministic.FreqTable;
import edu.uclm.tp3.common.deterministic.Pair;
import edu.uclm.tp3.common.deterministic.QCircuit;
import edu.uclm.tp3.common.hamming.MixedCombination;

@Service
public class HammingService {
	
	public Map<String, Object> calculate(int qubits, FreqTable expectedFrequencies, String functionPrefix) throws Exception {
		int shots = expectedFrequencies.getShots();
		List<Pair> pairs = expectedFrequencies.getPairs();
		int controlQubits = Integer.SIZE - Integer.numberOfLeadingZeros(pairs.size());

		double zeroFreq = Math.pow(2, controlQubits) - pairs.size();

		int totalSpace = (int) Math.pow(2, controlQubits);
		StringBuilder sbExpected = new StringBuilder("expected = [");
		for (int i=0; i<pairs.size(); i++) {
			Pair pair = pairs.get(i);
			int index = pair.getIndex();
			int freq = pair.getFreq();
			if (index==0) {
				sbExpected.append("(" + index + ", " + (zeroFreq + freq) + "/" + totalSpace + "),");
			} else {
				sbExpected.append("(" + index + ", " + freq + "/" + totalSpace + "),");
			}
			if (i>0 && i%10==0)
				sbExpected.append("\n");
		}
		sbExpected.append("]");
		
		List<Pair> originalPairs = expectedFrequencies.deepCopy().getPairs();

		List<MixedCombination> ternas = new ArrayList<>();
		MixedCombination ternaWithZero = null;
		for (int i = 0; i < pairs.size(); i++) {
			int a = pairs.get(i).getIndex();
			boolean added = false;
			for (int j = i+1; j < pairs.size(); j++) {
				int b = pairs.get(j).getIndex();
				int distance = weightedHammingDistance(a, b, qubits);
				if (distance==1) {
					MixedCombination terna = new MixedCombination(a, b, qubits);
					ternas.add(terna);
					added = true;
					pairs.remove(j);
					pairs.remove(i);
					i=i-1;
					if (a==0)
						ternaWithZero = terna;
					break;
				}
			}
			if (!added) {
				MixedCombination terna = new MixedCombination(a, -1, qubits);
				ternas.add(terna);
				pairs.remove(i);
				if (a==0)
					ternaWithZero = terna;
				i = i-1;
			}
		}

		boolean simplified = false;
		do {
			simplified = this.simplify(ternas, ternaWithZero);
		} while (simplified);

		this.sort(ternas);

		List<Map<String, Object>> partialCircuits = new ArrayList<>();
		StringBuilder code = new StringBuilder(this.getDice(ternas));
		//List<Integer> values = new ArrayList<>();
		for (MixedCombination terna : ternas) {
			QCircuit circuit = terna.getCircuit();
			Map<String, Object> cleanCircuit = circuit.clean(qubits);
			partialCircuits.add(cleanCircuit);
			code.append(terna.getCode());
			//values.add(terna.values.size());
		}

		Map<String, Object> result = new HashMap<>();
		result.put("#QUBITS#", qubits + controlQubits);
		result.put("#OUTPUT_QUBITS#", qubits);
		result.put("#SHOTS#", shots);
		result.put("#CALCULUS#", "circuits[0] = getDice()");
		result.put("#ALGORITHM#", "Hamming");
		result.put("#INITIALIZE#", code);
		result.put("#EXPECTED#", sbExpected.toString());
		result.put("#CIRCUITS_DECLARATION#", "QuantumCircuit(qubits, outputQubits)");
		result.put("QUIRK", partialCircuits);
		return result;
	}

	private String getDice(List<MixedCombination> ternas) {
		StringBuilder sb = new StringBuilder("def applyX(value : int, U : QuantumCircuit) :\n" + //
						"\tbits = format(value, f'0{qubits - outputQubits}b')\n" + //
						"\t#print(bits)\n" + //
						"\tfor i in range(qubits-outputQubits) :\n" + //
						"\t\tif bits[i]=='1' :\n" + //
						"\t\t\tU.x(i)\n" + 
						"\tU.barrier()\n\n");

		sb.append("def getDice() :\n");
		sb.append("\tU = QuantumCircuit(qubits, outputQubits)\n");
		sb.append("\tcontrolQubits = qubits-outputQubits\n");

		sb.append("\tfor i in range (controlQubits) :\n");
		sb.append("\t\tU.h(i)\n");
		sb.append("\t\tU.barrier()\n");

		int cont = 0;
		for (int i=0; i<ternas.size(); i++) {
			MixedCombination terna = ternas.get(i);
			for (int j=0; j<terna.values.size(); j++) {
				sb.append("\tapplyX(" + cont + ", U)\n");
				sb.append("\tU.append(" + terna.getName() + "().control(controlQubits), range(qubits))\n");
				sb.append("\tapplyX(" + cont + ", U)\n");
				sb.append("\tU.barrier()\n");
				cont++;
			}
		}

		sb.append("\treturn U\n\n");
		return sb.toString();
	}

	private boolean simplify(List<MixedCombination> ternas, MixedCombination ternaWithZero) {
		for (int i=0; i<ternas.size(); i++) {
			MixedCombination a = ternas.get(i);
			for (int j=i+1; j<ternas.size(); j++) {
				MixedCombination b = ternas.get(j);
				MixedCombination t = MixedCombination.unify(a, b);
				if (t!=null) {
					ternas.set(i, t);
					ternas.remove(j);
					if (a==ternaWithZero || b== ternaWithZero)
						ternaWithZero = t;
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

	private static int exponenteSiPotenciaDe2(int n) {
		if (n <= 0) return -1;
		if ((n & (n - 1)) != 0) return -1; // No es potencia de 2

		int exponente = 0;
		while (n > 1) {
			n >>= 1; // Desplaza a la derecha dividiendo por 2
			exponente++;
		}
		return exponente;
	}
}
