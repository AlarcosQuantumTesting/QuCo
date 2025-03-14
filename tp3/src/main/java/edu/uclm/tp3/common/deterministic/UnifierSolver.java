package edu.uclm.tp3.common.deterministic;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import edu.uclm.tp3.common.model.Circuit;

public class UnifierSolver extends Solver {
	private int depth;
	private String functionPrefix;
	
	public UnifierSolver(BinaryTree tree, Circuit circuit, String functionPrefix) {
		super(tree, circuit);
		this.functionPrefix = functionPrefix;
	}

	public Map<String, Object> solve(int shots) throws IOException {
		this.depth = this.tree.getDepth();
		Map<String, BinaryTree> nodes = this.tree.getSeparatedNodes();
		List<String> nodeNames = nodes.keySet().stream()
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
		code.append("circuit.append(get0" + this.functionPrefix + "(), [" + this.getTargetQubits(0, this.depth) + "]) # Use this line to use functions\n");
		code.append("#circuit.unitary(U, qreg)   # Use this line for applying the unitary matrix\n");

		Map<String, Object> result = new HashMap<>();
		result.put("#QUBITS#", this.circuit.getQubits());
		result.put("#OUTPUT_QUBITS#", this.circuit.getQubits());
		result.put("#SHOTS#", shots);
		result.put("#HADAMARDS#", this.getHadamards(usedNodesMap));
		result.put("#INITIALIZE#", this.getInitialize(usedNodesMap));
		result.put("#CALCULUS#", code);
		result.put("#MEASURES#", this.getMeasures(this.circuit.getQubits()));
		result.put("tree", this.tree.toMap());
		result.put("unitaryMatrix", this.tree.matrix);
		return result;
	}

	private String getHadamards(Map<Integer, BinaryTree> usedNodesMap) {
		String h = "for i in range (0, qubits) :\n";
		h = h + "\tcircuit.h(i)\n";
		return h;
	}
	
	private String getInitialize(Map<Integer, BinaryTree> usedNodesMap) {
		StringBuilder sbSubcircuits = new StringBuilder();
		for (BinaryTree m : usedNodesMap.values())
			sbSubcircuits.append(m.code);
		
		return sbSubcircuits + "\n";
	}
	
	private String getTargetQubits(int startQubit, int depth) {
		StringBuilder sb = new StringBuilder();
		for (int i=startQubit; i<depth-1; i++)
			sb.append(i + ",");
		sb.append(depth-1);
		return sb.toString();
	}
}
