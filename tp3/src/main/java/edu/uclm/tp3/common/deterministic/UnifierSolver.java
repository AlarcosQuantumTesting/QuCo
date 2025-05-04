package edu.uclm.tp3.common.deterministic;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class UnifierSolver extends Solver {
	private String functionPrefix;
	private boolean originalGR;
		
	public UnifierSolver(BinaryTree tree, String functionPrefix, boolean originalGR) {
		super(tree);
		this.functionPrefix = functionPrefix;
		this.originalGR = originalGR;
	}

	public Map<String, Object> solve(int shots) {
		Map<String, BinaryTree> nodes = this.tree.getSeparatedNodes();
		List<String> nodeNames = nodes.keySet().stream()
				.sorted((key1, key2) -> Integer.compare(key1.length(), key2.length())) 
				.collect(Collectors.toList());

		int treeDepthMinus1 = this.tree.getDepth() - 1;
		for (int i=nodeNames.size()-1; i>=0; i--) {
			String nodeName = nodeNames.get(i);
			BinaryTree node = nodes.get(nodeName);
			if (node.depth == treeDepthMinus1)
				nodeNames.remove(i);
		}
		
		Map<Integer, BinaryTree> usedNodesMap = new HashMap<>();
		List<BinaryTree> usedNodesList = new ArrayList<>();

		int nodeNamesSize = nodeNames.size();
		for (int i=nodeNamesSize-1; i>=0; i--) {
			String nodeName = nodeNames.get(i);
			BinaryTree node = nodes.get(nodeName);
			Coder coder;
			if (originalGR)
				coder = new GRCoder(node, functionPrefix);
			else 
				coder = new GrenobleCoder(node, functionPrefix);

			node.setCoder(coder);

			if (originalGR) {
				int nodeDepth = node.getDepth();
				node = node.getCode(this.tree, nodeDepth, null);
				usedNodesList.add(node);
			} else {
				BinaryTree preexistingNode = usedNodesMap.get(node.hashCode());
				if (preexistingNode!=null && preexistingNode.getDepth() == node.getDepth()) {
					BinaryTree parent = node.parent;
					if (parent!=null) {
						if (parent.leftChild==node)
							parent.leftChild = preexistingNode;
						else
							parent.rightChild = preexistingNode;
					}
					continue;
				}
				int nodeDepth = node.getDepth();
				node = node.getCode(this.tree, nodeDepth, usedNodesMap);
				if (node!=null)
					usedNodesMap.put(node.hashCode(), node);
			}
		}

		Map<String, Object> result = new HashMap<>();
		QCircuit generalCircuit = new QCircuit();
		Object[] initialize;
		if (originalGR)
			initialize = this.getInitialize(usedNodesList, generalCircuit);
		else 
			initialize = this.getInitialize(usedNodesMap, generalCircuit);
		
		result.put("#INITIALIZE#", initialize[0]);

		result.put("QUIRK", generalCircuit);
		return result;
	}

	private Object[] getInitialize(List<BinaryTree> usedNodeList, QCircuit generalCircuit) {
		StringBuilder sbSubcircuits = new StringBuilder();
		List<QCircuit> qCircuits = new ArrayList<>();
		for (BinaryTree bt : usedNodeList) {
			sbSubcircuits.append(bt.getCode());
			qCircuits.add(this.buildQuirk(bt, generalCircuit));
		}

		return new Object[]{ sbSubcircuits + "\n", qCircuits };
	}
	
	private Object[] getInitialize(Map<Integer, BinaryTree> usedNodesMap, QCircuit generalCircuit) {
		StringBuilder sbSubcircuits = new StringBuilder();
		List<QCircuit> qCircuits = new ArrayList<>();
		
		for (BinaryTree bt : usedNodesMap.values()) {
			sbSubcircuits.append(bt.getCode());
			qCircuits.add(this.buildQuirk(bt, generalCircuit));
		}
		
		return new Object[]{ sbSubcircuits + "\n", qCircuits };
	}

	private QCircuit buildQuirk(BinaryTree node, QCircuit generalCircuit) {
		QCircuit circuit = new QCircuit();
		circuit.setName(node.name);
		if (node.getDepth()==2) {
			if (node.leftProbability!=0 && node.rightProbability!=0) {
				QRY ry0 = this.getQRY(node);
				ry0.name = node.name + "-0";
				circuit.addColumn(ry0);
				generalCircuit.addGate(ry0);
				circuit.addColumn("X");
				
				BinaryTree leftChild = node.leftChild;
				QRY ryLeft = this.getQRY(leftChild);
				circuit.addColumn("•", ryLeft);
				generalCircuit.addGate(ryLeft);
				circuit.addColumn("X");

				BinaryTree rightChild = node.rightChild;
				if (rightChild!=null) {  // ¿Seguro? XXX
					QRY ryRight = this.getQRY(rightChild);
					circuit.addColumn("•", ryRight);
					generalCircuit.addGate(ryRight);
				}
			} else if (node.rightProbability==0) {
				QRY ry0 = this.getQRY(node);
				ry0.name = node.name + "-0";
				circuit.addColumn(ry0);
				generalCircuit.addGate(ry0);

				BinaryTree leftChild = node.leftChild;
				if (leftChild!=null) { // ¿Seguro? XXX
					QRY ryLeft = this.getQRY(leftChild);
					circuit.addColumn("1", ryLeft);
					generalCircuit.addGate(ryLeft);
				}
			} else if (node.leftProbability==0) {
				QRY ry0 = this.getQRY(node);
				ry0.name = node.name + "-0";
				circuit.addColumn(ry0);
				generalCircuit.addGate(ry0);

				BinaryTree rightChild = node.rightChild;
				QRY ryRight = this.getQRY(rightChild);
				circuit.addColumn("1", ryRight);
				generalCircuit.addGate(ryRight);
			}
		} else {
			QRY ry0 = this.getQRY(node);
			ry0.name = node.name + "-0";
			circuit.addColumn(ry0);
			generalCircuit.addGate(ry0);

			if (node.rightProbability==0) {
				BinaryTree leftChild = node.leftChild;
				circuit.addColumn("1", "~"  + leftChild.name);
			} else if (node.leftProbability==0) {
				BinaryTree rightChild = node.rightChild;
				circuit.addColumn("1", "~"  + rightChild.name);
			} else {
				circuit.addColumn("X");
				BinaryTree leftChild = node.leftChild;
				circuit.addColumn("•", "~"  + leftChild.name);

				circuit.addColumn("X");
				BinaryTree rightChild = node.rightChild;
				circuit.addColumn("•", "~"  + rightChild.name);
			}
		}
		generalCircuit.addGate(circuit);
		return circuit;
	}

	private QRY getQRY(BinaryTree node) {
		QRY qry = new QRY();
		qry.setName(node.name);
		qry.setTheta(node.leftAngle);
		return qry;
	}
}
