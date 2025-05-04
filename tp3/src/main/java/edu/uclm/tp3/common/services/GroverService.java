package edu.uclm.tp3.common.services;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import edu.uclm.tp3.common.deterministic.FreqTable;
import edu.uclm.tp3.common.deterministic.Pair;
import edu.uclm.tp3.common.deterministic.QCircuit;
import edu.uclm.tp3.common.deterministic.QColumn;
import edu.uclm.tp3.common.deterministic.QGroverDifussor;
import edu.uclm.tp3.common.deterministic.QGroverOracle;
import edu.uclm.tp3.qiskit.NewGroverCoder;

@Service
public class GroverService {

    @Autowired
    private NewGroverCoder coder;

    public Map<String, Object> calculateInParallel(int qubits, FreqTable expectedFrequencies) {
        int shots = 1000;

        int numberOfPairs = expectedFrequencies.getPairs().size();
        List<QCircuit> partialCircuits = new ArrayList<>();
        for (int i=0; i<numberOfPairs; i++) {
            QCircuit circuit = this.buildGrover(expectedFrequencies, qubits);
            partialCircuits.add(circuit);
        }

        QCircuit generalCircuit = this.groupCircuits(partialCircuits, qubits);
        String code = this.coder.getCode(generalCircuit, qubits);

        Map<String, Object> result = new HashMap<>();
		result.put("QUIRK", generalCircuit.toJson().toMap());
        result.put("#QUBITS#", qubits*numberOfPairs);
		result.put("#OUTPUT_QUBITS#", qubits*numberOfPairs);
		result.put("#SHOTS#", shots);
        result.put("#INITIALIZE#", code);
		result.put("#HADAMARDS#", "");
		result.put("#CALCULUS#", "");

        StringBuilder sbExpected = new StringBuilder("expected = [");
        double expectedFreq = 1.0/expectedFrequencies.getPairs().size();
		for (int i=0; i<expectedFrequencies.getPairs().size(); i++) {
			Pair pair = expectedFrequencies.getPairs().get(i);
			int index = pair.getIndex();
			sbExpected.append("(" + index + ", " + expectedFreq + "),");
			if (i>0 && i%10==0)
				sbExpected.append("\n");
		}
		sbExpected.append("]");
		result.put("#EXPECTED#", sbExpected.toString());
        return result;
    }

    public Map<String, Object> calculate(int qubits, FreqTable expectedFrequencies) {
        int shots = 1000;
        QCircuit circuit = buildGrover(expectedFrequencies, qubits);
        String code = this.coder.getCode(circuit, qubits);

        Map<String, Object> result = new HashMap<>();
        result.put("#QUBITS#", qubits);
		result.put("#OUTPUT_QUBITS#", qubits);
		result.put("#SHOTS#", shots);
        result.put("#INITIALIZE#", code);

		result.put("#HADAMARDS#", "");
		result.put("#CALCULUS#", "");
		List<Map<String, Object>> partialCircuits = new ArrayList<>();
		partialCircuits.add(circuit.toJson().toMap());
		result.put("QUIRK", partialCircuits);
        StringBuilder sbExpected = new StringBuilder("expected = [");
        double expectedFreq = 1.0/expectedFrequencies.getPairs().size();
		for (int i=0; i<expectedFrequencies.getPairs().size(); i++) {
			Pair pair = expectedFrequencies.getPairs().get(i);
			int index = pair.getIndex();
			sbExpected.append("(" + index + ", " + expectedFreq + "),");
			if (i>0 && i%10==0)
				sbExpected.append("\n");
		}
		sbExpected.append("]");
		result.put("#EXPECTED#", sbExpected.toString());
        return result;
    }

	private QCircuit buildGrover(FreqTable expectedFrequencies, int qubits) {
        List<Pair> pairs = expectedFrequencies.getPairs();
        List<List<Integer>> sRows = new ArrayList<>();
        for (Pair pair : pairs) {
            List<Integer> row = new ArrayList<>();
            int index = pair.getIndex();
            String binary = Integer.toBinaryString(index);
            while (binary.length() < qubits) {
                binary = "0" + binary;
            }
            for (int i = 0; i < binary.length(); i++) {
                if (binary.charAt(i) == '1') {
                    row.add(1);
                } else {
                    row.add(0);
                }
            }
            sRows.add(row);
        }
        return buildGrover(sRows, false);
    }

    private QCircuit buildGrover(List<List<Integer>> sRows, Boolean useMCX) {
        int qubits = sRows.get(0).size();

        List<QGroverOracle> groverOracles = new ArrayList<>();
        for (int i = 0; i < sRows.size(); i++) {
            QGroverOracle oracle = new QGroverOracle(sRows.get(i));
            groverOracles.add(oracle);
        }

        QGroverDifussor difussor = new QGroverDifussor(qubits);

        int nOptimal = getOptimal(sRows, qubits);
        return buildGroverCircuit(qubits, groverOracles, difussor, nOptimal);
    }

    private QCircuit buildGroverCircuit(int qubits, List<QGroverOracle> groverOracles, QGroverDifussor difussor, int nOptimal) {
        QCircuit circuit = new QCircuit();
        QColumn column0 = new QColumn();
        QColumn barrier = new QColumn();
        for (int i = 0; i < qubits; i++) {
            column0.addGate("H");
            barrier.addGate("…");
        }

        circuit.addColumn(column0);
        circuit.addColumn(barrier);

        List<QColumn> oracleColumns = new ArrayList<>();
        for (int i = 0; i < groverOracles.size(); i++)
            oracleColumns.addAll(groverOracles.get(i).getColumns());

        List<QColumn> difussorColumns = new ArrayList<>();
        difussorColumns.addAll(difussor.getColumns());

        for (int i = 0; i < nOptimal; i++) {
            circuit.addColumns(oracleColumns);
            circuit.addColumns(difussorColumns);
        }
        return circuit;
    }

    private int getOptimal(List<List<Integer>> sRows, int qubits) {
        double N = Math.pow(2, qubits);
        double M = sRows.size();
        if (M >= N / 2) {
            for (int i = 0; i < M; i++)
                sRows.get(i).add(0);
            qubits++;
        }
        int nOptimal = (int) Math.floor(Math.PI / 4 * Math.sqrt(N / M));
        return nOptimal;
    }

    private QCircuit groupCircuits(List<QCircuit> generalCircuits, int qubits) {
		QCircuit result = new QCircuit();
        int start = 0;
        for (int i=0; i<generalCircuits.size(); i++) {
            QCircuit circuit = generalCircuits.get(i);
            result.add(circuit, start);
            start = start + qubits;
        }
        return result;
	}
}
