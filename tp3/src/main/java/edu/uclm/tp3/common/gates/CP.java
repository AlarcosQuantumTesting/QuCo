package edu.uclm.tp3.common.gates;

import edu.uclm.tp3.Complex;
import edu.uclm.tp3.sparse.QMatrix;

public class CP extends TwoQubitsGate {
	
	@Override
	public String toString() {
		return "cp(pi/2, " + this.qubit0 + ", " + this.qubit1 + ")\n";
	}
	
	@Override
	public edu.uclm.tp3.sparse.QMatrix getMatrix() {
		QMatrix m = new QMatrix();
		m.setValues(
				1.0, 0.0, 0.0, 0.0,
				0.0, 1.0, 0.0, 0.0,
				0.0, 0.0, 1.0, 0.0,
				0.0, 0.0, 0.0, 0.0
				);
		m.set(3, 3, new Complex(Math.cos(Math.PI/2), Math.sin(Math.PI/2)));
		return m;
	}
}
