package edu.uclm.tp3.common.gates;

import edu.uclm.tp3.classic.QMatrix;

public class Barrier extends OneQubitGate {

	@Override
	public String toString() {
		return "barrier()\n";
	}

	@Override
	public edu.uclm.tp3.sparse.QMatrix getMatrix() {
		return null;
	}
}
