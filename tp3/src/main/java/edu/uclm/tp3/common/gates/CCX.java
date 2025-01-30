package edu.uclm.tp3.common.gates;

import edu.uclm.tp3.sparse.QMatrix;

@SuppressWarnings("serial")
public class CCX extends ThreeQubitsGate {
	
	@Override
	public String toString() {
		return "ccx(" + this.qubit0 + ", " + this.qubit1 + ", " + this.qubit2 + ")\n";
	}
	
	@Override
	public edu.uclm.tp3.sparse.QMatrix getMatrix() {
		QMatrix m = new QMatrix();
		m.setValues(
				1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
				0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
				0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0,
				0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0,
				0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0,
				0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0,
				0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0,
				0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0
				);
		return m;
	}
}
