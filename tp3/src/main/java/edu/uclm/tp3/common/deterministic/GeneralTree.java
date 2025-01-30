package edu.uclm.tp3.common.deterministic;

import java.util.ArrayList;
import java.util.List;

public class GeneralTree {
	
	String name;
    int value;
    int leftFreq;
    int rightFreq;
    double leftProbability, rightProbability;
    double leftAngle, rightAngle;
    
    GeneralTree parent;
    List<GeneralTree> children;
    
    public GeneralTree() {
		this.value = -1;
		this.name = "";
		this.children = new ArrayList<>();
	}

	public void build(BinaryTree tree) {
		// TODO Auto-generated method stub
		
	}
    
    


}
