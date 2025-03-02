package edu.uclm.tp3.common.deterministic;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import edu.uclm.tp3.common.model.Circuit;

public class UnifierSolver extends Solver {
	private int depth;
	
	public UnifierSolver(BinaryTree tree, Circuit circuit) {
		super(tree, circuit);
	}

	public Map<String, Object> solve(int shots) throws IOException {
		this.depth = this.tree.getDepth();
		Map<String, BinaryTree> nodes = this.tree.getSeparatedNodes();
		List<String> nodeNames = nodes.keySet().stream()
				//.filter(key -> key.length()<this.depth)
				.sorted((key1, key2) -> Integer.compare(key1.length(), key2.length())) 
				.collect(Collectors.toList());

		for (int i=nodeNames.size()-1; i>=0; i--) {
			String nodeName = nodeNames.get(i);
			String sLevel = "";
			for (int j=0; j<nodeName.length(); j++) {
				char c = nodeName.charAt(j);
				if (c>='0' && c<='9')
					sLevel = sLevel + c;
				else
					break;
			}
			int level = Integer.parseInt(sLevel);
			if (level == this.depth-1)
				nodeNames.remove(i);
		}
		
		Map<Integer, BinaryTree> usedNodesMap = new HashMap<>();
		for (int i=nodeNames.size()-1; i>=0; i--) {
			String nodeName = nodeNames.get(i);
			BinaryTree node = nodes.get(nodeName);
			BinaryTree preexistingNode = usedNodesMap.get(node.hashCode());
			if (preexistingNode==null) {
				int nodeDepth = node.getDepth();
				node = node.getCode(nodeDepth, usedNodesMap);
				if (node!=null)
					usedNodesMap.put(node.hashCode(), node);
			}
		}
		
		StringBuilder code = new StringBuilder();	
		code.append("circuit.append(get0(), [" + this.getTargetQubits(0, this.depth) + "])\n");

		Map<String, Object> result = new HashMap<>();
		result.put("#QUBITS#", this.circuit.getQubits());
		result.put("#OUTPUT_QUBITS#", this.circuit.getQubits());
		result.put("#SHOTS#", shots);
		result.put("#INITIALIZE#", this.getInitialize(usedNodesMap));
		result.put("#CALCULUS#", code);
		result.put("#MEASURES#", this.getMeasures(this.circuit.getQubits()));
		result.put("tree", this.tree.toMap());
		return result;
	}
	
	private String getInitialize(Map<Integer, BinaryTree> usedNodesMap) {
		String h = "";
		for (int i=0; i<depth; i++)
			h = h + "circuit.h(" + i + ")\n";
		
		StringBuilder sbSubcircuits = new StringBuilder();
		for (BinaryTree m : usedNodesMap.values())
			sbSubcircuits.append(m.code);
		
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
