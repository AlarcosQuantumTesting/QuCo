package edu.uclm.tp3.common.gates;

import edu.uclm.tp3.sparse.QMatrix;

public class CX extends TwoQubitsGate {
	
	@Override
	public String toString() {
		return "cx(" + this.qubit0 + ", " + this.qubit1 + ")\n";
	}
	
	@Override
	public edu.uclm.tp3.sparse.QMatrix getMatrix() {
		QMatrix m = new QMatrix();
		m.setValues(
				1.0, 0.0, 0.0, 0.0,
				0.0, 1.0, 0.0, 0.0,
				0.0, 0.0, 0.0, 1.0,
				0.0, 0.0, 1.0, 0.0
				);
		return m;
	}
}
