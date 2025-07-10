package edu.uclm.tp3.common.services;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import edu.uclm.tp3.coders.Quirk2Qiskit;
import edu.uclm.tp3.common.deterministic.Coder;
import edu.uclm.tp3.common.deterministic.FreqTable;
import edu.uclm.tp3.common.deterministic.Pair;
import edu.uclm.tp3.common.deterministic.QCircuit;
import edu.uclm.tp3.common.deterministic.QCircuitGate;
import edu.uclm.tp3.common.deterministic.QColumn;
import edu.uclm.tp3.common.deterministic.QGate;

@Service
public class GroverService {

    public Map<String, Object> calculate(int qubits, FreqTable expectedFrequencies, boolean useMCX) throws Exception {
        double N = Math.pow(2, qubits);
        double M = expectedFrequencies.getPairs().size();
        int optimal = (int) Math.floor((Math.PI/4) * Math.sqrt(N/M));

        QCircuit quirkCircuit = this.getQCircuit(qubits, expectedFrequencies, useMCX, optimal);
        QCircuitGate initialH = QCircuit.getH(qubits);
        quirkCircuit.addGate(initialH);
        quirkCircuit.insertColumnWithCircuitGate(0, initialH);

        StringBuilder code = Quirk2Qiskit.getCode(quirkCircuit);

        StringBuilder sbCalculus = new StringBuilder("circuits[0].append(getCircuit(), range(qubits))\n");

        Map<String, Object> result = new HashMap<>();
        result.put("#QUBITS#", qubits);
		result.put("#OUTPUT_QUBITS#", qubits);
		result.put("#SHOTS#", "1000");
        result.put("#INITIALIZE#", code);
        result.put("#CIRCUITS_DECLARATION#", "QuantumCircuit(qubits, outputQubits)");	
        result.put("#ALGORITHM#", "Grover");
		result.put("#HADAMARDS#", "");
		result.put("#CALCULUS#", sbCalculus.toString());
		List<Map<String, Object>> partialCircuits = new ArrayList<>();
		partialCircuits.add(quirkCircuit.toJson().toMap());
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

    @SuppressWarnings("unchecked")
    public Map<String, Object> calculateSplitting(int qubits, FreqTable expectedFrequencies, boolean useMCX) throws Exception {
        int numberOfPairs = expectedFrequencies.getPairs().size();
        Map<String, Object> result = this.calculate(qubits, expectedFrequencies, useMCX);

        int optimal = (int) Math.floor(Math.PI/4*Math.sqrt(Math.pow(2, qubits)/1));
        Map<String, Object> partialCircuit = ((List<Map<String, Object>>) result.get("QUIRK")).get(0);
        List<Map<String, Object>> partialCircuits = GroverSplitter.split(partialCircuit, qubits, numberOfPairs, optimal);
		result.put("QUIRK", partialCircuits);
        result.put("#QUBITS#", qubits);
		result.put("#OUTPUT_QUBITS#", qubits);
		result.put("#SHOTS#", "1000");
        result.put("#ALGORITHM#", "Grover split");

        StringBuilder sbCalculus = new StringBuilder();
        StringBuilder circuitsDeclaration = new StringBuilder();
        for (int i=0; i<numberOfPairs; i++) {
            sbCalculus.append("for i in range(0, " + optimal + ") :\n");
            sbCalculus.append("\tcircuits[" + i + "].append(oracle_" + i + "(), [" + Coder.getTargetQubits(0, qubits) + "])\n");
            sbCalculus.append("\tcircuits[" + i + "].append(diffuser(), [" + Coder.getTargetQubits(0, qubits) + "])\n");
            circuitsDeclaration.append("QuantumCircuit(qubits, qubits), ");
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

    public Map<String, Object> calculateInParallel(int qubits, FreqTable expectedFrequencies, boolean useMCX) throws Exception {
        int numberOfPairs = expectedFrequencies.getPairs().size();
        int optimal = (int) Math.floor(Math.PI/4*Math.sqrt(Math.pow(2, qubits)/1));

        List<QCircuit> circuits = new ArrayList<>();
        for (Pair pair : expectedFrequencies.getPairs()) {
            FreqTable ft = new FreqTable();
            ft.addPair(pair);
            QCircuit pairCircuit = this.getQCircuit(qubits, ft, useMCX, optimal);
            circuits.add(pairCircuit);
        }

        QCircuit quirkGeneralCircuit = this.parallelize(circuits, qubits);
        QCircuitGate initialH = QCircuit.getH(qubits*circuits.size());
        quirkGeneralCircuit.addGate(initialH);
        quirkGeneralCircuit.insertColumnWithCircuitGate(0, initialH);

        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> circuit = new ArrayList<>();
        circuit.add(quirkGeneralCircuit.toJson().toMap());
		result.put("QUIRK", circuit);
        result.put("#QUBITS#", qubits*numberOfPairs);
		result.put("#OUTPUT_QUBITS#", qubits*numberOfPairs);
		result.put("#SHOTS#", "1000");
        result.put("#ALGORITHM#", "Grover parallel");

        StringBuilder sbCalculus = new StringBuilder();
        int startQubit = 0;
        for (int i=0; i<numberOfPairs; i++) {
            for (int j=0; j<optimal; j++) {
                sbCalculus.append("circuits[0].append(oracle_" + i + "(), [" + Coder.getTargetQubits(startQubit, startQubit+qubits) + "])\n");
                sbCalculus.append("circuits[0].append(diffuser(), [" + Coder.getTargetQubits(startQubit, startQubit+qubits) + "])\n");
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

    private QCircuit parallelize(List<QCircuit> circuits, int qubits) {
        int maxCols = 0;

        QCircuit quirkCircuit = new QCircuit();
        for (int i=0; i<circuits.size(); i++) {
            QCircuit circuit = circuits.get(i);
            if (circuit.getColumns().size() > maxCols) 
                maxCols = circuit.getColumns().size();
            for (int j=0; j<circuit.getGates().size(); j++) {
                QGate gate = circuit.getGates().get(j);
                if (gate.getName().equals("0")) 
                    gate.setName(gate.getName() + "_" + i);
                quirkCircuit.addGate(gate);
            }
        }

        for (int i=0; i<maxCols; i++) {
            List<QColumn> columns = this.getColumn(i, circuits);
            QColumn column = QColumn.merge(columns, qubits);
            quirkCircuit.addColumn(column);
        }

        return quirkCircuit;
    }

    private List<QColumn> getColumn(int index, List<QCircuit> circuits) {
        List<QColumn> columns = new ArrayList<>();
        for (int i=0; i<circuits.size(); i++) {
            QCircuit circuit = circuits.get(i);
            if (index < circuit.getColumns().size()) 
                columns.add(circuit.getColumns().get(index));
            else
                columns.add(null);
        }
        return columns;
    }

    @SuppressWarnings("unchecked")
    private QCircuit getQCircuit(int qubits, FreqTable expectedFrequencies, boolean useMCX, int optimal) {
        Object[] oraclesAnddiffuser = this.buildGrover(expectedFrequencies, qubits, useMCX);
        List<QCircuitGate> oracles = (List<QCircuitGate>) oraclesAnddiffuser[0];
        QCircuitGate diffuser = (QCircuitGate) oraclesAnddiffuser[1];
        
        QCircuit quirkCircuit = new QCircuit();

        for (int i=0; i<oracles.size(); i++) {
            QCircuitGate oracle = oracles.get(i);
            quirkCircuit.addGate(oracle);
        }
        quirkCircuit.addGate(diffuser);

        QCircuitGate zeroGate = new QCircuitGate();
        zeroGate.setName("0");
        
        for (int i=0; i<optimal; i++) {
            for (int j=0; j<oracles.size(); j++) {
                QCircuitGate oracle = oracles.get(j);
                zeroGate.addColumnWithCircuitGate(oracle);
            }
            zeroGate.addColumnWithCircuitGate(diffuser);
        }
        quirkCircuit.addGate(zeroGate);
        quirkCircuit.addColumnWithCircuitGate(zeroGate);
        return quirkCircuit;
    }

    private Object[] buildGrover(FreqTable expectedFrequencies, int qubits, boolean useMCX) {
        List<Pair> pairs = expectedFrequencies.getPairs();
        List<QCircuitGate> oracles = new ArrayList<>();
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
            QCircuitGate oracle = this.buildOracle(row, useMCX);
            oracle.setName("Oracle_" + index);
            oracles.add(oracle);
        }
        QCircuitGate diffuser = this.buildDifusser(qubits, useMCX);
        diffuser.setName("Diffuser");
        Object[] result = { oracles, diffuser };
        return result;
    }

    private QCircuitGate buildDifusser(int qubits, boolean useMCX) {
        QCircuitGate difusser = new QCircuitGate();
        if (useMCX) {
            QColumn h0 = new QColumn();
            QColumn x0 = new QColumn();
            QColumn oneH0 = new QColumn();
            QColumn mcXOrZ = new QColumn();
            QColumn oneH1 = new QColumn();
            QColumn x1 = new QColumn();
            QColumn h1 = new QColumn();
            for (int i=0; i<qubits; i++) {
                h0.addStdGate("H");
                x0.addStdGate("X");
                oneH0.addStdGate("1");
                mcXOrZ.addStdGate("•");
                oneH1.addStdGate("1");
                x1.addStdGate("X");
                h1.addStdGate("H");
            }
            oneH0.setStdGate(qubits-1, "H");
            mcXOrZ.setStdGate(qubits-1, "X");
            oneH1.setStdGate(qubits-1, "H");
            difusser.addColumns(h0, x0, oneH0, mcXOrZ, oneH1, x1, h1);
        } else {
            QColumn h0 = new QColumn();
            QColumn x0 = new QColumn();
            QColumn mcXOrZ = new QColumn();
            QColumn x1 = new QColumn();
            QColumn h1 = new QColumn();
            for (int i=0; i<qubits; i++) {
                h0.addStdGate("H");
                x0.addStdGate("X");
                mcXOrZ.addStdGate("•");
                x1.addStdGate("X");
                h1.addStdGate("H");
            }
            mcXOrZ.setStdGate(qubits-1, "Z");
            difusser.addColumns(h0, x0, mcXOrZ, x1, h1);
        }
        return difusser;
    }

    private QCircuitGate buildOracle(List<Integer> row, boolean useMCX) {
        QCircuitGate oracle = new QCircuitGate();
        QColumn encoding0 = this.encode(row);
        oracle.addColumn(encoding0);
        if (useMCX) {
            QColumn h0 = this.buildH(row);
            QColumn mcXOrZ = this.buildMCXOrMCH(row, "X");
            QColumn h1 = this.buildH(row);
            oracle.addColumns(h0, mcXOrZ, h1);
            
        } else {
            QColumn mcXOrZ = this.buildMCXOrMCH(row, "Z");
            oracle.addColumn(mcXOrZ);
        }
        QColumn encoding1 = this.encode(row);
        oracle.addColumn(encoding1);
        return oracle;
    }

    private QColumn encode(List<Integer> row) {
        QColumn column = new QColumn();
        for (int i=0; i<row.size(); i++) {
            Integer value = row.get(i);
            if (value==null || value==0)
                column.addStdGate("X");
            else 
                column.addStdGate("1");
        }
        return column;
    }

    private QColumn buildH(List<Integer> row) {
        QColumn column = new QColumn();
        for (int i=0; i<row.size(); i++)
            column.addStdGate("1");
        column.setStdGate(row.size()-1, "H");
        return column;
    }

    private QColumn buildMCXOrMCH(List<Integer> row, String gate) {
        QColumn column = new QColumn();
        for (int i=0; i<row.size(); i++)
            column.addStdGate("•");
        column.setStdGate(row.size()-1, gate);
        return column;
    }
}
