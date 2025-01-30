package edu.uclm.tp3.common.gates;

import edu.uclm.tp3.Complex;
import edu.uclm.tp3.sparse.QMatrix;

public class S extends OneQubitGate {
	
	@Override
	public String toString() {
		return "s(" + this.qubit + ")\n";
	}
	
	@Override
	public edu.uclm.tp3.sparse.QMatrix getMatrix() {
		QMatrix m = new QMatrix();
		m.setValues(
			1.0, 0.0,
			0.0, 0.0
		);
		m.set(1, 1, new Complex(0, 1));
		return m;
	}
}
