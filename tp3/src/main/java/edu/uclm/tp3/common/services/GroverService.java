package edu.uclm.tp3.common.services;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import edu.uclm.tp3.coders.Quirk2Qiskit;
import edu.uclm.tp3.common.deterministic.FreqTable;
import edu.uclm.tp3.common.deterministic.Pair;
import edu.uclm.tp3.common.deterministic.QCircuit;
import edu.uclm.tp3.common.deterministic.QCircuitGate;
import edu.uclm.tp3.common.deterministic.QColumn;
import edu.uclm.tp3.common.deterministic.QGate;
import edu.uclm.tp3.common.deterministic.QStdGate;

@Service
public class GroverService {

    public Map<String, Object> calculate(int qubits, FreqTable expectedFrequencies, boolean useMCX) throws Exception {
        double N = Math.pow(2, qubits);
        double M = expectedFrequencies.getPairs().size();
        int optimal = (int) Math.floor((Math.PI/4) * Math.sqrt(N/M));

        QCircuit quirkCircuit = this.buildCircuit(qubits, expectedFrequencies, useMCX, optimal);
        QCircuitGate initialH = QCircuit.getH(qubits, quirkCircuit);
        quirkCircuit.addGate(initialH);
        quirkCircuit.insertColumnWithGate(0, initialH);

        StringBuilder code = Quirk2Qiskit.getGatesDeclaration(quirkCircuit);

        Map<String, Object> result = new HashMap<>();
        result.put("#QUBITS#", qubits);
		result.put("#OUTPUT_QUBITS#", qubits);
		result.put("#SHOTS#", "1024");
        result.put("#INITIALIZE#", code);
        result.put("#CIRCUITS_DECLARATION#", "QuantumCircuit(qubits, outputQubits)");	
        result.put("#ALGORITHM#", "Grover");
		result.put("#HADAMARDS#", "");

        StringBuilder sbCalculus = new StringBuilder("circuits[0].append(getInitialH(), range(qubits))\n");
        sbCalculus.append("circuits[0].append(get0(), range(qubits))\n");
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
    
    public Map<String, Object> calculateSplitting(int qubits, FreqTable expectedFrequencies, boolean useMCX) throws Exception {
        int numberOfPairs = expectedFrequencies.getPairs().size();
        int optimal = (int) Math.floor(Math.PI/4*Math.sqrt(Math.pow(2, qubits)/1));

        List<QCircuit> circuits = buldCircuits(qubits, expectedFrequencies, useMCX, optimal);
        this.splitCircuits(circuits, expectedFrequencies);
        
        List<Map<String, Object>> partialCircuits = new ArrayList<>();
        for (QCircuit circuit : circuits) {
            QCircuitGate initialH = QCircuit.getH(qubits, circuit);
            circuit.addGate(initialH);
            circuit.insertColumnWithGate(0, initialH);
            partialCircuits.add(circuit.toJson().toMap());
        }

        Map<String, Object> result = new HashMap<>();
        result.put("#QUBITS#", qubits);
		result.put("#OUTPUT_QUBITS#", qubits);
		result.put("#SHOTS#", "1024");
        StringBuilder code = Quirk2Qiskit.getGatesDeclaration(circuits);
        result.put("#INITIALIZE#", code);

        StringBuilder sbCircuitsDeclaration = new StringBuilder();
        for (int i=0; i<numberOfPairs; i++) 
            sbCircuitsDeclaration.append("QuantumCircuit(qubits, qubits), ");
        
        result.put("#CIRCUITS_DECLARATION#", sbCircuitsDeclaration.toString());
        result.put("#ALGORITHM#", "Grover split");
        result.put("#HADAMARDS#", "");


        StringBuilder sbCalculus = new StringBuilder();
        for (int i=0; i<numberOfPairs; i++) {
            sbCalculus.append("circuits[" + i + "].append(getInitialH(), range(qubits))\n");
            sbCalculus.append("circuits[" + i + "].append(getCircuit" + i + "(), range(qubits))\n");
        }
        result.put("#CALCULUS#", sbCalculus.toString());
		result.put("QUIRK", partialCircuits);

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

    private void splitCircuits(List<QCircuit> circuits, FreqTable expectedFrequencies) {
        for (int i=0; i<expectedFrequencies.getPairs().size(); i++) {
            QCircuit circuit = circuits.get(i);
            for (int j=0; j<circuit.getGates().size(); j++) {
                QGate gate = circuit.getGates().get(j);
                if (gate.getName().equals("0")) {
                    gate.setName("Circuit" + i);
                    break;
                }
            }
        }
    }
    private List<QCircuit> buldCircuits(int qubits, FreqTable expectedFrequencies, boolean useMCX, int optimal) throws Exception {
        List<QCircuit> circuits = new ArrayList<>();
        for (Pair pair : expectedFrequencies.getPairs()) {
            FreqTable ft = new FreqTable();
            ft.addPair(pair);
            QCircuit pairCircuit = this.buildCircuit(qubits, ft, useMCX, optimal);
            circuits.add(pairCircuit);
        }
        return circuits;
    }

    public Map<String, Object> calculateInParallel(int qubits, FreqTable expectedFrequencies, boolean useMCX) throws Exception {
        int numberOfPairs = expectedFrequencies.getPairs().size();
        int optimal = (int) Math.floor(Math.PI/4*Math.sqrt(Math.pow(2, qubits)/1));

        List<QCircuit> circuits = buldCircuits(qubits, expectedFrequencies, useMCX, optimal);

        QCircuit parallelCircuit = this.parallelize(circuits, qubits);
        QCircuitGate initialH = QCircuit.getH(qubits*circuits.size(), parallelCircuit);
        parallelCircuit.addGate(initialH);
        parallelCircuit.insertColumnWithGate(0, initialH);

        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> circuit = new ArrayList<>();
        circuit.add(parallelCircuit.toJson().toMap());
        result.put("#QUBITS#", qubits*numberOfPairs);
		result.put("#OUTPUT_QUBITS#", qubits*numberOfPairs);
		result.put("#SHOTS#", "1024");
        StringBuilder code = Quirk2Qiskit.getGatesDeclaration(parallelCircuit); 

        result.put("#INITIALIZE#", code);
        result.put("#CIRCUITS_DECLARATION#", "QuantumCircuit(qubits, outputQubits)");
        result.put("#ALGORITHM#", "Grover parallel");
        result.put("#HADAMARDS#", "");
        StringBuilder sbCalculus = new StringBuilder("circuits[0].append(getInitialH(), range(qubits))\n");
        int rangeStart = 0;
        for (int i=0; i<numberOfPairs; i++) {
            sbCalculus.append("circuits[0].append(get0_" + i + "(), range(" + rangeStart + "," + (rangeStart + qubits) + "))\n");
            rangeStart += qubits;
        }
		result.put("#CALCULUS#", sbCalculus.toString());
		result.put("QUIRK", circuit);

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
        QCircuit quirkCircuit = new QCircuit();
        int maxCols = this.addGates(quirkCircuit, circuits);
        
        for (int i=0; i<maxCols; i++) {
            List<QColumn> columns = this.getColumn(i, circuits);
            QColumn column = QColumn.merge(columns, qubits, quirkCircuit);
            quirkCircuit.addColumn(column);
        }

        return quirkCircuit;
    }

    private int addGates(QCircuit quirkCircuit, List<QCircuit> circuits) {
        int maxCols = 0;
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
        return maxCols;
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

    private QCircuit buildCircuit(int qubits, FreqTable expectedFrequencies, boolean useMCX, int optimal) {
        QCircuit quirkCircuit = new QCircuit();

        List<QCircuitGate> oraclesAnddiffuser = this.buildGrover(expectedFrequencies, qubits, useMCX, quirkCircuit);
        QCircuitGate diffuser = oraclesAnddiffuser.remove(oraclesAnddiffuser.size() - 1);
        List<QCircuitGate> oracles = oraclesAnddiffuser;
        
        for (int i=0; i<oracles.size(); i++) {
            QCircuitGate oracle = oracles.get(i);
            quirkCircuit.addGate(oracle);
        }
        quirkCircuit.addGate(diffuser);

        QCircuitGate zeroGate = new QCircuitGate(quirkCircuit);
        zeroGate.setName("0");
        zeroGate.setQubits(qubits);
        
        for (int i=0; i<optimal; i++) {
            for (int j=0; j<oracles.size(); j++) {
                QCircuitGate oracle = oracles.get(j);
                zeroGate.addColumn(oracle);
            }
            zeroGate.addColumn(diffuser);
        }
        quirkCircuit.addGate(zeroGate);
        quirkCircuit.addColumn(zeroGate);
        quirkCircuit.setQubits(qubits);
        return quirkCircuit;
    }

    private List<QCircuitGate> buildGrover(FreqTable expectedFrequencies, int qubits, boolean useMCX, QCircuit quirkCircuit) {
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
            QCircuitGate oracle = this.buildOracle(row, useMCX, quirkCircuit);
            oracle.setName("Oracle_" + index);
            oracles.add(oracle);
        }
        QCircuitGate diffuser = this.buildDifusser(qubits, useMCX, quirkCircuit);
        diffuser.setName("Diffuser");
        oracles.add(diffuser);
        return oracles;
    }

    private QCircuitGate buildDifusser(int qubits, boolean useMCX, QCircuit quirkCircuit) {
        QCircuitGate difusser = new QCircuitGate(quirkCircuit);
        if (useMCX) {
            QColumn h0 = new QColumn();
            QColumn x0 = new QColumn();
            QColumn oneH0 = new QColumn();
            QColumn mcXOrZ = new QColumn();
            QColumn oneH1 = new QColumn();
            QColumn x1 = new QColumn();
            QColumn h1 = new QColumn();
            for (int i=0; i<qubits; i++) {
                h0.addGate(new QStdGate("H", quirkCircuit));
                x0.addGate(new QStdGate("X", quirkCircuit));
                oneH0.addGate(new QStdGate("1", quirkCircuit));
                mcXOrZ.addGate(new QStdGate("•", quirkCircuit));
                oneH1.addGate(new QStdGate("1", quirkCircuit));
                x1.addGate(new QStdGate("X", quirkCircuit));
                h1.addGate(new QStdGate("H", quirkCircuit));
            }
            oneH0.setGate(qubits-1, new QStdGate("H", quirkCircuit));
            mcXOrZ.setGate(qubits-1, new QStdGate("X", quirkCircuit));
            oneH1.setGate(qubits-1, new QStdGate("H", quirkCircuit));
            difusser.addColumns(h0, x0, oneH0, mcXOrZ, oneH1, x1, h1);
        } else {
            QColumn h0 = new QColumn();
            QColumn x0 = new QColumn();
            QColumn mcXOrZ = new QColumn();
            QColumn x1 = new QColumn();
            QColumn h1 = new QColumn();
            for (int i=0; i<qubits; i++) {
                h0.addGate(new QStdGate("H", quirkCircuit));
                x0.addGate(new QStdGate("X", quirkCircuit));
                mcXOrZ.addGate(new QStdGate("•", quirkCircuit));
                x1.addGate(new QStdGate("X", quirkCircuit));
                h1.addGate(new QStdGate("H", quirkCircuit));
            }
            mcXOrZ.setGate(qubits-1, new QStdGate("Z", quirkCircuit));
            difusser.addColumns(h0, x0, mcXOrZ, x1, h1);
        }
        difusser.setQubits(qubits);
        return difusser;
    }

    private QCircuitGate buildOracle(List<Integer> row, boolean useMCX, QCircuit quirkCircuit) {
        QCircuitGate oracle = new QCircuitGate(quirkCircuit);
        QColumn encoding0 = this.encode(row, quirkCircuit);
        oracle.addColumn(encoding0);
        if (useMCX) {
            QColumn h0 = this.buildH(row, quirkCircuit);
            QColumn mcXOrZ = this.buildMCXOrMCH(row, new QStdGate("X", quirkCircuit), quirkCircuit);
            QColumn h1 = this.buildH(row, quirkCircuit);
            oracle.addColumns(h0, mcXOrZ, h1);
            
        } else {
            QColumn mcXOrZ = this.buildMCXOrMCH(row, new QStdGate("Z", quirkCircuit), quirkCircuit);
            oracle.addColumn(mcXOrZ);
        }
        QColumn encoding1 = this.encode(row, quirkCircuit);
        oracle.addColumn(encoding1);
        oracle.setQubits(encoding1.size());
        return oracle;
    }

    private QColumn encode(List<Integer> row, QCircuit quirkCircuit) {
        QColumn column = new QColumn();
        for (int i=0; i<row.size(); i++) {
            Integer value = row.get(i);
            if (value==null || value==0)
                column.addGate(new QStdGate("X", quirkCircuit));
            else 
                column.addGate(new QStdGate("1", quirkCircuit));
        }
        return column;
    }

    private QColumn buildH(List<Integer> row, QCircuit quirkCircuit) {
        QColumn column = new QColumn();
        for (int i=0; i<row.size(); i++)
            column.addGate(new QStdGate("1", quirkCircuit));
        column.setGate(row.size()-1, new QStdGate("H", quirkCircuit));
        return column;
    }

    private QColumn buildMCXOrMCH(List<Integer> row, QStdGate gate, QCircuit quirkCircuit) {
        QColumn column = new QColumn();
        for (int i=0; i<row.size()-1; i++)
            column.addGate(new QStdGate("•", quirkCircuit));
        column.appendGate(gate, quirkCircuit);
        return column;
    }
}
