package edu.uclm.tp3.common.deterministic;

import java.io.Serializable;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

public class BinaryTree implements Serializable{
	
	static final boolean DEBUG = false; 
	static final boolean PRINT = true; 

	private transient Coder coder;

    private int qubits;
	
	String name;
    int leftFreq;
    int rightFreq;
    float leftProbability, rightProbability;
    float leftAngle;
    
    BinaryTree parent;
    BinaryTree leftChild;
    BinaryTree rightChild;

    int depth;

    private transient GRCircuit circuit;
    
    public BinaryTree() {
		this.name = "";
        this.circuit = new GRCircuit();
	}

    public int getQubits() {
        return qubits;
    }

    public void setQubits(int qubits) {
        this.qubits = qubits;
    }

    public String getCode() {
        return this.circuit.toString();
    }

	public void setCoder(Coder coder) {
		this.coder = coder;
	}

    public void setCircuit(GRCircuit circuit) {
        this.circuit = circuit;
    }

    public GRCircuit getCircuit() {
        return circuit;
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
    	this.prune();
    }

    private void removeLowAnglesRecursive(BinaryTree node, double physicalAngle) {
		if (node==null)
			return;

        if (Math.abs(node.leftAngle)<physicalAngle) {
			node.leftAngle = 0;
		} else if (Math.abs(Math.PI - node.leftAngle)<physicalAngle) {
			node.leftAngle = (float) Math.PI;
		}
		            
		this.removeLowAnglesRecursive(node.leftChild, physicalAngle);
		this.removeLowAnglesRecursive(node.rightChild, physicalAngle);
	}

	public void normalizeProbabilities() {
		normalizeProbabilitiesRecursive(this);
    }

    private void normalizeProbabilitiesRecursive(BinaryTree node) {
        if (node == null)
            return;
        
        float sum = node.leftFreq + node.rightFreq;

        if (sum > 0) {
            node.leftProbability = node.leftFreq / sum;
            node.rightProbability = node.rightFreq / sum;
        }
        
        node.leftAngle = (float) (2*Math.acos(Math.sqrt(node.leftProbability)) - Math.PI/2);

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
    
    public void addChildren() {
        addChildrenToLeaves(this, 0, "");
    }

    private void addChildrenToLeaves(BinaryTree node, int depth, String position) {
        if (node == null) return;
    
        // 1) Sincronizamos la profundidad y el nombre
        node.depth = depth;
        node.name  = depth + position;
    
        // 2) Si es hoja, creamos los hijos
        if (node.leftChild == null && node.rightChild == null) {
            // hijo izquierdo
            BinaryTree left = new BinaryTree();
            left.parent          = node;
            left.depth           = depth + 1;
            left.name            = (depth + 1) + position + "L";
            left.leftProbability = 0;
            left.rightProbability= 0;
            node.leftChild       = left;
    
            // hijo derecho
            BinaryTree right = new BinaryTree();
            right.parent           = node;
            right.depth            = depth + 1;
            right.name             = (depth + 1) + position + "R";
            right.leftProbability  = 0;
            right.rightProbability = 0;
            node.rightChild        = right;
    
            return;
        }
    
        // 3) Si no es hoja, seguimos recursión
        addChildrenToLeaves(node.leftChild,  depth + 1, position + "L");
        addChildrenToLeaves(node.rightChild, depth + 1, position + "R");
    }
    
    public void setPrefixes(String splitIndex, String functionPrefix) {
        setPrefixesRecursive(this, splitIndex, functionPrefix);
    }

    private void setPrefixesRecursive(BinaryTree node, String splitIndex, String position) {
        if (node == null)
            return;

        node.name = splitIndex + position + node.name;

        if (node.leftChild != null) {
            setPrefixesRecursive(node.leftChild, splitIndex, position);
        }
        if (node.rightChild != null) {
            setPrefixesRecursive(node.rightChild, splitIndex, position);
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
        map.put("leftFreq", node.leftFreq);
        map.put("rightFreq", node.rightFreq);
        map.put("leftProbability", node.leftProbability);
        map.put("rightProbability", node.rightProbability);
        map.put("leftAngle", node.leftAngle);
        //map.put("rightAngle", node.rightAngle);
        map.put("rightAngle", (float) (Math.PI - node.leftAngle));

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

        String r = repeat("  ", level) + "depth = " + node.depth + " [" + node.name + "]-> " +
        		"freqs.: (" + node.leftFreq + ", " + node.rightFreq + "); " +
                "probs: (" + node.leftProbability +
                ", " + node.rightProbability + "); " +                 
                "angles: (" + node.leftAngle +
                //", " + node.rightAngle +
                ", " + (float) (Math.PI - node.leftAngle) +
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

	public void prune() {
		this.pruneRecursive(this);
	}

	private void pruneRecursive(BinaryTree node) {
		if (node == null)
	        return;

	    if (node.leftChild != null && node.leftProbability == 0) {
	        node.leftChild = null;
	    }

	    if (node.rightChild != null && node.rightProbability == 0) {
	        node.rightChild = null;
	    }

	    if (node.leftChild != null) {
	    	pruneRecursive(node.leftChild);
	    }
	    if (node.rightChild != null) {
	    	pruneRecursive(node.rightChild);
	    }
	}

	public boolean hasGrandchildren() {
		return (this.leftChild!=null && (this.leftChild.leftChild!=null || this.leftChild.rightChild!=null)) 
				|| (this.rightChild!=null && (this.rightChild.leftChild!=null || this.rightChild.rightChild!=null));
	}

    public Map<Integer, BinaryTree> hashing() {
    	Map<Integer, BinaryTree> nodes = new HashMap<>();
		nodes.put(this.hashCode(), this);
    	hashingRecursive(this, nodes);
    	return nodes;
    }

	private void hashingRecursive(BinaryTree node, Map<Integer, BinaryTree> nodes) {
		BinaryTree existingNode;
		int childHash;
		
		if (node.leftChild!=null) {
			childHash = node.leftChild.hashCode();
			existingNode = nodes.get(childHash);
			
			if (existingNode!=null) {
				node.leftChild = existingNode;
				node.leftChild.parent = existingNode.parent;
			} else {
				nodes.put(childHash, node.leftChild);
			}
			this.hashingRecursive(node.leftChild, nodes);
		}
		if (node.rightChild!=null) {
			childHash = node.rightChild.hashCode();
			existingNode = nodes.get(childHash);
			
			if (existingNode!=null) {
				node.rightChild = existingNode;
				node.rightChild.parent = existingNode.parent;
			} else {
				nodes.put(childHash, node.rightChild);
			}
			this.hashingRecursive(node.rightChild, nodes);
		}
	}

    @Override
    public int hashCode() {
        // 1. Iniciamos con los bits de leftAngle
        int result = Float.floatToIntBits(this.leftProbability);
        result = 31 * result + Float.floatToIntBits(this.rightProbability);
        // 3. Añadimos la profundidad (depth)
        result = 31 * result + this.depth;
        // 4. Incorporamos el hash recursivo del hijo izquierdo
        result = 31 * result + (this.leftChild  != null ? this.leftChild.hashCode()  : 0);
        // 5. Incorporamos el hash recursivo del hijo derecho
        result = 31 * result + (this.rightChild != null ? this.rightChild.hashCode() : 0);
        return result;
    }
    
    @Override
    public boolean equals(Object obj) {
        if (this == obj)
            return true;
        if (obj == null || getClass() != obj.getClass())
            return false;
        BinaryTree other = (BinaryTree) obj;
        // Comparamos qubits, ángulo, depth y estructura de hijos
        return this.qubits == other.qubits
            && Float.floatToIntBits(this.leftAngle) == Float.floatToIntBits(other.leftAngle)
            && this.depth == other.depth
            && Objects.equals(this.leftChild,  other.leftChild)
            && Objects.equals(this.rightChild, other.rightChild);
    }
    

	public Map<String, BinaryTree> getSeparatedNodes() {
		Map<String, BinaryTree> nodesByName = new HashMap<>();
		nodesByName.put(this.name, this);
		getSeparatedNodesRecursive(nodesByName, this);
		return nodesByName;
	}

	private void getSeparatedNodesRecursive(Map<String, BinaryTree> nodeNames, BinaryTree node) {
		if (node.leftChild!=null) {
			nodeNames.put(node.leftChild.name, node.leftChild);
			this.getSeparatedNodesRecursive(nodeNames, node.leftChild);
		}
		if (node.rightChild!=null) {
			nodeNames.put(node.rightChild.name, node.rightChild);
			this.getSeparatedNodesRecursive(nodeNames, node.rightChild);
		}
	}

	public BinaryTree getCode(BinaryTree rootNode, int nodeDepth, Map<Integer, BinaryTree> usedNodesMap) {
		return this.coder.getCode(rootNode, nodeDepth, usedNodesMap);
	}
}
