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

    @SuppressWarnings("unchecked")
    public Map<String, Object> calculateSplitting(int qubits, FreqTable expectedFrequencies) {
        int shots = 1000;

        int numberOfPairs = expectedFrequencies.getPairs().size();
        Map<String, Object> result = this.calculate(qubits, expectedFrequencies);

        int optimal = (int) Math.floor(Math.PI/4*Math.sqrt(Math.pow(2, qubits)/1));
        Map<String, Object> partialCircuit = ((List<Map<String, Object>>) result.get("QUIRK")).get(0);
        List<Map<String, Object>> partialCircuits = GroverSplitter.split(partialCircuit, qubits, numberOfPairs, optimal);
		result.put("QUIRK", partialCircuits);
        result.put("#QUBITS#", qubits*numberOfPairs);
		result.put("#OUTPUT_QUBITS#", qubits*numberOfPairs);
		result.put("#SHOTS#", shots);

        StringBuilder sbCalculus = new StringBuilder();
        int startQubit = 0;
        StringBuilder circuitsDeclaration = new StringBuilder();
        for (int i=0; i<numberOfPairs; i++) {
            for (int j=0; j<optimal; j++) {
                sbCalculus.append("circuits[" + i + "].append(oracle_" + i + "(), [" + Coder.getTargetQubits(startQubit, startQubit+qubits) + "])\n");
                sbCalculus.append("circuits[" + i + "].append(difussor(), [" + Coder.getTargetQubits(startQubit, startQubit+qubits) + "])\n");
            }
            circuitsDeclaration.append("QuantumCircuit(qubits, qubits), ");
            startQubit = startQubit + qubits;
        }
		result.put("#CALCULUS#", sbCalculus.toString());
        result.put("#CIRCUITS_DECLARATION#", circuitsDeclaration);	

        StringBuilder sbExpected = new StringBuilder("expected = [");
        double expectedFreq = 1.0/expectedFrequencies.getPairs().size();
		for (int i=0; i<numberOfPairs; i++) {
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
    public Map<String, Object> calculateInParallel(int qubits, FreqTable expectedFrequencies) {
        int shots = 1000;

        int numberOfPairs = expectedFrequencies.getPairs().size();
        Map<String, Object> result = this.calculate(qubits, expectedFrequencies);

        int optimal = (int) Math.floor(Math.PI/4*Math.sqrt(Math.pow(2, qubits)/1));
        Map<String, Object> partialCircuit = ((List<Map<String, Object>>) result.get("QUIRK")).get(0);
        partialCircuit = this.parallelize(partialCircuit, qubits, numberOfPairs, optimal);
        List<Map<String, Object>> partialCircuits = new ArrayList<>();
        partialCircuits.add(partialCircuit);
		result.put("QUIRK", partialCircuits);
        result.put("#QUBITS#", qubits*numberOfPairs);
		result.put("#OUTPUT_QUBITS#", qubits*numberOfPairs);
		result.put("#SHOTS#", shots);

        StringBuilder sbCalculus = new StringBuilder();
        int startQubit = 0;
        for (int i=0; i<numberOfPairs; i++) {
            for (int j=0; j<optimal; j++) {
                sbCalculus.append("circuits[0].append(oracle_" + i + "(), [" + Coder.getTargetQubits(startQubit, startQubit+qubits) + "])\n");
                sbCalculus.append("circuits[0].append(difussor(), [" + Coder.getTargetQubits(startQubit, startQubit+qubits) + "])\n");
            }
            startQubit = startQubit + qubits;
        }
		result.put("#CALCULUS#", sbCalculus.toString());

        StringBuilder sbExpected = new StringBuilder("expected = [");
        double expectedFreq = 1.0/expectedFrequencies.getPairs().size();
		for (int i=0; i<numberOfPairs; i++) {
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

    private Map<String, Object> parallelize(Map<String, Object> partialCircuit, int qubits, int numberOfPairs, int optimal) {
        JSONObject jsoCircuit = new JSONObject(partialCircuit);
        JSONArray jsaCols = new JSONArray();        
        JSONArray jsaColH = new JSONArray();

        int targetQubits = qubits * numberOfPairs;
        for (int i=0; i<targetQubits; i++)
            jsaColH.put("H");
        jsaCols.put(jsaColH);

        JSONArray jsaGates = jsoCircuit.getJSONArray("gates");
        JSONArray jsaOracles = new JSONArray();
        for (int i=0; i<jsaGates.length(); i++) {
            String gateId = jsaGates.getJSONObject(i).getString("id");
            if (gateId.startsWith("~oracle"))
                jsaOracles.put(gateId);
        }

        for (int i=0; i<optimal; i++) {
            JSONArray jsaCol = new JSONArray();
            JSONArray jsaDifussor = new JSONArray();
            for (int j=0; j<jsaOracles.length(); j++) {
                String oracleId = jsaOracles.getString(j);
                this.put(jsaCol, oracleId, qubits*j);
                this.put(jsaDifussor, "~difussor", qubits*j);
            }
            jsaCols.put(jsaCol);
            jsaCols.put(jsaDifussor);
        }
        jsoCircuit.put("cols", jsaCols);
        return jsoCircuit.toMap();
    }

    private void put(JSONArray jsaCol, String oracleId, int startQubit) {
        for (int i=1; i<startQubit; i++)
            jsaCol.put(1);
        jsaCol.put(oracleId);
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
            String oracleName = "oracle_" + i;

            code.append("def " + oracleName + "() :\t # Looks for " + expectedFrequencies.getPairs().get(i).getIndex() +"\n");
            code.append("\tU = QuantumCircuit(" + qubits + ")\n");
            QGroverOracle oracle = groverOracles.get(i);
            code.append(this.coder.getCode(oracle));
            code.append("\treturn U\n");
            QCircuit oracleCircuit = oracle.toCircuit();
            oracleCircuit.setName(oracleName);
            quirkCircuit.addGate(oracleCircuit);
        }

        QCircuit difussorGate = difussor.toCircuit();
        difussorGate.setName("difussor");
        quirkCircuit.addGate(difussorGate);

        int optimal = (int) Math.floor(Math.PI/4*Math.sqrt(Math.pow(2, qubits)/expectedFrequencies.getPairs().size()));

        JSONObject jsoCircuit = this.prepareCircuit(quirkCircuit, qubits, groverOracles.size(), optimal);

        code.append("def difussor() :\n");
        code.append("\tU = QuantumCircuit(" + qubits + ")\n");
        code.append(this.coder.getCode(difussor));
        code.append("\treturn U\n");

        StringBuilder sbCalculus = new StringBuilder();
        for (int i=0; i<optimal; i++) {
            for (int j=0; j<groverOracles.size(); j++)
                sbCalculus.append("circuits[0].append(oracle_" + j + "(), [" + Coder.getTargetQubits(0, qubits) + "])\n");
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
