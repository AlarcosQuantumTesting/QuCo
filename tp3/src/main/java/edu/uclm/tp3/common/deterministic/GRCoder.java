package edu.uclm.tp3.common.deterministic;

import java.util.Map;

public class GRCoder extends Coder {

    public GRCoder(BinaryTree node, String functionPrefix) {
        super(node, functionPrefix);
    }

    @Override
    public BinaryTree getCode(int nodeDepth, Map<Integer, BinaryTree> usedNodesMap) {
        if (nodeDepth==2)
			return this.getLeafCode();

        GRCircuit circuit = new GRCircuit(this.functionPrefix, this.node.name, nodeDepth);
        GRY ry = new GRY(0, this.node.leftAngle);
        GRX x = new GRX();
        GRCU cu0 = new GRCU(this.functionPrefix, this.node.leftChild.name, 0, nodeDepth, 1);
        GRCU cu1 = new GRCU(this.functionPrefix, this.node.rightChild.name, 0, nodeDepth, 1);

        circuit
            .addColumn(ry)
            .addColumn(x)
            .addColumn(cu0)
            .addColumn(x)
            .addColumn(cu1);

        this.node.circuit = circuit;
		return this.node;		
    }

    private BinaryTree getLeafCode() {
        GRCircuit circuit = new GRCircuit(this.functionPrefix, this.node.name, 2);
        GRY ry = new GRY(0, this.node.leftAngle);
        GRX x = new GRX();
        GRCRY cry0 = new GRCRY(0, 1, this.node.leftChild.leftAngle);
        GRCRY cry1 = new GRCRY(0, 1, this.node.rightChild.leftAngle);

        circuit.addColumn(ry)
            .addColumn(x)
            .addColumn(cry0)
            .addColumn(x)
            .addColumn(cry1);

		this.node.circuit = circuit;
        return this.node;
    }
}
