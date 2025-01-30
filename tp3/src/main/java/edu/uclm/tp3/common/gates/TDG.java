package edu.uclm.tp3.common.gates;

import edu.uclm.tp3.Complex;
import edu.uclm.tp3.sparse.QMatrix;

public class TDG extends OneQubitGate {
	
	@Override
	public String toString() {
		return "tdg(" + this.qubit + ")\n";
	}
	
	@Override
	public edu.uclm.tp3.sparse.QMatrix getMatrix() {
		QMatrix m = new QMatrix();
		m.setValues(
			1.0, 0.0,
			0.0, 0.0
		);
		m.set(1, 1, new Complex(Math.cos(Math.PI/4), -Math.sin(Math.PI/4)));
		return m;
	}
}
