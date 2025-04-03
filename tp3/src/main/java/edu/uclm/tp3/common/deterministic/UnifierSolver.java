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
		
	public UnifierSolver(BinaryTree tree, GRCircuit circuit, String functionPrefix, boolean originalGR) {
		super(tree, circuit);
		this.functionPrefix = functionPrefix;
		this.originalGR = originalGR;
	}

	public Map<String, Object> solve(int shots) throws IOException {
		Map<String, BinaryTree> nodes = this.tree.getSeparatedNodes();
		List<String> nodeNames = nodes.keySet().stream()
				.sorted((key1, key2) -> Integer.compare(key1.length(), key2.length())) 
				.collect(Collectors.toList());

		for (int i=nodeNames.size()-1; i>=0; i--) {
			String nodeName = nodeNames.get(i);
			BinaryTree node = nodes.get(nodeName);
			if (node.depth == circuit.getQubits()-1)
				nodeNames.remove(i);
		}
		
		Map<Integer, BinaryTree> usedNodesMap = new HashMap<>();
		List<BinaryTree> usedNodesList = new ArrayList<>();
		for (int i=nodeNames.size()-1; i>=0; i--) {
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
				node = node.getCode(nodeDepth, null);
				usedNodesList.add(node);
			} else {
				BinaryTree preexistingNode = usedNodesMap.get(node.hashCode());
				if (preexistingNode==null) {
					int nodeDepth = node.getDepth();
					node = node.getCode(nodeDepth, usedNodesMap);
					if (node!=null)
						usedNodesMap.put(node.hashCode(), node);
				}
			}
		}
		
		Map<String, Object> result = new HashMap<>();

		if (!originalGR) {
			result.put("#INITIALIZE#", this.getInitialize(usedNodesMap));
		} else {
			result.put("#INITIALIZE#", this.getInitialize(usedNodesList));
		}
		return result;
	}

	private String getInitialize(List<BinaryTree> usedNodeList) {
		StringBuilder sbSubcircuits = new StringBuilder();
		for (BinaryTree bt : usedNodeList)
			sbSubcircuits.append(bt.getCode());

		return sbSubcircuits + "\n";
	}
	
	private String getInitialize(Map<Integer, BinaryTree> usedNodesMap) {
		StringBuilder sbSubcircuits = new StringBuilder();
		for (BinaryTree m : usedNodesMap.values())
			sbSubcircuits.append(m.getCode());
		
		return sbSubcircuits + "\n";
	}
}
