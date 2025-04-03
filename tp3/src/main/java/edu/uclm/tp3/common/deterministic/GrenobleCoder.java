package edu.uclm.tp3.common.deterministic;

import java.util.Map;

public class GrenobleCoder extends Coder {

	public GrenobleCoder(BinaryTree node, String functionPrefix) {
       super(node, functionPrefix);
    }

    @Override
    public BinaryTree getCode(int nodeDepth, Map<Integer, BinaryTree> usedNodesMap) {
        if (nodeDepth==2)
			return this.getLeafCode(usedNodesMap);

		if (this.node.leftProbability==0 && this.node.rightProbability==0)
			return null;

		GRCircuit circuit = new GRCircuit(this.functionPrefix, this.node.name, nodeDepth);
		BinaryTree child;
		if (this.node.leftProbability==0) {
			GRY ry = new GRY(0, this.node.leftAngle);
			circuit.addColumn(ry);
			child = usedNodesMap.get(this.node.rightChild.hashCode());

			GRCU grCU = new GRCU(this.functionPrefix, child.name, 1, nodeDepth);
			circuit.addColumn(grCU);
			this.node.circuit = circuit;

			return this.node;
		}

		if (this.node.rightProbability==0) {
			GRY ry = new GRY(0, this.node.leftAngle);
			circuit.addColumn(ry);

			child = usedNodesMap.get(this.node.leftChild.hashCode());
			GRCU grCU = new GRCU(this.functionPrefix, child.name, 1, nodeDepth);
			circuit.addColumn(grCU);

			this.node.circuit = circuit;
			return this.node;
		}

		if (this.node.leftProbability==this.node.rightProbability) {
			GRCU grCU = new GRCU(this.functionPrefix, this.node.leftChild.name, 0, nodeDepth, 1);
			circuit.addColumn(grCU);
			this.node.circuit = circuit;
			return this.node;
		}

		GRY ry = new GRY(0, this.node.leftAngle);
		circuit.addColumn(ry);

		GRX x = new GRX();
		circuit.addColumn(x);

		child = usedNodesMap.get(this.node.leftChild.hashCode());
		GRCU cu0 = new GRCU(functionPrefix, child.name, 0, nodeDepth, 1);
		circuit.addColumn(cu0);
		circuit.addColumn(x);

		child = usedNodesMap.get(this.node.rightChild.hashCode());
		GRCU cu1 = new GRCU(functionPrefix, child.name, 0, nodeDepth, 1);
		circuit.addColumn(cu1);
		this.node.circuit = circuit;

		return this.node;
    }

    private BinaryTree getLeafCode(Map<Integer, BinaryTree> usedNodesMap) {
		if (usedNodesMap.get(this.hashCode())!=null)
			return null;

		if (this.node.leftProbability==0 && this.node.rightProbability==0)
			return null;
		
		if (this.node.leftProbability==0) {
			GRY ry0 = new GRY(0, this.node.leftAngle);
			GRY ry1 = new GRY(1, this.node.rightChild.leftAngle);

			GRCircuit circuit = new GRCircuit(this.functionPrefix, this.node.name, 2)
				.addColumn(ry0)
				.addColumn(ry1);
			
			this.node.circuit = circuit;
			return this.node;
		}

		if (this.node.rightProbability==0) {
			GRY ry0 = new GRY(0, this.node.leftAngle);

			GRCircuit circuit = new GRCircuit(this.functionPrefix, this.node.name, 2)
				.addColumn(ry0);

			if (this.node.leftChild.leftAngle!=0) {
				GRY ry1 = new GRY(1, this.node.leftChild.leftAngle);
				circuit.addColumn(ry1);
			} 
			this.node.circuit = circuit;
			return this.node;
		}

		if (this.node.leftProbability==this.node.rightProbability) {
			GRCircuit circuit = new GRCircuit(this.functionPrefix, this.node.name, 2);

			if (this.node.leftChild.leftAngle!=0) {
				GRX x = new GRX();
				GRCRY cry = new GRCRY(0, 1, this.node.leftChild.leftAngle);
				circuit.addColumn(x)
					.addColumn(cry)
					.addColumn(x);
			}
			if (this.node.rightChild.leftAngle!=0) {
				GRCRY cry = new GRCRY(0, 1, this.node.rightChild.leftAngle);
				circuit.addColumn(cry);
			}
			this.node.circuit = circuit;
			return this.node;
		}

		GRY ry0 = new GRY(0, this.node.leftAngle);
		
		GRCircuit circuit = new GRCircuit(this.functionPrefix, this.node.name, 2)
			.addColumn(ry0);

		if (this.node.leftChild.leftAngle==this.node.rightChild.leftAngle) {
			GRY ry1= new GRY(1, this.node.leftChild.leftAngle);
			circuit.addColumn(ry1);
			this.node.rightChild = null;
		} else {
			if (this.node.leftChild.leftAngle!=0) {
				GRX x = new GRX();
				GRCRY cry = new GRCRY(0, 1, this.node.leftChild.leftAngle);
				circuit.addColumn(x)
					.addColumn(cry)
					.addColumn(x);
			}
			if (this.node.rightChild.leftAngle!=0) {
				GRCRY cry = new GRCRY(0, 1, this.node.rightChild.leftAngle);
				circuit.addColumn(cry);
			}
		}

		this.node.circuit = circuit;
		return this.node;
	}
}
