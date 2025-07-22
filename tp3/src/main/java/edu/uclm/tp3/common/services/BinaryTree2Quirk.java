package edu.uclm.tp3.common.services;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import edu.uclm.tp3.common.deterministic.BinaryTree;
import edu.uclm.tp3.common.deterministic.QCircuit;
import edu.uclm.tp3.common.deterministic.QCircuitGate;
import edu.uclm.tp3.common.deterministic.QColumn;
import edu.uclm.tp3.common.deterministic.QGate;
import edu.uclm.tp3.common.deterministic.QGateReference;
import edu.uclm.tp3.common.deterministic.QMatrixGate;
import edu.uclm.tp3.common.deterministic.QStdGate;

public class BinaryTree2Quirk {

    public static QCircuit buildQuirk(BinaryTree tree, int qubits, String functionPrefix, boolean originalGR) {
        QCircuit quirkCircuit = new QCircuit();
        quirkCircuit.setQubits(qubits);
        List<QGate> gates = new ArrayList<>();
        Map<String, BinaryTree> nodes = tree.getSeparatedNodes();
        for (String nodeName : nodes.keySet()) {
            BinaryTree node = nodes.get(nodeName);
            if (node.depth == qubits - 1) 
                continue; // Skip leaf nodes
            if (node.depth == qubits - 2) {
                buildGatesDepth2(node, functionPrefix, originalGR, gates);
            } else {
                buildGatesDepthN(node, functionPrefix, originalGR, gates);
            }
        }
        quirkCircuit.addGates(gates);
        QColumn hColumn = new QColumn();
        for (int i=0; i<qubits; i++)
            hColumn.addGate(new QStdGate("H"));
        quirkCircuit.addColumn(hColumn);
        quirkCircuit.addColumn(new QGateReference("0"));
        return quirkCircuit;
    }

    private static void buildGatesDepthN(BinaryTree node, String functionPrefix, boolean originalGR, List<QGate> gates) {
        if (originalGR) {
            getGRCircuitGateForDepthN(node, gates);
        } else {
            getGreenobleCircuitGateForDepthN(node, gates);
        }
    }

    private static void getGreenobleCircuitGateForDepthN(BinaryTree node, List<QGate> gates) {
        if (node.leftProbability==0 && node.rightProbability==0)
            return;

        QCircuitGate gate = new QCircuitGate();
        gate.setName(node.name);

        if (node.leftProbability == 0) {
            QGate ry0 = new QMatrixGate()
                .setTheta(node.leftAngle)
                .setName(node.name + "-0");
            gate.addColumn(ry0);
            gate.addColumn("1", new QGateReference(node.rightChild.name));

            gates.add(ry0);
        } else if (node.rightProbability == 0) {
            QGate ry0 = new QMatrixGate()
                .setTheta(node.leftAngle)
                .setName(node.name + "-0");
            gate.addColumn(ry0);
            gate.addColumn("1", new QGateReference(node.leftChild.name));

            gates.add(ry0);
        } else if (node.leftProbability == node.rightProbability) {
            gate.addColumn(new QStdGate("X"));

            gate.addColumn("•", new QGateReference(node.leftChild.name));
            gate.addColumn(new QStdGate("X"));
            gate.addColumn("•", new QGateReference(node.rightChild.name));
        } else {
            QGate ry0 = new QMatrixGate()
                .setTheta(node.leftAngle)
                .setName(node.name + "-0");
            gate.addColumn(ry0);
            gate.addColumn(new QStdGate("X"));

            gate.addColumn("•", new QGateReference(node.leftChild.name));
            gate.addColumn(new QStdGate("X"));
            gate.addColumn("•", new QGateReference(node.rightChild.name));

            gates.add(ry0);
        }
        gates.add(gate);  
    }

    private static void getGRCircuitGateForDepthN(BinaryTree node, List<QGate> gates) {
        QCircuitGate gate = new QCircuitGate();
        gate.setName(node.name);

        QGate ry0 = new QMatrixGate()
            .setTheta(node.leftAngle)
            .setName(node.name + "-0");
        gate.addColumn(ry0);

        gate.addColumn(new QStdGate("X"));
        gate.addColumn("•", new QGateReference(node.leftChild.name));
        gate.addColumn(new QStdGate("X"));
        gate.addColumn("•", new QGateReference(node.rightChild.name));

        gates.add(ry0);
        gates.add(gate);
    }

    private static void buildGatesDepth2(BinaryTree node, String functionPrefix, boolean originalGR, List<QGate> gates) {
        if (originalGR) {
            getGRCircuitGateForDepth2(node, gates);
        } else {
            getGreenobleCircuitGateForDepth2(node, gates);
        }
    }

    private static void getGreenobleCircuitGateForDepth2(BinaryTree node, List<QGate> gates) {
        if (node.leftProbability==0 && node.rightProbability==0)
            return;

        QCircuitGate gate = new QCircuitGate();
        gate.setName(node.name);

        if (node.leftProbability == 0) {
            QGate ry0 = new QMatrixGate()
                .setTheta(node.leftAngle)
                .setName(node.name + "-0");
            gate.addColumn(ry0);

            QGate ry1 = new QMatrixGate()
                .setTheta(node.rightChild.leftAngle)
                .setName(node.rightChild.name);
            gate.addColumn("1", ry1);

            gates.add(ry0);
            gates.add(ry1);
        } else if (node.rightProbability == 0) {
            QGate ry0 = new QMatrixGate()
                .setTheta(node.leftAngle)
                .setName(node.name + "-0");
            gate.addColumn(ry0);

            QGate ry1 = new QMatrixGate()
                .setTheta(node.leftChild.leftAngle)
                .setName(node.leftChild.name);
            gate.addColumn("1", ry1);

            gates.add(ry0);
            gates.add(ry1);
        } else if (node.leftProbability == node.rightProbability) {
            gate.addColumn(new QStdGate("X"));
        
            QGate ryLeft = new QMatrixGate()
                .setTheta(node.leftChild.leftAngle)
                .setName(node.leftChild.name);
            gate.addColumn("•", ryLeft);

            gate.addColumn(new QStdGate("X"));

            QGate ryRight = new QMatrixGate()
                .setTheta(node.rightChild.leftAngle)
                .setName(node.rightChild.name);
            gate.addColumn("•", ryRight);

            gates.add(ryLeft);
            gates.add(ryRight);
        } else {
            QGate ry0 = new QMatrixGate()
                .setTheta(node.leftAngle)
                .setName(node.name + "-0");
            gate.addColumn(ry0);

            gate.addColumn(new QStdGate("X"));
            
            QGate ryLeft = new QMatrixGate()
                .setTheta(node.leftChild.leftAngle)
                .setName(node.leftChild.name);
            gate.addColumn("•", ryLeft);

            gate.addColumn(new QStdGate("X"));

            QGate ryRight = new QMatrixGate()
                .setTheta(node.rightChild.leftAngle)
                .setName(node.rightChild.name);
            gate.addColumn("•", ryRight);

            gates.add(ry0);
            gates.add(ryLeft);
            gates.add(ryRight);
        }
        gates.add(gate);
    }

    private static void getGRCircuitGateForDepth2(BinaryTree node, List<QGate> gates) {
        QCircuitGate gate = new QCircuitGate();
        gate.setName(node.name);

        QGate ry0 = new QMatrixGate()
            .setTheta(node.leftAngle)
            .setName(node.name + "-0");
        gate.addColumn(ry0);

		gate.addColumn(new QStdGate("X"));
        
        QGate ryLeft = new QMatrixGate()
            .setTheta(node.leftChild.leftAngle)
            .setName(node.leftChild.name);
        gate.addColumn("•", ryLeft);

        gate.addColumn(new QStdGate("X"));

        QGate ryRight = new QMatrixGate()
            .setTheta(node.rightChild.leftAngle)
            .setName(node.rightChild.name);
        gate.addColumn("•", ryRight);

        gates.add(ry0);
        gates.add(ryLeft);
        gates.add(ryRight);
        gates.add(gate);
    }

}
