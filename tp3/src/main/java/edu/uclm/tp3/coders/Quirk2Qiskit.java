package edu.uclm.tp3.coders;

import java.util.ArrayList;
import java.util.List;

import edu.uclm.tp3.common.deterministic.QCircuit;
import edu.uclm.tp3.common.deterministic.QCircuitGate;
import edu.uclm.tp3.common.deterministic.QColumn;
import edu.uclm.tp3.common.deterministic.QGate;
import edu.uclm.tp3.common.deterministic.QStdGate;

public class Quirk2Qiskit {

    public static StringBuilder getCode(QCircuit circuit) throws Exception {
        StringBuilder sb = new StringBuilder();
        List<QGate> gates = circuit.getGates();
        for (int i=0; i<gates.size(); i++) {
            QGate gate = gates.get(i);
            if (!(gate instanceof QStdGate))
                sb.append(getFunctionCode(gate));
        }
        sb.append("\n\n");

        sb.append("def getCircuit():\n");
        sb.append("\tU = QuantumCircuit(qubits)\n");
        sb.append("\t# gates\n");
        for (int i=0; i<circuit.getColumns().size(); i++) {
            QColumn column = circuit.getColumns().get(i);
            sb.append(getCode(column));
        }
        sb.append("\treturn U\n\n");
        return sb;
    }

    private static StringBuilder getFunctionCode(QGate gate) throws Exception {
        StringBuilder sb = new StringBuilder("def get" + gate.getName() + "() :\n");
        sb.append("\tU = QuantumCircuit(qubits)\n");
        if (gate instanceof QCircuitGate) {
            QCircuitGate cg = (QCircuitGate) gate;
            sb.append(getFunctionCode(cg));
        } else {
            System.out.println("EHHHHHHHHH");
        }
        sb.append("\treturn U\n\n");
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
        } else {
            throw new Exception("mct gate not supported");
        }
        return sb;
    }

    private static StringBuilder getCode(QColumn column) throws Exception {
        if (column.isControlColumn())
            return getControlledCode(column);

        StringBuilder sb = new StringBuilder();
        for (int i=0; i<column.getGates().size(); i++) {
            QGate gate = column.getGates().get(i);
            String gateName = gate.getName();
            if (gate instanceof QStdGate) {
                if (!gateName.equals("1"))
                    sb.append(getCode(gateName, i));
            } else {
                sb.append("\tU.append(get" + gateName + "(), range(qubits))\n");
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
                break;
        }
        return sb;
    }

}
