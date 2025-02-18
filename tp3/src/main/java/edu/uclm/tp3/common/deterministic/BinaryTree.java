package edu.uclm.tp3.common.deterministic;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

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
    	this.prune();
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
        //if (node.rightAngle>=Math.PI)
        //	node.rightAngle = node.rightAngle-Math.PI;

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

	public void prune() {
		this.pruneRecursive(this);
	}

	private void pruneRecursive(BinaryTree node) {
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
		return Objects.hash(leftAngle, leftChild, rightAngle, rightChild);
	}

	@Override
	public boolean equals(Object obj) {
		if (this == obj)
			return true;
		if (obj == null)
			return false;
		if (getClass() != obj.getClass())
			return false;
		BinaryTree other = (BinaryTree) obj;
		return Double.doubleToLongBits(leftAngle) == Double.doubleToLongBits(other.leftAngle)
				&& Objects.equals(leftChild, other.leftChild)
				&& Double.doubleToLongBits(rightAngle) == Double.doubleToLongBits(other.rightAngle)
				&& Objects.equals(rightChild, other.rightChild);
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

	public String getCode(int nodeDepth, Map<Integer, String> usedNodesMap) {
		if (this.name.equals("0")) {
			StringBuilder code = new StringBuilder("def get0():\n");
			code.append("\tU = QuantumCircuit(" + nodeDepth + ", name=\"0\")\n");
			if (this.leftProbability==0) {
				code.append("\tU.ry(" + this.leftAngle + ", 0)\n");
				code.append ("\tU.append(get" + this.rightChild.name + "(), [" + this.getTargetQubits(1, nodeDepth) + "])\n");
				code.append("\treturn U.to_gate()\n\n");
			} else if (this.rightProbability==0) {
				code.append("\tU.ry(" + this.leftAngle + ", 0)\n");
				if (usedNodesMap.containsKey(this.leftChild.hashCode()))
					code.append ("\tU.append(get" + this.leftChild.name + "(), [" + this.getTargetQubits(1, nodeDepth) + "])\n");
				code.append("\treturn U.to_gate()\n\n");
			} else {
				code.append("\tU.ry(" + this.leftAngle + ", 0)\n");
				if (usedNodesMap.containsKey(this.leftChild.hashCode())) {
					code.append("\tU.x(0)\n");
					code.append ("\tU.append(get" + this.leftChild.name + "().control(1), [" + this.getTargetQubits(0, nodeDepth) + "])\n");
					code.append("\tU.x(0)\n");
				}
				if (usedNodesMap.containsKey(this.rightChild.hashCode()))
					code.append ("\tU.append(get" + this.rightChild.name + "().control(1), [" + this.getTargetQubits(0, nodeDepth) + "])\n");
				code.append("\treturn U.to_gate()\n\n");
			}
			return code.toString();
		}
		
		if (nodeDepth==2)
			return this.getLeafCode();

		if (this.leftChild==this.rightChild) {
			if (usedNodesMap.get(this.leftChild.hashCode())==null)
				return null;
			
			StringBuilder code = new StringBuilder("def get" + this.name + "():\n");
			code.append("\tU = QuantumCircuit(" + nodeDepth + ", name=\"" + this.name + "\")\n");
			code.append ("\tU.append(get" + this.leftChild.name + "(), [" + this.getTargetQubits(1, nodeDepth) + "])\n");
			code.append("\treturn U.to_gate()\n\n");
			return code.toString();
		}
		
		if (this.rightChild==null) {
			if (usedNodesMap.get(this.leftChild.hashCode())==null) {
				StringBuilder code = new StringBuilder("def get" + this.name + "():\n");
				code.append("\tU = QuantumCircuit(" + nodeDepth + ", name=\"" + this.name + "\")\n");
				code.append("\tU.ry(" + this.leftAngle + ", 0)\n");
				code.append("\treturn U.to_gate()\n\n");
				return code.toString();
			}
			
			StringBuilder code = new StringBuilder("def get" + this.name + "():\n");
			code.append("\tU = QuantumCircuit(" + nodeDepth + ", name=\"" + this.name + "\")\n");
			code.append("\tU.ry(" + this.leftAngle + ", 0)\n");
			code.append("\tU.append(get" + this.leftChild.name + "(), [" + this.getTargetQubits(1, nodeDepth) + "])\n");
			code.append("\treturn U.to_gate()\n\n");
			return code.toString();
		}
		
		if (this.leftChild==null) {
			if (usedNodesMap.get(this.rightChild.hashCode())==null) {
				StringBuilder code = new StringBuilder("def get" + this.name + "():\n");
				code.append("\tU = QuantumCircuit(" + nodeDepth + ", name=\"" + this.name + "\")\n");
				code.append("\tU.ry(" + this.leftAngle + ", 0)\n");
				code.append("\treturn U.to_gate()\n\n");
				return code.toString();
			}
			
			StringBuilder code = new StringBuilder("def get" + this.name + "():\n");
			code.append("\tU = QuantumCircuit(" + nodeDepth + ", name=\"" + this.name + "\")\n");
			code.append("\tU.ry(" + this.leftAngle + ", 0)\n");
			code.append("\tU.append(get" + this.rightChild.name + "(), [" + this.getTargetQubits(1, nodeDepth) + "])\n");
			code.append("\treturn U.to_gate()\n\n");
			return code.toString();
		}
		
		StringBuilder code = new StringBuilder("def get" + this.name + "():\n");
		code.append("\tU = QuantumCircuit(" + nodeDepth + ", name=\"" + this.name + "\")\n");
		if (this.leftAngle!=0) 
			code.append("\tU.ry(" + this.leftAngle + ", 0)\n");
		
		if (usedNodesMap.get(this.leftChild.hashCode())!=null) {
			code.append("\tU.x(0)\n");
			code.append("\tU.append(get" + this.leftChild.name + "().control(1), [0," + this.getTargetQubits(1, nodeDepth) + "])\n");
			code.append("\tU.x(0)\n");
		}
		
		if (usedNodesMap.get(this.rightChild.hashCode())!=null)
			code.append("\tU.append(get" + this.rightChild.name + "().control(1), [0, " + this.getTargetQubits(1, nodeDepth) + "])\n");
		code.append("\treturn U.to_gate()\n\n");
		return code.toString();
	}

	private String getLeafCode() {
		String code = "def get" + this.name + "():\n";
		code+="\tU = QuantumCircuit(2, name=\"" + this.name + "\")\n";
		if (this.leftChild==this.rightChild) {
			if (this.leftAngle!=0)
				code+="\tU.ry(" + this.leftAngle + ", 0)\n";

			if (this.leftChild.leftAngle!=0) {
				code+="\tU.ry(" + this.leftChild.leftAngle + ", 1)\n";
				code+="\treturn U.to_gate()\n\n";
				return code;
			} else 
				return null;
		}
		if (this.rightChild==null) {
			code+="\tU.ry(" + this.leftAngle + ", 0)\n";
			if (this.leftChild.leftAngle!=0)
				code+="\tU.ry(" + this.leftChild.leftAngle + ", 1)\n";
			
			code+="\treturn U.to_gate()\n\n";
			return code;
		}
		if (this.leftChild==null) {
			code+="\tU.ry(" + this.rightAngle + ", 0)\n";
			if (this.rightChild.leftAngle!=0)
				code+="\tU.ry(" + this.rightChild.leftAngle + ", 1)\n";
			
			code+="\treturn U.to_gate()\n\n";
			return code;
		}
		if (this.leftChild.leftAngle==this.rightChild.leftAngle) {
			if (this.leftChild.leftAngle==0)
				return null;
			
			code+="\tU.ry(" + this.leftChild.leftAngle + ", 1)\n";
			code+="\treturn U.to_gate()\n\n";
			return code;
		}
		if (this.leftAngle!=0)
			code+="\tU.ry(" + this.leftAngle + ", 0)\n";
		
		if (this.leftChild.leftAngle!=0) {
			code+="\tU.x(0)\n";
			code+="\tU.cry(" + this.leftChild.leftAngle + ", 0, 1)\n"; 
			code+="\tU.x(0)\n";
		}
		if (this.rightChild.leftAngle!=0)
			code+="\tU.cry(" + this.rightChild.leftAngle + ", 0, 1)\n";
		code+="\treturn U.to_gate()\n\n";
		
		return code;
	}
	
	private String getTargetQubits(int startQubit, int depth) {
		StringBuilder sb = new StringBuilder();
		for (int i=startQubit; i<depth-1; i++)
			sb.append(i + ",");
		sb.append(depth-1);
		return sb.toString();
	}
}
