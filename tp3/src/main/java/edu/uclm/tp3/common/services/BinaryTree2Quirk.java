package edu.uclm.tp3.common.services;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import edu.uclm.tp3.common.deterministic.BinaryTree;
import edu.uclm.tp3.common.deterministic.QCircuit;
import edu.uclm.tp3.common.deterministic.QCircuitGate;
import edu.uclm.tp3.common.deterministic.QColumn;
import edu.uclm.tp3.common.deterministic.QGate;
import edu.uclm.tp3.common.deterministic.QGateReference;
import edu.uclm.tp3.common.deterministic.QMatrixGate;
import edu.uclm.tp3.common.deterministic.QStdGate;

public class BinaryTree2Quirk {

    public static QCircuit buildQuirk(BinaryTree tree, int qubits, int circuitIndex, boolean originalGR) {
        QCircuit quirkCircuit = new QCircuit();
        quirkCircuit.setQubits(qubits);
        List<QGate> gates = new ArrayList<>();
        Map<String, BinaryTree> nodes = tree.getSeparatedNodes();
        for (String nodeName : nodes.keySet()) {
            BinaryTree node = nodes.get(nodeName);
            if (node.depth == qubits - 1) 
                continue; // Skip leaf nodes
            if (node.depth == qubits - 2) {
                buildGatesDepth2(node, originalGR, gates, quirkCircuit);
            } else {
                buildGatesDepthN(node, originalGR, gates, quirkCircuit);
            }
        }
        if (!originalGR)
            removeDuplicatedGates(gates);
        
        gates.sort(new Comparator<QGate>() {
            @Override
            public int compare(QGate a, QGate b) {
                if (a instanceof QMatrixGate && !(b instanceof QMatrixGate))
                    return -1;
                if (!(a instanceof QMatrixGate) && b instanceof QMatrixGate)
                    return 1;
                return Integer.valueOf(b.getName().length()).compareTo(a.getName().length());
            }
        });

        quirkCircuit.setGates(gates);
        QCircuit.calculateQubits(quirkCircuit);

        QColumn hColumn = new QColumn();
        for (int i=0; i<qubits; i++)
            hColumn.addGate(new QStdGate("H", quirkCircuit));
        quirkCircuit.addColumn(hColumn);
        QGateReference zeroGate;
        if (circuitIndex==-1)
            zeroGate = new QGateReference("0", quirkCircuit);
        else
            zeroGate = new QGateReference("circ" + circuitIndex + "_0", quirkCircuit);
        zeroGate.setQubits(qubits);
        quirkCircuit.addColumn(zeroGate);
        return quirkCircuit;
    }

    private static void removeDuplicatedGates(List<QGate> gates) {
        Set<QGate> seen = new HashSet<>();
        List<QGate> finalGates = new ArrayList<>();
        List<QGate[]> removedGates = new ArrayList<>();

        for (QGate gate : gates) {
            if (seen.add(gate)) {
                finalGates.add(gate);
            } else {
                QGate remainingGate = findEquivalent(gate, finalGates);
                removedGates.add(new QGate[] {remainingGate, gate});
            }
        }

        for (QGate[] gatePair : removedGates) {
            QGate remainingGate = gatePair[0];
            QGate removedGate = gatePair[1];
            for (QGate gate : gates) {
                if (gate instanceof QCircuitGate) {
                    QCircuitGate qcg = (QCircuitGate) gate;
                    qcg.replace(removedGate, remainingGate);
                }
            }
        }
        gates.clear();
        gates.addAll(finalGates);
    }

    private static QGate findEquivalent(QGate gate, List<QGate> candidates) {
        for (QGate candidate : candidates) {
            if (candidate.equals(gate)) {
                return candidate;
            }
        }
        return null; // Esto no debería pasar si `seen.add(gate)` devolvió false
    }

    private static void buildGatesDepthN(BinaryTree node, boolean originalGR, List<QGate> gates, QCircuit quirkCircuit) {
        if (originalGR) {
            getGRCircuitGateForDepthN(node, gates, quirkCircuit);
        } else {
            getGreenobleCircuitGateForDepthN(node, gates, quirkCircuit);
        }
    }

    private static void getGreenobleCircuitGateForDepthN(BinaryTree node, List<QGate> gates, QCircuit quirkCircuit) {
        if (node.leftProbability==0 && node.rightProbability==0)
            return;

        QCircuitGate gate = new QCircuitGate(quirkCircuit);
        gate.setName(node.name);

        if (node.leftProbability == 0) {
            QGate ry0 = new QMatrixGate(quirkCircuit)
                .setTheta(node.leftAngle)
                .setName(node.name + "_0");
            gate.addColumn(ry0);
            gate.addColumn("1", new QGateReference(node.rightChild.name, quirkCircuit));

            gates.add(ry0);
        } else if (node.rightProbability == 0) {
            QGate ry0 = new QMatrixGate(quirkCircuit)
                .setTheta(node.leftAngle)
                .setName(node.name + "_0");
            gate.addColumn(ry0);
            gate.addColumn("1", new QGateReference(node.leftChild.name, quirkCircuit));

            gates.add(ry0);
        } else if (node.leftProbability == node.rightProbability) {
            gate.addColumn(new QStdGate("X", quirkCircuit));

            gate.addColumn("•", new QGateReference(node.leftChild.name, quirkCircuit));
            gate.addColumn(new QStdGate("X", quirkCircuit));
            gate.addColumn("•", new QGateReference(node.rightChild.name, quirkCircuit));
        } else {
            QGate ry0 = new QMatrixGate(quirkCircuit)
                .setTheta(node.leftAngle)
                .setName(node.name + "_0");
            gate.addColumn(ry0);
            gate.addColumn(new QStdGate("X", quirkCircuit));

            gate.addColumn("•", new QGateReference(node.leftChild.name, quirkCircuit));
            gate.addColumn(new QStdGate("X", quirkCircuit));
            gate.addColumn("•", new QGateReference(node.rightChild.name, quirkCircuit));

            gates.add(ry0);
        }
        gates.add(gate);  
    }

    private static void getGRCircuitGateForDepthN(BinaryTree node, List<QGate> gates, QCircuit quirkCircuit) {
        QCircuitGate gate = new QCircuitGate(quirkCircuit);
        gate.setName(node.name);

        QGate ry0 = new QMatrixGate(quirkCircuit)
            .setTheta(node.leftAngle)
            .setName(node.name + "_0");
        gate.addColumn(ry0);

        gate.addColumn(new QStdGate("X", quirkCircuit));
        gate.addColumn("•", new QGateReference(node.leftChild.name, quirkCircuit));
        gate.addColumn(new QStdGate("X", quirkCircuit));
        gate.addColumn("•", new QGateReference(node.rightChild.name, quirkCircuit));

        gates.add(ry0);
        gates.add(gate);
    }

    private static void buildGatesDepth2(BinaryTree node, boolean originalGR, List<QGate> gates, QCircuit quirkCircuit) {
        if (originalGR) {
            getGRCircuitGateForDepth2(node, gates, quirkCircuit);
        } else {
            getGreenobleCircuitGateForDepth2(node, gates, quirkCircuit);
        }
    }

    private static void getGreenobleCircuitGateForDepth2(BinaryTree node, List<QGate> gates, QCircuit quirkCircuit) {
        if (node.leftProbability==0 && node.rightProbability==0)
            return;

        QCircuitGate gate = new QCircuitGate(quirkCircuit);
        gate.setName(node.name);

        if (node.leftProbability == 0) {
            QGate ry0 = new QMatrixGate(quirkCircuit)
                .setTheta(node.leftAngle)
                .setName(node.name + "_0");
            gate.addColumn(ry0);

            QGate ry1 = new QMatrixGate(quirkCircuit)
                .setTheta(node.rightChild.leftAngle)
                .setName(node.rightChild.name);
            gate.addColumn("1", ry1);

            gates.add(ry0);
            gates.add(ry1);
        } else if (node.rightProbability == 0) {
            QGate ry0 = new QMatrixGate(quirkCircuit)
                .setTheta(node.leftAngle)
                .setName(node.name + "_0");
            gate.addColumn(ry0);

            QGate ry1 = new QMatrixGate(quirkCircuit)
                .setTheta(node.leftChild.leftAngle)
                .setName(node.leftChild.name);
            gate.addColumn("1", ry1);

            gates.add(ry0);
            gates.add(ry1);
        } else if (node.leftProbability == node.rightProbability) {
            gate.addColumn(new QStdGate("X", quirkCircuit));
        
            QGate ryLeft = new QMatrixGate(quirkCircuit)
                .setTheta(node.leftChild.leftAngle)
                .setName(node.leftChild.name);
            gate.addColumn("•", ryLeft);

            gate.addColumn(new QStdGate("X", quirkCircuit));

            QGate ryRight = new QMatrixGate(quirkCircuit)
                .setTheta(node.rightChild.leftAngle)
                .setName(node.rightChild.name);
            gate.addColumn("•", ryRight);

            gates.add(ryLeft);
            gates.add(ryRight);
        } else {
            QGate ry0 = new QMatrixGate(quirkCircuit)
                .setTheta(node.leftAngle)
                .setName(node.name + "_0");
            gate.addColumn(ry0);

            gate.addColumn(new QStdGate("X", quirkCircuit));
            
            QGate ryLeft = new QMatrixGate(quirkCircuit)
                .setTheta(node.leftChild.leftAngle)
                .setName(node.leftChild.name);
            gate.addColumn("•", ryLeft);

            gate.addColumn(new QStdGate("X", quirkCircuit));

            QGate ryRight = new QMatrixGate(quirkCircuit)
                .setTheta(node.rightChild.leftAngle)
                .setName(node.rightChild.name);
            gate.addColumn("•", ryRight);

            gates.add(ry0);
            gates.add(ryLeft);
            gates.add(ryRight);
        }
        gates.add(gate);
    }

    private static void getGRCircuitGateForDepth2(BinaryTree node, List<QGate> gates, QCircuit quirkCircuit) {
        QCircuitGate gate = new QCircuitGate(quirkCircuit);
        gate.setName(node.name);

        QGate ry0 = new QMatrixGate(quirkCircuit)
            .setTheta(node.leftAngle)
            .setName(node.name + "_0");
        gate.addColumn(ry0);

		gate.addColumn(new QStdGate("X", quirkCircuit));
        
        QGate ryLeft = new QMatrixGate(quirkCircuit)
            .setTheta(node.leftChild.leftAngle)
            .setName(node.leftChild.name);
        gate.addColumn("•", ryLeft);

        gate.addColumn(new QStdGate("X", quirkCircuit));

        QGate ryRight = new QMatrixGate(quirkCircuit)
            .setTheta(node.rightChild.leftAngle)
            .setName(node.rightChild.name);
        gate.addColumn("•", ryRight);

        gates.add(ry0);
        gates.add(ryLeft);
        gates.add(ryRight);
        gates.add(gate);
    }

}
