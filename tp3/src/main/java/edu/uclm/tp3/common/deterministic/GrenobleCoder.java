package edu.uclm.tp3.common.deterministic;

import java.util.Map;

public class GrenobleCoder extends Coder {

	public GrenobleCoder(BinaryTree node, String functionPrefix) {
       super(node, functionPrefix);
    }

    @Override
    public BinaryTree getCode(BinaryTree rootNode, int nodeDepth, Map<Integer, BinaryTree> usedNodesMap) {
        if (nodeDepth==2)
			return this.getLeafCode(rootNode, usedNodesMap);

		if (this.node.leftProbability==0 && this.node.rightProbability==0)
			return null;

		GRCircuit circuit = new GRCircuit(this.functionPrefix, this.node.name, nodeDepth);

		BinaryTree child;
		if (this.node.leftProbability==0) {
			GRY ry = new GRY(0, this.node.leftAngle, this.node.name + "-L");
			circuit.addGate(ry);
			child = usedNodesMap.get(this.node.rightChild.hashCode());
			if (child!=null)  {
				GRCU cu = new GRCU(this.functionPrefix, child.name, 1, nodeDepth, child.name);
				circuit.addGate(cu);
			}
			this.node.setCircuit(circuit);

			return this.node;
		}

		if (this.node.rightProbability==0) {
			GRY ry = new GRY(0, this.node.leftAngle, this.node.name + "-R");
			circuit.addGate(ry);

			child = usedNodesMap.get(this.node.leftChild.hashCode());
			if (child!=null)  {
				GRCU cu = new GRCU(this.functionPrefix, child.name, 1, nodeDepth, child.name);
				circuit.addGate(cu);
			}
			this.node.setCircuit(circuit);

			return this.node;
		}

		if (this.node.leftProbability==this.node.rightProbability) {
			GRCU cuLeft = new GRCU(this.functionPrefix, this.node.leftChild.name, 0, nodeDepth, 1, this.node.leftChild.name);
			circuit.addGate(new GRX());
			circuit.addGate(cuLeft);
			circuit.addGate(new GRX());
			GRCU cuRight = new GRCU(this.functionPrefix, this.node.rightChild.name, 0, nodeDepth, 1, this.node.rightChild.name);
			circuit.addGate(cuRight);
			this.node.setCircuit(circuit);

			return this.node;
		}

		GRY ry = new GRY(0, this.node.leftAngle, this.node.name + "-0");
		circuit.addGate(ry);
		child = usedNodesMap.get(this.node.leftChild.hashCode());
		if (child!=null) {
			GRX x = new GRX();
			circuit.addGate(x);
			GRCU cu0 = new GRCU(functionPrefix, child.name, 0, nodeDepth, 1, child.name);
			circuit.addGate(cu0);
			circuit.addGate(x);
		}
		child = usedNodesMap.get(this.node.rightChild.hashCode());
		if (child!=null) {
			GRCU cu1 = new GRCU(functionPrefix, child.name, 0, nodeDepth, 1, child.name);
			circuit.addGate(cu1);
		}
		this.node.setCircuit(circuit);

		return this.node;
    }

    private BinaryTree getLeafCode(BinaryTree rootNode, Map<Integer, BinaryTree> usedNodesMap) {
		if (usedNodesMap.get(this.hashCode())!=null)
			return null;

		if (this.node.leftProbability==0 && this.node.rightProbability==0)
			return null;
		
		GRCircuit circuit = new GRCircuit(this.functionPrefix, this.node.name, 2);

		if (this.node.leftProbability==0) {
			GRY ry0 = new GRY(0, this.node.leftAngle, this.node.name + "-L");
			circuit.addGate(ry0);

			GRY ry1 = null;
			if (this.node.rightChild.leftAngle!=0)  {
				ry1 = new GRY(1, this.node.rightChild.leftAngle, this.node.name + "-R");
				circuit.addGate(ry1);
			}

			this.node.setCircuit(circuit);

			return this.node;
		}

		if (this.node.rightProbability==0) {
			GRY ry0 = new GRY(0, this.node.leftAngle, this.node.name + "-L");
			circuit.addGate(ry0);

			GRY ry1 = null;

			if (this.node.leftChild.leftAngle!=0)  {
				ry1 = new GRY(1, this.node.leftChild.leftAngle, this.node.name + "-R");
				circuit.addGate(ry1);
			}
			this.node.setCircuit(circuit);

			return this.node;
		}

		if (this.node.leftProbability==this.node.rightProbability) {
			return null;
		}

		GRY ry0 = new GRY(0, this.node.leftAngle, this.node.name + "0");
		circuit.addGate(ry0);

		if (this.node.leftChild.leftAngle==this.node.rightChild.leftAngle) {
			GRY ry1= new GRY(1, this.node.leftChild.leftAngle, this.node.name + "1");
			circuit.addGate(ry1);
			this.node.rightChild = null;
		} else {
			if (this.node.leftChild.leftAngle!=0) {
				GRX x = new GRX();
				GRCRY cry = new GRCRY(0, 1, this.node.leftChild.leftAngle, this.node.leftChild.name);
				circuit.addGate(x);
				circuit.addGate(cry);
				circuit.addGate(x);
				GRY ry = cry.ry;
				ry.id = cry.id + "-L";
			}
			if (this.node.rightChild.leftAngle!=0) {
				GRCRY cry = new GRCRY(0, 1, this.node.rightChild.leftAngle, this.node.rightChild.name);
				circuit.addGate(cry);
				GRY ry = cry.ry;
				ry.id = cry.id + "-R";
			}
		}

		this.node.setCircuit(circuit);
		return this.node;
	}
}
