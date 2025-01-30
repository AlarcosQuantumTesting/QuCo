package edu.uclm.tp3.common.deterministic;

import java.io.IOException;
import java.util.Map;

import edu.uclm.tp3.common.gates.Barrier;
import edu.uclm.tp3.common.gates.CRY;
import edu.uclm.tp3.common.gates.Identity;
import edu.uclm.tp3.common.gates.RY;
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
	
	protected RY getRY(int qubit, BinaryTree node, boolean towardsZero) {
		RY ry = new RY();
		double theta = 0;
		
		if (DEBUG)
			theta = towardsZero ? -node.leftProbability : node.leftProbability;
		else {
			//if (towardsZero && node.leftProbability==1)
			//	return null;
			theta = towardsZero ? node.leftAngle : node.rightAngle;
		}
		
		ry.setTheta(theta-Math.PI/2, qubit);
		return ry;
	}
	
	protected X getX(int qubit) {
		X x = new X();
		x.setQubit(qubit);
		return x;
	}
	
	protected Identity getIdentity(int qubit) {
		Identity id = new Identity();
		id.setQubit(qubit);
		if (PRINT)
			System.out.print(id);
		return id;
	}
	
	protected CRY getCRY(int controlQubit, int controlledQubit, BinaryTree node, boolean towardsZero) {
		CRY cry = new CRY();
		cry.set(0, controlQubit);
		cry.set(1, controlledQubit);
		double theta = 0;
		
		if (DEBUG)
			theta = towardsZero ? -node.leftProbability : node.rightProbability;
		else 
			theta = towardsZero ? node.leftAngle : node.rightAngle;
		
		cry.setTheta(theta-Math.PI/2);
		return cry;
	}
    
	protected Barrier getBarrier() {
    	Barrier barrier = new Barrier();
    	return barrier;
    }
	
	protected String getMeasures(int qubits) {
		StringBuilder sb = new StringBuilder();
		for (int i=0; i<qubits; i++)
			sb.append("circuit.measure(" + i + ", " + (qubits-i-1) + ")\n");
		return sb.toString();
	}

	protected abstract Map<String, Object> solve(int shots) throws IOException;
}
