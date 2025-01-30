package edu.uclm.tp3.common.gates;

import edu.uclm.tp3.Complex;
import edu.uclm.tp3.sparse.QMatrix;

@SuppressWarnings("serial")
public class CZ extends TwoQubitsGate {
	
	@Override
	public String toString() {
		return "cz(" + this.qubit0 + ", " + this.qubit1 + ")\n";
	}
	
	@Override
	public edu.uclm.tp3.sparse.QMatrix getMatrix() {
		QMatrix m = new QMatrix();
		m.setValues(
			0.0, 0.0,
			0.0, 0.0
		);
		m.set(0,  1, new Complex(0, -1));
		m.set(1,  0, new Complex(0, 1));
		return m;
	}
}
