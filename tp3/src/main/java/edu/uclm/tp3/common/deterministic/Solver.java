package edu.uclm.tp3.common.deterministic;

import java.io.IOException;
import java.util.Map;

import edu.uclm.tp3.common.gates.X;

public abstract class Solver {
	
	static final boolean DEBUG = false; 
	static final boolean PRINT = true; 

	protected BinaryTree tree;
	protected GRCircuit circuit;

	protected Solver(BinaryTree tree, GRCircuit circuit) {
		this.tree = tree;
		this.circuit = circuit;
	}
	
	protected X getX(int qubit) {
		X x = new X();
		x.setQubit(qubit);
		return x;
	}

	public abstract Map<String, Object> solve(int shots) throws IOException;
}
