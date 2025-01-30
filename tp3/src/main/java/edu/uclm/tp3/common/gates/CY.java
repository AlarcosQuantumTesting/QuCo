package edu.uclm.tp3.common.gates;

import edu.uclm.tp3.Complex;
import edu.uclm.tp3.sparse.QMatrix;

public class CY extends TwoQubitsGate {
	
	@Override
	public String toString() {
		return "cy(" + this.qubit0 + ", " + this.qubit1 + ")\n";
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
		m.set(2,  3, new Complex(0, -1));
		m.set(3,  2, new Complex(0, 1));
		return m;
	}
}
