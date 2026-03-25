package edu.uclm.tp3.common.deterministic;

import java.util.Map;

public abstract class Coder {

    protected BinaryTree node;
    protected String functionPrefix;
    
    public Coder(BinaryTree node, String functionPrefix) {
        this.node = node;
        this.functionPrefix = functionPrefix;
    }

    public abstract BinaryTree getCode(BinaryTree rootNode, int nodeDepth, Map<Integer, BinaryTree> usedNodesMap);

    public static String getTargetQubits(int startQubit, int depth) {
		StringBuilder sb = new StringBuilder();
		for (int i=startQubit; i<depth-1; i++)
			sb.append(i + ",");
		sb.append(depth-1);
		return sb.toString();
	}

    public static String getTargetQubits(String prefix, int startQubit, int depth) {
		StringBuilder sb = new StringBuilder();
		for (int i=startQubit; i<depth-1; i++)
			sb.append(prefix + i + ",");
		sb.append(prefix + (depth-1));
		return sb.toString();
	}

}
