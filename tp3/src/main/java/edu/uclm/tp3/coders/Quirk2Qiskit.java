package edu.uclm.tp3.coders;

import java.util.ArrayList;
import java.util.List;

import edu.uclm.tp3.common.deterministic.QCircuit;
import edu.uclm.tp3.common.deterministic.QCircuitGate;
import edu.uclm.tp3.common.deterministic.QColumn;
import edu.uclm.tp3.common.deterministic.QGate;
import edu.uclm.tp3.common.deterministic.QGateReference;
import edu.uclm.tp3.common.deterministic.QMatrixGate;
import edu.uclm.tp3.common.deterministic.QStdGate;

public class Quirk2Qiskit {

    public static StringBuilder getGatesDeclaration(List<QCircuit> circuits) throws Exception {
        StringBuilder sb = new StringBuilder();
        QCircuit circuit0 = circuits.get(0);
        sb.append(getGatesDeclaration(circuit0));

        for (int i=1; i<circuits.size(); i++) {
            QCircuit circuit = circuits.get(i);
            sb.append(getGatesDeclaration(circuit, "InitialH", "Diffuser"));
        }
        return sb;
    }

    public static StringBuilder getGatesDeclaration(QCircuit circuit, String... excludedGates) throws Exception {
        StringBuilder sb = new StringBuilder();
        List<QGate> gates = circuit.getGates();
        for (int i=0; i<gates.size(); i++) {
            QGate gate = gates.get(i);
            boolean excluded = false;
            for (int j=0; j<excludedGates.length; j++) 
                if (gate.getName().equals(excludedGates[j])) {
                    excluded = true;
                    break;
                }
            if (excluded)
                continue;
            if (!(gate instanceof QStdGate))
                sb.append(getFunctionCode(gate));
        }
        sb.append("\n\n");
        return sb;
    }

    private static StringBuilder getFunctionCode(QGate gate) throws Exception {
        StringBuilder sb = new StringBuilder("def get" + gate.getName() + "() :\n");
        sb.append("\tU = QuantumCircuit(" + gate.getQubits() + ", name=\"" + gate.getName() + "\")\n");
        if (gate instanceof QCircuitGate) {
            QCircuitGate qcg = (QCircuitGate) gate;
            sb.append(getFunctionCode(qcg));
        } else if (gate instanceof QMatrixGate) {
            QMatrixGate qmg = (QMatrixGate) gate;
            sb.append(getFunctionCode(qmg));
        }
        sb.append("\treturn U.to_gate()\n\n");
        return sb;
    }

    private static StringBuilder getFunctionCode(QMatrixGate gate) throws Exception {
        StringBuilder sb = new StringBuilder();
        sb.append("\tU.ry(" + gate.getTheta() + ", 0)\n");
        return sb;
    }

    private static StringBuilder getFunctionCode(QCircuitGate gate) throws Exception {
        StringBuilder sb = new StringBuilder();
        List<QColumn> columns = gate.getColumns();
        for (int i=0; i<columns.size(); i++) {
            QColumn column = columns.get(i);
            sb.append(getCode(column));
        }
        return sb;
    }

    private static StringBuilder getControlledCode(QColumn column) throws Exception {
        StringBuilder sb = new StringBuilder();
        StringBuilder controlQubits = new StringBuilder();
        List<QGate> controlledQubitGates = new ArrayList<>();
        StringBuilder controlledQubits = new StringBuilder();
        int numberOfControlledQubits = 0;
        int numberOfControlQubits = 0;

        for (int i=0; i<column.getGates().size(); i++) {
            QGate gate = column.getGates().get(i);
            if (gate.isControlGate()) {
                controlQubits.append(i + ", ");
                numberOfControlQubits++;
            } else {
                controlledQubitGates.add(gate);
                controlledQubits.append(i + ", ");
                numberOfControlledQubits++;
            }
        }

        controlQubits.setLength(controlQubits.length() - 2); // remove last comma
        controlledQubits.setLength(controlledQubits.length() - 2); 
        
        if (numberOfControlQubits>1) 
            controlQubits.insert(0, "[").append("]");
        if (numberOfControlledQubits>1)
            controlledQubits.insert(0, "[").append("]");

        QGate controlledGate = controlledQubitGates.get(0);
        if (controlledGate.getName().equals("X")) {
            if (controlQubits.length()>1)
                sb.append("\tU.mcx(" + controlQubits + ", " + controlledQubits + ")\n");
            else 
                sb.append("\tU.cx(" + controlQubits + ", " + controlledQubits + ")\n");
        } else if (controlledGate.getName().equals("Z")) {
            if (controlQubits.length()>1)
                sb.append("\tU.mcp(pi, " + controlQubits + ", " + controlledQubits + ")\n");
            else
                sb.append("\tU.cz(" + controlQubits + ", " + controlledQubits + ")\n");
        } else if (controlledGate instanceof QGateReference) {
            sb.append("\tU.append(get" + controlledGate.getName() + "().control(1), [" + controlledQubits + "])\n");
        } else 
            throw new Exception("Unknown gate: " + controlledGate.getName());
        return sb;
    }

    private static StringBuilder getCode(QColumn column) throws Exception {
        if (column.isControlColumn())
            return getControlledCode(column);

        int startQubit = 0;
        StringBuilder sb = new StringBuilder();
        for (int i=0; i<column.getGates().size(); i++) {
            QGate gate = column.getGates().get(i);
            String gateName = gate.getName();
            if (gate instanceof QStdGate) {
                if (!gateName.equals("1"))
                    sb.append(getCode(gateName, i));
                startQubit = startQubit + 1;
            } else {
                sb.append("\tU.append(get" + gateName + "(), range(" + startQubit + ", " + (startQubit + gate.getQubits()) + "))\n");
                startQubit = startQubit + gate.getQubits();
            } 
        }
        return sb;
    }

    private static StringBuilder getCode(String gateName, int qubitIndex) {
        StringBuilder sb = new StringBuilder();
        switch (gateName) {
            case "H":
                sb.append("\tU.h(" + qubitIndex + ")\n");
                break;
            case "X":
                sb.append("\tU.x(" + qubitIndex + ")\n");
                break;
            default:
                sb.append("\tU." + gateName + "(" + qubitIndex + ")     # Ojo a esta puerta\n");
                break;
        }
        return sb;
    }

}
