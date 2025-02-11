package edu.uclm.tp3.common.deterministic;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import edu.uclm.tp3.common.model.Circuit;

public class OptimizedSubcircuitsSolver extends Solver {

	private int depth;
	
	protected OptimizedSubcircuitsSolver(BinaryTree tree, Circuit circuit) {
		super(tree, circuit);
	}

	@Override
	protected Map<String, Object> solve(int shots) throws IOException {
		this.depth = this.tree.getDepth();
		
		List<String> gatesCode = new ArrayList<>();
		
		StringBuilder code = new StringBuilder();
		
		if (this.depth==1) {
			code.append("circuit.ry(" + this.tree.leftAngle + ", 0)\n");
		} else if (this.depth==2) {
			this.buildLeafCode(tree, gatesCode);
			code.append("circuit.append(get0(), [0, 1])\n");
		} else {
			code.append("circuit.append(get0(), [" + this.getTargetQubits(0, this.depth) + "])\n");
			this.buildGet0(this.tree, gatesCode);
		}

		Map<String, Object> result = new HashMap<>();
		result.put("#QUBITS#", this.circuit.getQubits());
		result.put("#OUTPUT_QUBITS#", this.circuit.getQubits());
		result.put("#SHOTS#", shots);
		result.put("#INITIALIZE#", this.getInitialize(gatesCode));
		result.put("#CALCULUS#", code);
		result.put("#MEASURES#", this.getMeasures(this.circuit.getQubits()));
		result.put("tree", this.tree.toMap());
		return result;
	}
	
	private void buildGet0(BinaryTree root, List<String> gatesCode) {
		StringBuilder code = new StringBuilder("def get0():\n");
		code.append("\tU = QuantumCircuit(" + this.depth + ", name=\"0\")\n");
		if (root.rightChild==null) {
			code.append("\tU.ry(" + root.leftAngle + ", 0)\n");
			code.append("\tU.append(get1L(), [" + this.getTargetQubits(1, depth) + "])\n");
			code.append("\treturn U.to_gate()\n\n");
			gatesCode.add(code.toString());
			this.buildGates(tree.leftChild, 1, depth, gatesCode);
			return;
		}
		if (root.leftChild==null) {
			code.append("\tU.ry(" + root.leftAngle + ", 0)\n");
			code.append("\tU.append(get1R(), [" + this.getTargetQubits(1, depth) + "])\n");
			code.append("\treturn U.to_gate()\n\n");
			gatesCode.add(code.toString());
			this.buildGates(tree.rightChild, 1, depth, gatesCode);
			return;
		}
		if (root.leftAngle==root.rightAngle) {
			if (root.leftAngle!=0)
				code.append("\tcircuit.ry(" + root.leftAngle + ", 0)\n");
			
			boolean added = false;
			int sizeLeftPre = gatesCode.size();
			this.buildGates(tree.leftChild, 1, depth, gatesCode);
			if (gatesCode.size()>sizeLeftPre) {			
				code.append("\tcircuit.x(0)\n");
				code.append("\tU.append(get1L().control(1), [" + this.getTargetQubits(0, depth) + "])\n");
				code.append("\tcircuit.x(0)\n");
				added = true;
			}
			
			int sizeRightPre = gatesCode.size();
			this.buildGates(tree.rightChild, 1, depth, gatesCode);
			if (gatesCode.size()>sizeRightPre) {	
				code.append("\tU.append(get1R().control(1), [" + this.getTargetQubits(0, depth) + "])\n");
				added = true;
			}
			
			if (added) {
				code.append("\treturn U.to_gate()\n\n");
				gatesCode.add(code.toString());
			}
			return;
		}
		
		boolean added = false;
		int sizeLeftPre = gatesCode.size();
		this.buildGates(tree.leftChild, 1, depth, gatesCode);
		if (gatesCode.size()>sizeLeftPre) {		
			code.append("\tU.ry(" + root.leftAngle + ", 0)\n");
			code.append("\tU.x(0)\n");
			code.append("\tU.append(get1L().control(1), [" + this.getTargetQubits(0, depth) + "])\n");
			code.append("\tU.x(0)\n");
			added = true;
		}
		
		int sizeRightPre = gatesCode.size();
		this.buildGates(tree.rightChild, 1, depth, gatesCode);
		if (gatesCode.size()>sizeRightPre) {
			code.append("\tU.append(get1R().control(1), [" + this.getTargetQubits(0, depth) + "])\n");
			added = true;
		}
		
		if (added) {
			code.append("\treturn U.to_gate()\n\n");
			gatesCode.add(code.toString());
		}
	}

	private void buildGates(BinaryTree node, int startQubit, int depth, List<String> gatesCode) {
		StringBuilder code = new StringBuilder();
		if (depth-startQubit==2) {
			this.buildLeafCode(node, gatesCode);
			return;
		}
		code.append("def get" + node.name + "():\n");
		code.append("\tU = QuantumCircuit(" + (depth-startQubit) + ", name=\"" + node.name + "\")\n");		
		if (node.rightChild==null) {
			int sizePre = gatesCode.size();
			this.buildGates(node.leftChild, startQubit+1, depth, gatesCode);
					
			if (gatesCode.size()>sizePre) {
				code.append("\tU.ry(" + node.leftAngle + ", 0)\n");
				code.append("\tU.append(get" + node.leftChild.name + "(), [" + this.getTargetQubits(1, depth-startQubit) + "])\n");
				code.append("\treturn U.to_gate()\n\n");
				gatesCode.add(code.toString());
			} else {
				code.append("\tU.ry(" + node.leftAngle + ", 0)\n");
				code.append("\treturn U.to_gate()\n\n");
				gatesCode.add(code.toString());
			}
			return;
		}
		
		if (node.leftChild==null) {
			int sizePre = gatesCode.size();
			this.buildGates(node.rightChild, startQubit+1, depth, gatesCode);

			if (gatesCode.size()>sizePre) {
				code.append("\tU.ry(" + node.rightAngle + ", 0)\n");
				code.append("\tU.append(get" + node.rightChild.name + "(), [" + this.getTargetQubits(1, depth-startQubit) + "])\n");
				code.append("\treturn U.to_gate()\n\n");
				gatesCode.add(code.toString());
			} else {
				code.append("\tU.ry(" + node.leftAngle + ", 0)\n");
				code.append("\treturn U.to_gate()\n\n");
				gatesCode.add(code.toString());
			}
			return;
		}
		
		if (node.leftAngle==node.rightAngle) {
			if (node.leftAngle!=0)
				code.append("\trU.y(" + node.leftAngle + ", " + 0 + ")\n");

			int sizePreLeft = gatesCode.size();
			boolean added = false;
			this.buildGates(node.leftChild, startQubit+1, depth, gatesCode);
			if (gatesCode.size()>sizePreLeft) {
				code.append("\tU.x(0)\n");
				code.append("\tU.append(get" + node.leftChild.name + "().control(1), [" + this.getTargetQubits(0, depth-startQubit) + "])\n");
				code.append("\tU.x(0)\n");
				added = true;
			}
			
			int sizePreRight = gatesCode.size();
			this.buildGates(node.rightChild, startQubit+1, depth, gatesCode);
			if (gatesCode.size()>sizePreRight) {
				code.append("\tU.append(get" + node.rightChild.name + "().control(1), [" + this.getTargetQubits(0, depth-startQubit) + "])\n");
				added = true;
			}
			
			if (added) {
				code.append("\treturn U.to_gate()\n\n");
				gatesCode.add(code.toString());
			}
			return;
		}
		
		if (node.leftAngle!=0)
			code.append("\tU.ry(" + node.leftAngle + ", " + (0) + ")\n");

		boolean added = false;
		int sizeLeftPre = gatesCode.size();
		this.buildGates(node.leftChild, startQubit+1, depth, gatesCode);
		if (gatesCode.size()>sizeLeftPre) {
			code.append("\tU.x(0)\n");
			code.append("\tU.append(get" + node.leftChild.name + "().control(1), [" + this.getTargetQubits(0, depth-startQubit) + "])\n");
			code.append("\tU.x(0)\n");
			added = true;
		}
		
		int sizeRightPre = gatesCode.size();
		this.buildGates(node.rightChild, startQubit+1, depth, gatesCode);
		if (gatesCode.size()>sizeRightPre) { 
			code.append("\tU.append(get" + node.rightChild.name + "().control(1), [" + this.getTargetQubits(0, depth-startQubit) + "])\n");
			added = true;
		}
		
		if (added) {
			code.append("\treturn U.to_gate()\n\n");
			gatesCode.add(code.toString());
		}
	}

	private void buildLeafCode(BinaryTree node, List<String> gatesCode) {
		String code = "def get" + node.name + "():\n";
		code+="\tU = QuantumCircuit(2, name=\"" + node.name + "\")\n";
		
		if (node.rightChild==null) {
			code+="\tU.ry(" + node.leftAngle + ", 0)\n";
			if (node.leftChild.leftAngle!=0)
				code+="\tU.ry(" + node.leftChild.leftAngle + ", 1)\n";
			
			code+="\treturn U.to_gate()\n\n";
			gatesCode.add(code);
			return;
		}
		
		if (node.leftChild==null) {
			code+="\tU.ry(" + node.rightAngle + ", 0)\n";
			if (node.rightChild.leftAngle!=0)
				code+="\tU.ry(" + node.rightChild.leftAngle + ", 1)\n";
			
			code+="\treturn U.to_gate()\n\n";
			gatesCode.add(code);
			return;
		}
		
		if (node.leftChild.leftAngle==node.rightChild.leftAngle) {
			if (node.leftChild.leftAngle==0)
				return;
			
			code+="\tU.ry(" + node.leftChild.leftAngle + ", 1)\n";
			code+="\treturn U.to_gate()\n\n";
			gatesCode.add(code);
			return;
		}
		
		if (node.leftAngle!=0) 
			code+="\tU.ry(" + node.leftAngle + ", 0)\n";
		
		if (node.leftChild.leftAngle!=0) {
			code+="\tU.x(0)\n";
			code+="\tU.cry(" + node.leftChild.leftAngle + ", 0, 1)\n"; 
			code+="\tU.x(0)\n";
		}
		if (node.rightChild.leftAngle!=0)
			code+="\tU.cry(" + node.rightChild.leftAngle + ", 0, 1)\n";
		code+="\treturn U.to_gate()\n\n";
		gatesCode.add(code);
	}
		
	private String getInitialize(List<String> gates) {
		String h = "";
		for (int i=0; i<depth; i++)
			h = h + "circuit.h(" + i + ")\n";
		
		StringBuilder sbSubcircuits = new StringBuilder();
		for (int i=0; i<gates.size(); i++)
			sbSubcircuits.append(gates.get(i));
		
		return sbSubcircuits + "\n" + h + "\n";
	}
	
	private String getTargetQubits(int startQubit, int depth) {
		StringBuilder sb = new StringBuilder();
		for (int i=startQubit; i<depth-1; i++)
			sb.append(i + ",");
		sb.append(depth-1);
		return sb.toString();
	}
}
