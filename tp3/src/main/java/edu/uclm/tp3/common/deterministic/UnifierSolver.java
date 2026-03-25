package edu.uclm.tp3.common.deterministic;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class UnifierSolver {
	protected BinaryTree tree;
	private String functionPrefix;
	private boolean originalGR;
		
	public UnifierSolver(BinaryTree tree, String functionPrefix, boolean originalGR) {
		this.tree = tree;
		this.functionPrefix = functionPrefix;
		this.originalGR = originalGR;
	}

	public Map<String, Object> solve(int shots, String backend) {
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
			initialize = this.getInitialize(usedNodesList, generalCircuit, backend);
		else 
			initialize = this.getInitialize(usedNodesMap, generalCircuit, backend);
		
		result.put("#INITIALIZE#", initialize[0]);

		result.put("QUIRK", generalCircuit);
		return result;
	}

	private Object[] getInitialize(List<BinaryTree> usedNodeList, QCircuit generalCircuit, String backend) {
		StringBuilder sbSubcircuits = new StringBuilder();
		List<QCircuit> qCircuits = new ArrayList<>();
		for (BinaryTree bt : usedNodeList) {
			sbSubcircuits.append(bt.getCode(backend));
			qCircuits.add(this.buildQuirk(bt, generalCircuit));
		}

		return new Object[]{ sbSubcircuits + "\n", qCircuits };
	}
	
	private Object[] getInitialize(Map<Integer, BinaryTree> usedNodesMap, QCircuit generalCircuit, String backend) {
		StringBuilder sbSubcircuits = new StringBuilder();
		List<QCircuit> qCircuits = new ArrayList<>();
		
		for (BinaryTree bt : usedNodesMap.values()) {
			sbSubcircuits.append(bt.getCode(backend));
			qCircuits.add(this.buildQuirk(bt, generalCircuit));
		}
		
		return new Object[]{ sbSubcircuits + "\n", qCircuits };
	}

	private QCircuit buildQuirk(BinaryTree node, QCircuit generalCircuit) {
		QCircuit circuit = new QCircuit();
		circuit.setName(node.name);
		return circuit;
	}

}
