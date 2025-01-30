package edu.uclm.tp3.common.gates;

import edu.uclm.tp3.classic.QMatrix;

public class U extends OneQubitGate {
	
	@Override
	public String toString() {
		return "u(pi/2, pi/4, pi/8, " + this.qubit + ")\n";
	}
	
	@Override
	public edu.uclm.tp3.sparse.QMatrix getMatrix() {
		// TODO Auto-generated method stub
		return null;
	}
}
