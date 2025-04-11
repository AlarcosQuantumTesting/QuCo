package edu.uclm.tp3.common.deterministic;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import edu.uclm.tp3.common.gates.CRY;
import edu.uclm.tp3.common.gates.RY;
import edu.uclm.tp3.common.gates.X;

public class GroverRudolphSolver extends Solver {

	private int depth;

	public GroverRudolphSolver(BinaryTree tree) {
		super(tree);
	}

	@Override
	public Map<String, Object> solve(int shots) throws IOException {
		this.depth = this.tree.getDepth();
		List<String> gatesCode = new ArrayList<>();
		StringBuilder circuitsToPrint = new StringBuilder();
		
		StringBuilder code = new StringBuilder();
		
		if (this.depth==1) {
			RY ry0 = this.getRY(0, this.tree.leftAngle);
			code.append(ry0.getCode());
			circuitsToPrint.append("\tprint(\"0\")\n\tprint(U)\n");
		} else if (this.depth==2) {
			X x = (X) new X().setQubit(0);
			CRY cryLeft = this.getCRY(0, this.tree.leftChild.leftAngle);
			code.append(x.getCode());
			code.append(cryLeft.getCode());
			code.append(x.getCode());
			CRY cryRight = this.getCRY(0, this.tree.rightChild.leftAngle);
			code.append(cryRight.getCode());
		} else {
			RY ry0 = this.getRY(0, this.tree.leftAngle);
			code.append(ry0.getCode());
			X x1 = this.getX(0);
			code.append(x1.getCode());
			code.append("circuit.append(get" + this.tree.leftChild.name + "(), [" + this.getTargetQubits(0, depth) + "])\n");
			X x2 = this.getX(0);
			code.append(x2.getCode());
			code.append("circuit.append(get" + this.tree.rightChild.name + "(), [" + this.getTargetQubits(0, depth) + "])\n");
	
			circuitsToPrint.append("\tprint(\"" + this.tree.leftChild.name + "\")\n\tprint(U)\n");
			circuitsToPrint.append("\tprint(\"" + this.tree.rightChild.name + "\")\n\tprint(U)\n");

			buildGates(this.tree, 0, depth, gatesCode, circuitsToPrint);
		}

		Map<String, Object> result = new HashMap<>();
		result.put("#INITIALIZE#", this.getInitialize(gatesCode));
		result.put("#CALCULUS#", code);
		return result;
	}

	private void buildGates(BinaryTree node, int startQubit, int depth, List<String> gatesCode, StringBuilder circuitsToPrint) {
		if (node.leftChild.leftChild == null) {
			buildLeafCode(node, gatesCode, circuitsToPrint);
			return;
		}

		String code = "def get" + node.name + "():\n";
		code += "\tU = QuantumCircuit(" + (depth - startQubit) + ", name=\"" + node.name + "\")\n";
		RY ry0 = this.getRY(0, node.leftAngle);
		code += "\tU." + ry0;
		X x1 = this.getX(0);
		code += "\tU." + x1;
		code += "\tU.append(get" + node.leftChild.name + "(), [" + this.getTargetQubits(0, depth-startQubit) + "])\n";
		X x3 = this.getX(0);
		code += "\tU." + x3;
		code += "\tU.append(get" + node.rightChild.name + "(), [" + this.getTargetQubits(0, depth-startQubit) + "])\n";
		code += "\treturn U.to_gate().control(1)\n\n";

		gatesCode.add(code);
		circuitsToPrint.append("\tprint(\"" + this.tree.leftChild.name + "\")\n\tprint(U)\n");
		circuitsToPrint.append("\tprint(\"" + this.tree.rightChild.name + "\")\n\tprint(U)\n");

		this.buildGates(node.leftChild, startQubit + 1, depth, gatesCode, circuitsToPrint);
		this.buildGates(node.rightChild, startQubit + 1, depth, gatesCode, circuitsToPrint);
	}

	private void buildLeafCode(BinaryTree node, List<String> gatesCode, StringBuilder circuitsToPrint) {
		String code = "def get" + node.name + "():\n";
		code += "\tU = QuantumCircuit(2, name=\"" + node.name + "\")\n";
		RY ry0 = this.getRY(0, node.leftAngle);
		code += "\tU." + ry0;
		X x1 = this.getX(0);
		code += "\tU." + x1;
		CRY cry = this.getCRY(0, node.leftChild.leftAngle);
		code += "\tU." + cry;
		X x3 = this.getX(0);
		code += "\tU." + x3;
		CRY cry4 = this.getCRY(0, node.rightChild.leftAngle);
		code += "\tU." + cry4;
		code += "\treturn U.to_gate().control(1)\n\n";
		gatesCode.add(code);
		circuitsToPrint.append("\tprint(\"" + node.name + "\")\n\tprint(U)\n");
	}

	private String getInitialize(List<String> gates) {
		String h = "";
		for (int i = 0; i < depth; i++)
			h = h + "circuit.h(" + i + ")\n";

		StringBuilder sbSubcircuits = new StringBuilder();
		for (int i = 0; i < gates.size(); i++)
			sbSubcircuits.append(gates.get(i));

		return sbSubcircuits + "\n" + h + "\n";
	}

	private String getTargetQubits(int startQubit, int depth) {
		StringBuilder sb = new StringBuilder();
		for (int i = startQubit; i < depth - 1; i++)
			sb.append(i + ",");
		sb.append(depth - 1);
		return sb.toString();
	}

	private CRY getCRY(int startQubit, double theta) {
		CRY cry = new CRY();
		cry.set(0, startQubit);
		cry.set(1, startQubit + 1);
		cry.setTheta(theta);
		return cry;
	}

	private RY getRY(int qubit, double leftAngle) {
		RY ry = new RY();
		ry.setQubit(qubit);
		ry.setTheta(leftAngle);
		return ry;
	}
}
