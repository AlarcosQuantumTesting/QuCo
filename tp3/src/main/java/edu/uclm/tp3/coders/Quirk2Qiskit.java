package edu.uclm.tp3.coders;

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

    public static StringBuilder getGatesDeclaration(QCircuit circuit, String... excludedGates) {
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

    private static StringBuilder getFunctionCode(QGate gate) {
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

    private static StringBuilder getFunctionCode(QMatrixGate gate) {
        StringBuilder sb = new StringBuilder();
        sb.append("\tU.ry(" + gate.getTheta() + ", 0)\n");
        return sb;
    }

    private static StringBuilder getFunctionCode(QCircuitGate gate) {
        StringBuilder sb = new StringBuilder();
        List<QColumn> columns = gate.getColumns();
        for (int i=0; i<columns.size(); i++) {
            QColumn column = columns.get(i);
            sb.append(getCode(column));
        }
        return sb;
    }

    private static StringBuilder getControlledCode(String circuitName, QColumn column) {
        StringBuilder sb = new StringBuilder();
        if (circuitName.equals("circuit"))
            sb.append(circuitName + ".");
        else
            sb.append("\t" + circuitName + ".");

        int numberOfControlQubits = 0;
        StringBuilder controlQubits = new StringBuilder();
        StringBuilder controlledQubits = new StringBuilder();
        QGate controlledGate = null;
        for (int i=0; i<column.getGates().size(); i++) {
            QGate gate = column.getGates().get(i);
            if (gate.isControlGate()) {
                controlQubits.append(i + ", ");
                numberOfControlQubits++;
            } else if (!gate.getName().equals("1")) {
                for (int j=0; j<gate.getQubits(); j++)
                   controlledQubits.append((i+j) + ", ");
                controlledGate = gate;
            }
        }

        controlledQubits = new StringBuilder(controlledQubits.substring(0, controlledQubits.length()-2));

        if (controlledGate.getName().equals("X")) {
            if (numberOfControlQubits>1)
                sb.append("mcx([" + controlQubits + "], [" + controlledQubits + "])\n");
            else 
                sb.append("cx([" + controlQubits + "], [" + controlledQubits + "])\n");
        } else if (controlledGate.getName().equals("Z")) {
            if (numberOfControlQubits>1)
                sb.append("mcp(pi, " + controlQubits + ", " + controlledQubits + ")\n");
            else
                sb.append("cz(" + controlQubits + ", " + controlledQubits + ")\n");
        } else if (controlledGate instanceof QGateReference || controlledGate instanceof QCircuitGate || controlledGate instanceof QMatrixGate) {
            sb.append("append(get" + controlledGate.getName() + "().control(" + numberOfControlQubits + "), [" + controlQubits + controlledQubits + "])\n");
        } else 
            sb = new StringBuilder("# " + circuitName + "." + controlledGate.getName() + "(" + controlledQubits + ")     # Ojo a esta puerta ******** \n");
        if (circuitName.equals("circuit"))
            sb.append(circuitName + ".barrier()\n");
        return sb;
    }

    private static StringBuilder getCode(QColumn column) {
        if (column.isControlColumn())
            return getControlledCode("U", column);

        int startQubit = 0;
        StringBuilder sb = new StringBuilder();
        for (int i=0; i<column.getGates().size(); i++) {
            QGate gate = column.getGates().get(i);
            String gateName = gate.getName();
            if (gate instanceof QStdGate) {
                if (!gateName.equals("1"))
                    sb.append(getBasicGateCode("U", gateName, i));
                startQubit = startQubit + 1;
            } else {
                sb.append("\tU.append(get" + gateName + "(), range(" + startQubit + ", " + (startQubit + gate.getQubits()) + "))\n");
                startQubit = startQubit + gate.getQubits();
            } 
        }
        return sb;
    }

    private static StringBuilder getBasicGateCode(String circuitName, String gateName, int qubitIndex) {
        StringBuilder sb = new StringBuilder();
        if (circuitName.equals("U"))
            sb.append("\tU.");
        else
            sb.append("circuit.");

        if (isBasic(gateName.toUpperCase())) {
            sb.append(gateName.toLowerCase() + "(" + qubitIndex + ")\n");   
        } else if (gateName.indexOf("^")!=-1) {
            char left = gateName.charAt(0);
            String exponent = gateName.substring(gateName.indexOf("^")+1);
            double theta = 0.0;
            switch (exponent) {
                case "½":
                    theta = 0.5; break;
                case "-½":
                    theta = -0.5; break;
                case "¼":
                    theta = 0.25; break;
                case "-¼":
                    theta = -0.25; break;
            }
            sb.append("append(" + left + "Gate().power(" + theta + "), [" + qubitIndex + "])\n");
        } else {
            sb = new StringBuilder("# " + circuitName + "." + gateName + "(" + qubitIndex + ")     # Ojo a esta puerta ******** \n");
        }

        return sb;
    }

    private static boolean isBasic(String gateName) {
        return gateName.equals("X") || gateName.equals("Y") || gateName.equals("Z") || gateName.equals("H");
    }

    public static StringBuilder getColumnsDeclaration(QCircuit qCircuit) {
        StringBuilder sb = new StringBuilder();
        List<QColumn> columns = qCircuit.getColumns();

        for (int i=0; i<columns.size(); i++) {
            QColumn column = columns.get(i);
            sb.append(getColumnDeclaration(column));
        }

        return sb;
    }

    private static StringBuilder getColumnDeclaration(QColumn column) {
        if (column.isControlColumn())
            return getControlledCode("circuit", column);

        StringBuilder sb = new StringBuilder();
        int startQubit = 0;
        for (int i=0; i<column.getGates().size(); i++) {
            QGate gate = column.getGates().get(i);
            if (gate.getId()==Integer.valueOf(1))
                startQubit++;
            else if (gate.getId().toString().startsWith("~")) {
                sb.append("circuit.append(get" + gate.getName() + "(), range(" + startQubit + ", " + (startQubit + gate.getQubits()) + "))\n");
                startQubit = startQubit + gate.getQubits() - 1;
            } else {
                sb.append(getBasicGateCode("circuit", gate.getName(), startQubit));
                startQubit++;
            }
        }
        sb.append("circuit.barrier()\n");
        return sb;
    }

}
