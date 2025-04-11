package edu.uclm.tp3.common.deterministic;

import java.util.Map;

public class GRCoder extends Coder {

    public GRCoder(BinaryTree node, String functionPrefix) {
        super(node, functionPrefix);
    }

    @Override
    public BinaryTree getCode(BinaryTree rootNode, int nodeDepth, Map<Integer, BinaryTree> usedNodesMap) {
        if (nodeDepth==2)
			return this.getLeafCode(rootNode);

        GRCircuit circuit = new GRCircuit(this.functionPrefix, this.node.name, nodeDepth);
        GRY ry = new GRY(0, this.node.leftAngle, this.node.name);
        GRX x = new GRX();
        GRCU cu0 = new GRCU(this.functionPrefix, this.node.leftChild.name, 0, nodeDepth, 1, this.node.name);
        GRCU cu1 = new GRCU(this.functionPrefix, this.node.rightChild.name, 0, nodeDepth, 1, this.node.name);

        circuit.addGate(ry)
            .addGate(x)
            .addGate(cu0)
            .addGate(x)
            .addGate(cu1);
        this.node.setCircuit(circuit);

		return this.node;
    }

    private BinaryTree getLeafCode(BinaryTree rootNode) {
        GRCircuit circuit = new GRCircuit(this.functionPrefix, this.node.name, 2);
        GRY ry = new GRY(0, this.node.leftAngle, this.node.name);
        GRX x = new GRX();
        GRCRY cry0 = new GRCRY(0, 1, this.node.leftChild.leftAngle, this.node.name);
        GRCRY cry1 = new GRCRY(0, 1, this.node.rightChild.leftAngle, this.node.name);

        circuit.addGate(ry)
            .addGate(x)
            .addGate(cry0)
            .addGate(x)
            .addGate(cry1);
        this.node.setCircuit(circuit);

        return this.node;
    }
}
