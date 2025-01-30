package edu.uclm.tp3.common.deterministic;

import java.util.HashMap;
import java.util.Map;

public class BinaryTree {
	
	static final boolean DEBUG = false; 
	static final boolean PRINT = true; 
	
	String name;
    int value;
    int leftFreq;
    int rightFreq;
    double leftProbability, rightProbability;
    double leftAngle, rightAngle;
    
    BinaryTree parent;
    BinaryTree leftChild;
    BinaryTree rightChild;
    
    public BinaryTree() {
		this.value = -1;
		this.name = "";
	}
    
    public int getDepth() {
        return calculateDepth(this);
    }

    private int calculateDepth(BinaryTree node) {
        if (node == null)
            return 0;

        int leftDepth = calculateDepth(node.leftChild);
        int rightDepth = calculateDepth(node.rightChild);

        return Math.max(leftDepth, rightDepth) + 1;
    }
    
    public void removeLowAngles(double physicalAngle) {
    	this.removeLowAnglesRecursive(this, physicalAngle);
    	this.removeEmptyNodes();
    }

    private void removeLowAnglesRecursive(BinaryTree node, double physicalAngle) {
		if (node==null)
			return;
		
		if (Math.abs(node.leftAngle)<physicalAngle && Math.abs(node.rightAngle)<physicalAngle)
			node.leftAngle = node.rightAngle = 0;
		else if (Math.abs(node.leftAngle)<physicalAngle) {
			node.rightAngle = node.rightAngle + node.leftAngle;
			node.leftAngle = 0;
		} else if (Math.abs(node.rightAngle)<physicalAngle) {
			node.leftAngle = node.leftAngle + node.rightAngle;
			node.rightAngle = 0;
		}
		
		this.removeLowAnglesRecursive(node.leftChild, physicalAngle);
		this.removeLowAnglesRecursive(node.rightChild, physicalAngle);
	}

	public void normalizeProbabilities() {
    	this.assignNames();
		normalizeProbabilitiesRecursive(this);
    }

    private void normalizeProbabilitiesRecursive(BinaryTree node) {
        if (node == null)
            return;
        
        double sum = node.leftFreq + node.rightFreq;

        if (sum > 0) {
            node.leftProbability = node.leftFreq / sum;
            node.rightProbability = node.rightFreq / sum;
        }
        
        node.leftAngle = 2*Math.acos(Math.sqrt(node.leftProbability)) - Math.PI/2;
        node.rightAngle = Math.PI - node.leftAngle;
        if (node.rightAngle>=Math.PI)
        	node.rightAngle = node.rightAngle-Math.PI;

        normalizeProbabilitiesRecursive(node.leftChild);
        normalizeProbabilitiesRecursive(node.rightChild);
    }
    
    public void setFrequencies(String binario, double probability) {
        BinaryTree node = this; 

        for (int i = 0; i < binario.length(); i++) {
            char direction = binario.charAt(i);

            if (direction == '0') {
                node.leftFreq += probability;
                node = node.leftChild;
            } else if (direction == '1') {
            	node.rightFreq += probability;
                node = node.rightChild;
            }
        }
    }
    
    public void addChildren(double probability) {
        addChildrenToLeaves(this, probability);
    }

    private void addChildrenToLeaves(BinaryTree node, double probability) {
        if (node == null)
            return;

        if (node.leftChild == null && node.rightChild == null) {
            node.leftChild = new BinaryTree();
            node.leftChild.value = 0;
            node.leftProbability = probability;
            node.leftChild.parent = node;

            node.rightChild = new BinaryTree();
            node.rightChild.value = 1;
            node.rightProbability = probability;
            node.rightChild.parent = node;
            
            return;
        }

        addChildrenToLeaves(node.leftChild, probability);
        addChildrenToLeaves(node.rightChild, probability);
    }
    
    public void assignNames() {
        assignNamesRecursive(this, 0, "");
    }

    private void assignNamesRecursive(BinaryTree node, int depth, String position) {
        if (node == null)
            return;

        node.name = depth + (position.isEmpty() ? "" : "" + position);

        if (node.leftChild != null) {
            assignNamesRecursive(node.leftChild, depth + 1, position + "L");
        }
        if (node.rightChild != null) {
            assignNamesRecursive(node.rightChild, depth + 1, position + "R");
        }
    }

    public Map<String, Object> toMap() {
        return convertToMap(this);
    }

    private Map<String, Object> convertToMap(BinaryTree node) {
        if (node == null) {
            return null;
        }

        Map<String, Object> map = new HashMap<>();
        map.put("name", node.name);
        map.put("value", node.value);
        map.put("leftFreq", node.leftFreq);
        map.put("rightFreq", node.rightFreq);
        map.put("leftProbability", node.leftProbability);
        map.put("rightProbability", node.rightProbability);
        map.put("leftAngle", node.leftAngle);
        map.put("rightAngle", node.rightAngle);

        // Convierte los hijos en mapas recursivamente
        map.put("leftChild", convertToMap(node.leftChild));
        map.put("rightChild", convertToMap(node.rightChild));

        return map;
    }
    
    @Override
    public String toString() {
        return printTreeRecursive(this, 0);
    }

    private String printTreeRecursive(BinaryTree node, int level) {
        if (node == null)
            return "";

        String r = repeat("  ", level) + "[" + node.name + "]-> " +
        		"freqs.: (" + node.leftFreq + ", " + node.rightFreq + "); " +
                "probs: (" + (Math.round(node.leftProbability * 100.0) / 100.0) +
                ", " + (Math.round(node.rightProbability * 100.0) / 100.0) + "); " +
                
                "angles: (" + (Math.round(node.leftAngle * 100.0) / 100.0) +
                ", " + (Math.round(node.rightAngle * 100.0) / 100.0) + "); " +
                ")\n";

        r = r + printTreeRecursive(node.leftChild, level + 1);
        r = r + printTreeRecursive(node.rightChild, level + 1);
        return r;
    }
    
    public static String repeat(String str, int times) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < times; i++) {
            sb.append(str);
        }
        return sb.toString();
    }

	public void removeEmptyNodes() {
		this.removeEmptyNodesRecursive(this);
	}

	private void removeEmptyNodesRecursive(BinaryTree node) {
		if (node == null)
	        return;

	    // Eliminar el hijo izquierdo si leftProbability es 0
	    if (node.leftChild != null && node.leftProbability == 0) {
	        node.leftChild = null;
	    }

	    // Eliminar el hijo derecho si rightProbability es 0
	    if (node.rightChild != null && node.rightProbability == 0) {
	        node.rightChild = null;
	    }

	    // Continuar recursivamente para los hijos no nulos
	    if (node.leftChild != null) {
	        removeEmptyNodesRecursive(node.leftChild);
	    }
	    if (node.rightChild != null) {
	        removeEmptyNodesRecursive(node.rightChild);
	    }
	}

	public boolean hasGrandchildren() {
		return (this.leftChild!=null && (this.leftChild.leftChild!=null || this.leftChild.rightChild!=null)) 
				|| (this.rightChild!=null && (this.rightChild.leftChild!=null || this.rightChild.rightChild!=null));
	}
}
