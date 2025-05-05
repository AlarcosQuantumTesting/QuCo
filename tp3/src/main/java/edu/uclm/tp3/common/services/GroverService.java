package edu.uclm.tp3.common.services;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import edu.uclm.tp3.common.deterministic.Coder;
import edu.uclm.tp3.common.deterministic.FreqTable;
import edu.uclm.tp3.common.deterministic.Pair;
import edu.uclm.tp3.common.deterministic.QCircuit;
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
            //QCircuit circuit = this.buildGrover(expectedFrequencies, qubits);
            //partialCircuits.add(circuit);
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

    @SuppressWarnings("unchecked")
    public Map<String, Object> calculate(int qubits, FreqTable expectedFrequencies) {
        int shots = 1000;

        Object[] oraclesAndDifussor = this.buildGrover(expectedFrequencies, qubits);
        List<QGroverOracle> groverOracles = (List<QGroverOracle>) oraclesAndDifussor[0];
        QGroverDifussor difussor = (QGroverDifussor) oraclesAndDifussor[1];
        
        QCircuit quirkCircuit = new QCircuit();
        StringBuilder code = new StringBuilder();
        for (int i=0; i<groverOracles.size(); i++) {
            code.append("def oracle_" + i + "() :\t # Looks for " + expectedFrequencies.getPairs().get(i).getIndex() +"\n");
            code.append("\tU = QuantumCircuit(" + qubits + ")\n");
            QGroverOracle oracle = groverOracles.get(i);
            code.append(this.coder.getCode(oracle));
            code.append("\treturn U\n");
            QCircuit oracleCircuit = oracle.toCircuit();
            oracleCircuit.setName("oracle_" + i);
            quirkCircuit.addGate(oracleCircuit);
        }

        QCircuit difussorGate = difussor.toCircuit();
        difussorGate.setName("difussor");
        quirkCircuit.addGate(difussorGate);

        int optimal = (int) Math.round(Math.PI/4*Math.sqrt(Math.pow(2, qubits)/expectedFrequencies.getPairs().size()));

        JSONObject jsoCircuit = this.prepareCircuit(quirkCircuit, qubits, groverOracles.size(), optimal);

        code.append("def difussor() :\n");
        code.append("\tU = QuantumCircuit(" + qubits + ")\n");
        code.append(this.coder.getCode(difussor));
        code.append("\treturn U\n");

        StringBuilder sbCalculus = new StringBuilder();
        for (int i=0; i<optimal; i++) {
            for (int j=0; j<groverOracles.size(); j++) {
                sbCalculus.append("circuits[0].append(oracle_" + j + "(), [" + Coder.getTargetQubits(0, qubits) + "])\n");
            }
            sbCalculus.append("circuits[0].append(difussor(), [" + Coder.getTargetQubits(0, qubits) + "])\n");
        }

        Map<String, Object> result = new HashMap<>();
        result.put("#QUBITS#", qubits);
		result.put("#OUTPUT_QUBITS#", qubits);
		result.put("#SHOTS#", shots);
        result.put("#INITIALIZE#", code);
        result.put("#CIRCUITS_DECLARATION#", "QuantumCircuit(qubits, qubits),");	

		result.put("#HADAMARDS#", "");
		result.put("#CALCULUS#", sbCalculus.toString());
		List<Map<String, Object>> partialCircuits = new ArrayList<>();
		partialCircuits.add(jsoCircuit.toMap());
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

	private JSONObject prepareCircuit(QCircuit quirkCircuit, int qubits, int oracles, int optimal) {
        JSONObject jsoCircuit = quirkCircuit.toJson();
        jsoCircuit.remove("circuit");
        JSONArray jsaCols = new JSONArray();
        JSONArray jsaH = new JSONArray();
        for (int i=0; i<qubits; i++) {
            jsaH.put("H");
        }
        jsaCols.put(jsaH);
        
        for (int i=0; i<optimal; i++) {
            for (int j=0; j<oracles; j++) {
                JSONArray jsaOracle = new JSONArray();
                jsaOracle.put("~oracle_" + j);
                jsaCols.put(jsaOracle);
            }
            JSONArray jsaDifussor = new JSONArray();
            jsaDifussor.put("~difussor");
            jsaCols.put(jsaDifussor);
        }
        jsoCircuit.put("cols", jsaCols);

        return jsoCircuit;
    }

    private Object[] buildGrover(FreqTable expectedFrequencies, int qubits) {
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
        int optimal = this.getOptimal(sRows, qubits);
        System.out.println(optimal);
        return buildGrover(sRows, false);
    }

    private Object[] buildGrover(List<List<Integer>> sRows, Boolean useMCX) {
        int qubits = sRows.get(0).size();

        List<QGroverOracle> groverOracles = new ArrayList<>();
        for (int i = 0; i < sRows.size(); i++) {
            QGroverOracle oracle = new QGroverOracle(sRows.get(i));
            groverOracles.add(oracle);
        }

        QGroverDifussor difussor = new QGroverDifussor(qubits);

        Object[] result = { groverOracles, difussor };
        return result;
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
