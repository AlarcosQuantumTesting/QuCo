package edu.uclm.tp3.common.services;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import edu.uclm.tp3.coders.Quirk2Qiskit;
import edu.uclm.tp3.common.deterministic.FreqTable;
import edu.uclm.tp3.common.deterministic.Pair;
import edu.uclm.tp3.common.deterministic.QCircuit;
import edu.uclm.tp3.common.deterministic.QCircuitGate;
import edu.uclm.tp3.common.deterministic.QColumn;
import edu.uclm.tp3.common.deterministic.QGate;
import edu.uclm.tp3.common.deterministic.QStdGate;
import edu.uclm.tp3.dao.TemplateDao;

@Service
public class GroverService {

    private static final String SHOTS = "1024";
    private static final String BASE_GATE_NAME = "0";
    private static final String DIFFUSER_NAME = "Diffuser";
    private static final String ORACLE_PREFIX = "Oracle_";
    private static final String CIRCUIT_PREFIX = "Circuit";

    public Map<String, Object> calculate(int qubits, FreqTable expectedFrequencies, boolean useMCX, String templateCode) throws Exception {
        int optimalIterations = calculateOptimalIterations(qubits, expectedFrequencies.getPairs().size());

        QCircuit circuit = buildCircuit(qubits, expectedFrequencies, useMCX, optimalIterations);
        addInitialHadamard(circuit, qubits);

        String expected = buildExpected(expectedFrequencies);
        String initialize = Quirk2Qiskit.getGatesDeclaration(circuit).toString();
        String calculus = buildSingleCircuitCalculus();

        String code = this.replaceTokens(templateCode,
            "#QUBITS#", qubits, 
            "#OUTPUT_QUBITS#", qubits, 
            "#ORIGINAL_QUBITS#", qubits, 
            "#SPLIT#", "False", 
            "#SHOTS#", 1024, 
            "#EXPECTED#", expected,
            "#CIRCUITS_DECLARATION#", "QuantumCircuit(qubits, outputQubits)",
            "#ALGORITHM#", "Grover",
            "#INITIALIZE#", initialize,
            "#CALCULUS#", calculus
        );

        Map<String, Object> result = new HashMap<>();
        result.put("QUIRK", toSingleQuirkList(circuit));
        result.put("CODE", code);
        return result;
    }

    private String replaceTokens(String templateCode, Object... kkvv) {
        for (int i=0; i<kkvv.length; i++)
            templateCode = templateCode.replace(kkvv[i].toString(), kkvv[++i].toString());
        return templateCode;
    }

    public Map<String, Object> calculateSteaking(int qubits, FreqTable expectedFrequencies, boolean useMCX, String templateCode) throws Exception {
        int optimalIterations = calculateOptimalIterations(qubits, expectedFrequencies.getPairs().size());

        QCircuit circuit = buildCircuit(qubits, expectedFrequencies, useMCX, optimalIterations);
        addInitialHadamard(circuit, qubits);

        String expected = buildExpected(expectedFrequencies);
        List<StringBuilder> sbFunctions = Quirk2Qiskit.getGatesDeclarations(circuit, "0");
        StringBuilder functions = new StringBuilder();
        for (StringBuilder sb : sbFunctions)
            functions.append(sb);

        templateCode = templateCode.replace("#QUBITS#", "" + qubits)
            .replace("#OUTPUT_QUBITS#", "" + qubits)
            .replace("#ORIGINAL_QUBITS#", "" + qubits)
            .replace("#EXPECTED#", expected)
            .replace("#SHOTS#", "1024")
            .replace("#INITIALIZE#", functions.toString());

        StringBuilder steaks = new StringBuilder();
        for (int i=0; i<circuit.getGates().size(); i++) {
            QGate gate = circuit.getGates().get(i);
            if (gate.getName().equals(BASE_GATE_NAME) || gate.getName().equals(DIFFUSER_NAME) || gate.getName().equals("InitialH"))
                continue;
            steaks.append("circuit.append(get" + gate.getName() + "(), range(0, qubits))\n");
        }
        steaks.append("circuit.append(getDiffuser(), range(0, qubits))\n");
        steaks.append("for i in range(startQubit, qubits):\n");
        steaks.append("\tcircuit.measure(i, qubits - i - 1)\n");
        steaks.append("thetas, degrees, counts = run(circuit, backend)\n\n");

        steaks.append("for steak in range(1, " + optimalIterations + ") :\n");
        steaks.append("\tcircuit = QuantumCircuit(qubits, outputQubits)\n");
        steaks.append("\tadd_thetas(circuit, thetas)\n");
        for (int i=0; i<circuit.getGates().size(); i++) {
            QGate gate = circuit.getGates().get(i);
            if (gate.getName().equals(BASE_GATE_NAME) || gate.getName().equals(DIFFUSER_NAME) || gate.getName().equals("InitialH"))
                continue;
            steaks.append("\tcircuit.append(get" + gate.getName() + "(), range(0, qubits))\n");
        }
        steaks.append("\tcircuit.append(getDiffuser(), range(0, qubits))\n");
        steaks.append("\tfor i in range(startQubit, qubits):\n");
        steaks.append("\t\tcircuit.measure(i, qubits - i - 1)\n");
        steaks.append("\tthetas, degrees, counts = run(circuit, backend)\n");
        
        templateCode = templateCode.replace("#STEAKS#", steaks);
        System.out.println(templateCode);

        Map<String, Object> result = new HashMap<>();

        result.put("CODE", templateCode);
        result.put("QUIRK", toSingleQuirkList(circuit));

        return result;
    }

    public Map<String, Object> calculateSplitting(int qubits, FreqTable expectedFrequencies, boolean useMCX, String templateCode) throws Exception {
        int numberOfPairs = expectedFrequencies.getPairs().size();
        int optimalIterations = calculateOptimalIterationsForSingleTarget(qubits);

        List<QCircuit> circuits = buildCircuits(qubits, expectedFrequencies, useMCX, optimalIterations);
        splitCircuits(circuits, expectedFrequencies);

        List<Map<String, Object>> partialCircuits = new ArrayList<>();
        for (QCircuit circuit : circuits) {
            addInitialHadamard(circuit, qubits);
            partialCircuits.add(circuit.toJson().toMap());
        }

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

        String initialize = Quirk2Qiskit.getGatesDeclaration(circuits).toString();
        String calculus = buildSplitCalculus(numberOfPairs);
        StringBuilder sbCircuitsDeclaration = new StringBuilder();
        for (int i=0; i<numberOfPairs; i++) 
            sbCircuitsDeclaration.append("QuantumCircuit(qubits, qubits), ");

        String code = this.replaceTokens(templateCode,
            "#QUBITS#", qubits, 
            "#OUTPUT_QUBITS#", qubits, 
            "#ORIGINAL_QUBITS#", qubits, 
            "#SPLIT#", "True", 
            "#SHOTS#", 1024, 
            "#EXPECTED#", sbExpected.toString(),
            "#CIRCUITS_DECLARATION#", sbCircuitsDeclaration.toString(),
            "#ALGORITHM#", "Grover",
            "#INITIALIZE#", initialize,
            "#CALCULUS#", calculus
        );

        Map<String, Object> result = new HashMap<>();
        result.put("QUIRK", partialCircuits);
        result.put("CODE", code);
        return result;
    }

    public Map<String, Object> calculateInParallel(int qubits, FreqTable expectedFrequencies, boolean useMCX, String templateCode) throws Exception {
        int numberOfPairs = expectedFrequencies.getPairs().size();
        int optimalIterations = calculateOptimalIterationsForSingleTarget(qubits);

        List<QCircuit> circuits = buildCircuits(qubits, expectedFrequencies, useMCX, optimalIterations);
        QCircuit parallelCircuit = parallelize(circuits, qubits);

        int totalQubits = qubits * numberOfPairs;
        addInitialHadamard(parallelCircuit, totalQubits);

        String expected = buildExpected(expectedFrequencies);
        String initialize = Quirk2Qiskit.getGatesDeclaration(parallelCircuit).toString();
        String calculus = buildParallelCalculus(qubits, numberOfPairs);

        String code = this.replaceTokens(templateCode,
            "#QUBITS#", qubits*numberOfPairs, 
            "#OUTPUT_QUBITS#", qubits*numberOfPairs, 
            "#ORIGINAL_QUBITS#", qubits, 
            "#SPLIT#", "False",
            "#SHOTS#", 1024, 
            "#EXPECTED#", expected,
            "#CIRCUITS_DECLARATION#", "QuantumCircuit(qubits, outputQubits)",
            "#ALGORITHM#", "Grover",
            "#INITIALIZE#", initialize,
            "#CALCULUS#", calculus
        );

        Map<String, Object> result = new HashMap<>();
        result.put("QUIRK", toSingleQuirkList(parallelCircuit));
        result.put("CODE", code);
        return result;
    }

    private int calculateOptimalIterations(int qubits, int markedStates) {
        double n = Math.pow(2, qubits);
        double m = markedStates;
        return (int) Math.floor((Math.PI / 4) * Math.sqrt(n / m));
    }

    private int calculateOptimalIterationsForSingleTarget(int qubits) {
        return (int) Math.floor((Math.PI / 4) * Math.sqrt(Math.pow(2, qubits)));
    }

    private void addInitialHadamard(QCircuit circuit, int qubits) {
        QCircuitGate initialH = QCircuit.getH(qubits, circuit);
        circuit.addGate(initialH);
        circuit.insertColumnWithGate(0, initialH);
    }

    private List<Map<String, Object>> toSingleQuirkList(QCircuit circuit) {
        List<Map<String, Object>> quirk = new ArrayList<>();
        quirk.add(circuit.toJson().toMap());
        return quirk;
    }

    private String buildSingleCircuitCalculus() {
        return new StringBuilder()
                .append("circuits[0].append(getInitialH(), range(qubits))\n")
                .append("circuits[0].append(get0(), range(qubits))\n")
                .toString();
    }

    private String buildSplitCircuitsDeclaration(int numberOfPairs) {
        StringBuilder declaration = new StringBuilder();
        for (int i = 0; i < numberOfPairs; i++) {
            declaration.append("QuantumCircuit(qubits, qubits), ");
        }
        return declaration.toString();
    }

    private String buildSplitCalculus(int numberOfPairs) {
        StringBuilder calculus = new StringBuilder();
        for (int i = 0; i < numberOfPairs; i++) {
            calculus.append("circuits[").append(i).append("].append(getInitialH(), range(qubits))\n");
            calculus.append("circuits[").append(i).append("].append(getCircuit").append(i).append("(), range(qubits))\n");
        }
        return calculus.toString();
    }

    private String buildParallelCalculus(int qubits, int numberOfPairs) {
        StringBuilder calculus = new StringBuilder("circuits[0].append(getInitialH(), range(qubits))\n");

        int rangeStart = 0;
        for (int i = 0; i < numberOfPairs; i++) {
            calculus.append("circuits[0].append(get0_")
                    .append(i)
                    .append("(), range(")
                    .append(rangeStart)
                    .append(",")
                    .append(rangeStart + qubits)
                    .append("))\n");
            rangeStart += qubits;
        }
        return calculus.toString();
    }

    private String buildExpected(FreqTable expectedFrequencies) {
        StringBuilder expected = new StringBuilder("expected = [");
        List<Pair> pairs = expectedFrequencies.getPairs();
        double expectedFreq = 1.0 / pairs.size();

        for (int i = 0; i < pairs.size(); i++) {
            int index = pairs.get(i).getIndex();
            expected.append("(").append(index).append(", ").append(expectedFreq).append("),");
            if (i > 0 && i % 10 == 0) {
                expected.append("\n");
            }
        }
        expected.append("]");
        return expected.toString();
    }

    private void splitCircuits(List<QCircuit> circuits, FreqTable expectedFrequencies) {
        for (int i = 0; i < expectedFrequencies.getPairs().size(); i++) {
            QCircuit circuit = circuits.get(i);
            for (QGate gate : circuit.getGates()) {
                if (BASE_GATE_NAME.equals(gate.getName())) {
                    gate.setName(CIRCUIT_PREFIX + i);
                    break;
                }
            }
        }
    }

    private List<QCircuit> buildCircuits(int qubits, FreqTable expectedFrequencies, boolean useMCX, int optimalIterations)
            throws Exception {

        List<QCircuit> circuits = new ArrayList<>();
        for (Pair pair : expectedFrequencies.getPairs()) {
            FreqTable table = new FreqTable();
            table.addPair(pair);
            circuits.add(buildCircuit(qubits, table, useMCX, optimalIterations));
        }
        return circuits;
    }

    private QCircuit parallelize(List<QCircuit> circuits, int qubits) {
        QCircuit parallelCircuit = new QCircuit();
        int maxColumns = addGates(parallelCircuit, circuits);

        for (int i = 0; i < maxColumns; i++) {
            List<QColumn> columns = getColumnsAt(i, circuits);
            QColumn mergedColumn = QColumn.merge(columns, qubits, parallelCircuit);
            parallelCircuit.addColumn(mergedColumn);
        }

        return parallelCircuit;
    }

    private int addGates(QCircuit targetCircuit, List<QCircuit> circuits) {
        int maxColumns = 0;

        for (int i = 0; i < circuits.size(); i++) {
            QCircuit circuit = circuits.get(i);
            maxColumns = Math.max(maxColumns, circuit.getColumns().size());

            for (QGate gate : circuit.getGates()) {
                if (BASE_GATE_NAME.equals(gate.getName())) {
                    gate.setName(gate.getName() + "_" + i);
                }
                targetCircuit.addGate(gate);
            }
        }

        return maxColumns;
    }

    private List<QColumn> getColumnsAt(int columnIndex, List<QCircuit> circuits) {
        List<QColumn> columns = new ArrayList<>();
        for (QCircuit circuit : circuits) {
            if (columnIndex < circuit.getColumns().size()) {
                columns.add(circuit.getColumns().get(columnIndex));
            } else {
                columns.add(null);
            }
        }
        return columns;
    }

    private QCircuit buildCircuit(int qubits, FreqTable expectedFrequencies, boolean useMCX, int optimalIterations) {
        QCircuit circuit = new QCircuit();

        List<QCircuitGate> groverParts = buildGrover(expectedFrequencies, qubits, useMCX, circuit);
        QCircuitGate diffuser = groverParts.remove(groverParts.size() - 1);
        List<QCircuitGate> oracles = groverParts;

        for (QCircuitGate oracle : oracles)
            circuit.addGate(oracle);
        circuit.addGate(diffuser);

        QCircuitGate mainGate = new QCircuitGate(circuit);
        mainGate.setName(BASE_GATE_NAME);
        mainGate.setQubits(qubits);

        for (int i = 0; i < optimalIterations; i++) {
            for (QCircuitGate oracle : oracles) {
                mainGate.addColumn(oracle);
            }
            mainGate.addColumn(diffuser);
        }

        circuit.addGate(mainGate);
        circuit.addColumn(mainGate);
        circuit.setQubits(qubits);

        return circuit;
    }

    private List<QCircuitGate> buildGrover(FreqTable expectedFrequencies, int qubits, boolean useMCX, QCircuit circuit) {
        List<QCircuitGate> oracles = new ArrayList<>();

        for (Pair pair : expectedFrequencies.getPairs()) {
            int index = pair.getIndex();
            List<Integer> encodedRow = toBinaryRow(index, qubits);

            QCircuitGate oracle = buildOracle(encodedRow, useMCX, circuit);
            oracle.setName(ORACLE_PREFIX + index);
            oracles.add(oracle);
        }

        QCircuitGate diffuser = buildDiffuser(qubits, useMCX, circuit);
        diffuser.setName(DIFFUSER_NAME);
        oracles.add(diffuser);

        return oracles;
    }

    private List<Integer> toBinaryRow(int index, int qubits) {
        String binary = Integer.toBinaryString(index);
        while (binary.length() < qubits) {
            binary = "0" + binary;
        }

        List<Integer> row = new ArrayList<>();
        for (int i = 0; i < binary.length(); i++) {
            row.add(binary.charAt(i) == '1' ? 1 : 0);
        }
        return row;
    }

    private QCircuitGate buildDiffuser(int qubits, boolean useMCX, QCircuit circuit) {
        QCircuitGate diffuser = new QCircuitGate(circuit);

        if (useMCX) {
            QColumn h0 = new QColumn();
            QColumn x0 = new QColumn();
            QColumn hBeforeTarget = new QColumn();
            QColumn mcx = new QColumn();
            QColumn hAfterTarget = new QColumn();
            QColumn x1 = new QColumn();
            QColumn h1 = new QColumn();

            for (int i = 0; i < qubits; i++) {
                h0.addGate(new QStdGate("H", circuit));
                x0.addGate(new QStdGate("X", circuit));
                hBeforeTarget.addGate(new QStdGate("1", circuit));
                mcx.addGate(new QStdGate("•", circuit));
                hAfterTarget.addGate(new QStdGate("1", circuit));
                x1.addGate(new QStdGate("X", circuit));
                h1.addGate(new QStdGate("H", circuit));
            }

            hBeforeTarget.setGate(qubits - 1, new QStdGate("H", circuit));
            mcx.setGate(qubits - 1, new QStdGate("X", circuit));
            hAfterTarget.setGate(qubits - 1, new QStdGate("H", circuit));

            diffuser.addColumns(h0, x0, hBeforeTarget, mcx, hAfterTarget, x1, h1);
        } else {
            QColumn h0 = new QColumn();
            QColumn x0 = new QColumn();
            QColumn mcz = new QColumn();
            QColumn x1 = new QColumn();
            QColumn h1 = new QColumn();

            for (int i = 0; i < qubits; i++) {
                h0.addGate(new QStdGate("H", circuit));
                x0.addGate(new QStdGate("X", circuit));
                mcz.addGate(new QStdGate("•", circuit));
                x1.addGate(new QStdGate("X", circuit));
                h1.addGate(new QStdGate("H", circuit));
            }

            mcz.setGate(qubits - 1, new QStdGate("Z", circuit));
            diffuser.addColumns(h0, x0, mcz, x1, h1);
        }

        diffuser.setQubits(qubits);
        return diffuser;
    }

    private QCircuitGate buildOracle(List<Integer> row, boolean useMCX, QCircuit circuit) {
        QCircuitGate oracle = new QCircuitGate(circuit);

        QColumn encodingStart = encode(row, circuit);
        oracle.addColumn(encodingStart);

        if (useMCX) {
            QColumn hBefore = buildH(row, circuit);
            QColumn mcx = buildMCXOrMCH(row, new QStdGate("X", circuit), circuit);
            QColumn hAfter = buildH(row, circuit);
            oracle.addColumns(hBefore, mcx, hAfter);
        } else {
            QColumn mcz = buildMCXOrMCH(row, new QStdGate("Z", circuit), circuit);
            oracle.addColumn(mcz);
        }

        QColumn encodingEnd = encode(row, circuit);
        oracle.addColumn(encodingEnd);
        oracle.setQubits(encodingEnd.size());

        return oracle;
    }

    private QColumn encode(List<Integer> row, QCircuit circuit) {
        QColumn column = new QColumn();
        for (Integer value : row) {
            if (value == null || value == 0) {
                column.addGate(new QStdGate("X", circuit));
            } else {
                column.addGate(new QStdGate("1", circuit));
            }
        }
        return column;
    }

    private QColumn buildH(List<Integer> row, QCircuit circuit) {
        QColumn column = new QColumn();
        for (int i = 0; i < row.size(); i++) {
            column.addGate(new QStdGate("1", circuit));
        }
        column.setGate(row.size() - 1, new QStdGate("H", circuit));
        return column;
    }

    private QColumn buildMCXOrMCH(List<Integer> row, QStdGate gate, QCircuit circuit) {
        QColumn column = new QColumn();
        for (int i = 0; i < row.size() - 1; i++) {
            column.addGate(new QStdGate("•", circuit));
        }
        column.appendGate(gate, circuit);
        return column;
    }
}