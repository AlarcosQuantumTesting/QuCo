package edu.uclm.tp3.common.deterministic;

import java.util.ArrayList;
import java.util.List;

public class QGroverer {

    public static QCircuit buildGrover(FreqTable expectedFrequencies, int qubits, List<Double> expected) {
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
        return buildGrover(sRows, false, false, expected);
    }

    public static QCircuit buildGrover(List<List<Integer>> sRows, Boolean useMCX, boolean inParallel, List<Double> expected) {
        int qubits = sRows.get(0).size();

        double expectedElementProbability = 1.0/sRows.size();

        List<QGroverOracle> groverOracles = new ArrayList<>();
        for (int i = 0; i < sRows.size(); i++) {
            int index = toDecimal(sRows.get(i));
            expected.add(1.0*index);
            expected.add(expectedElementProbability);
            QGroverOracle oracle = new QGroverOracle(sRows.get(i));
            groverOracles.add(oracle);
        }

        QGroverDiffuser difussor = new QGroverDiffuser(qubits);

        if (!inParallel) {
            int nOptimal = getOptimal(sRows, qubits);
            return buildGroverCircuit(qubits, groverOracles, difussor, nOptimal);
        } else { 
            int nOptimal = (int) Math.floor(Math.PI / 4 * Math.sqrt(Math.pow(2, qubits)));
            return buildGroverCircuitIParallel(qubits, sRows.size(), groverOracles, difussor, nOptimal);
        }
    }

    private static int toDecimal(List<Integer> row) {
        int decimal = 0;
        for (int i = 0; i < row.size(); i++) {
            decimal += row.get(i) * Math.pow(2, row.size() - 1 - i);
        }
        return decimal;
    }

    private static QCircuit buildGroverCircuitIParallel(int qubits, int values, List<QGroverOracle> groverOracles, QGroverDiffuser difussor, int nOptimal) {
        List<QCircuit> circuits = new ArrayList<>();

        int ones = 0;
        QCircuit resultCircuit = new QCircuit();
        QColumn column0 = new QColumn();
        QColumn barrier = new QColumn();
        for (int i = 0; i < qubits*values; i++) { 
            column0.addGate("H");
            barrier.addGate("…");
        }                
        resultCircuit.addColumn(column0);
        resultCircuit.addColumn(barrier);

        for (int i = 0; i < values; i++) {
            QCircuit circuit = new QCircuit();
            List<QColumn> oracleColumns = groverOracles.get(i).getColumns();
            for (int j=0; j<oracleColumns.size(); j++) {
                QColumn oracleColumn = oracleColumns.get(j);
                QColumn column = new QColumn();
                for (int k = 0; k < ones; k++)
                    column.addGate("1");
                for (int k=0; k<qubits; k++)
                    column.addGate("" + oracleColumn.getGates().get(k));
                circuit.addColumn(column);
            }

            circuit.addColumn(barrier);

            List<QColumn> difussorColumns = difussor.getColumns();
            for (int j=0; j<difussorColumns.size(); j++) {
                QColumn difussorColumn = difussorColumns.get(j);
                QColumn column = new QColumn();
                for (int k = 0; k < ones; k++)
                    column.addGate("1");
                for (int k=0; k<qubits; k++)
                    column.addGate("" + difussorColumn.getGates().get(k));
                circuit.addColumn(column);
            }
            circuit.addColumn(barrier);

            circuits.add(circuit);
            ones = ones + qubits;
        }

        for (int i=0; i<circuits.size(); i++) {
            QCircuit c = circuits.get(i);
            for (int j=0; j<nOptimal; j++)
                resultCircuit.addColumns(c.getColumns());
        }

        return resultCircuit;
    }

    private static QCircuit buildGroverCircuit(int qubits, List<QGroverOracle> groverOracles, QGroverDiffuser difussor, int nOptimal) {
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

    private static int getOptimal(List<List<Integer>> sRows, int qubits) {
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

}
