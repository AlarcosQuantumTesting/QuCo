package edu.uclm.tp3.common.deterministic;

import java.io.IOException;
import java.util.Map;

import edu.uclm.tp3.common.gates.X;
import edu.uclm.tp3.common.model.Circuit;

public abstract class Solver {
	
	static final boolean DEBUG = false; 
	static final boolean PRINT = true; 

	protected BinaryTree tree;
	protected Circuit circuit;

	protected Solver(BinaryTree tree, Circuit circuit) {
		this.tree = tree;
		this.circuit = circuit;
	}
	
	protected void addMirror(Circuit circuit) {
		for (int i=circuit.getGates().size()-2; i>=0; i--)
			circuit.add(circuit.getGates().get(i));
	}
	
	protected X getX(int qubit) {
		X x = new X();
		x.setQubit(qubit);
		return x;
	}
	
	protected String getMeasures(int qubits) {
		StringBuilder sb = new StringBuilder();
		for (int i=0; i<qubits; i++)
			sb.append("circuit.measure(" + i + ", " + (qubits-i-1) + ")\n");
		return sb.toString();
	}

	protected abstract Map<String, Object> solve(int shots) throws IOException;
}
