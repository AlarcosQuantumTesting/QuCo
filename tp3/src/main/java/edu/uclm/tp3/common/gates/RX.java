package edu.uclm.tp3.common.gates;

import edu.uclm.tp3.Complex;
import edu.uclm.tp3.sparse.QMatrix;

public class RX extends OneQubitGate {

	@Override
	public String toString() {
		return "rx(pi/2, " + this.qubit + ")\n";
	}
	
	@Override
	public edu.uclm.tp3.sparse.QMatrix getMatrix() {
		QMatrix m = new QMatrix();
		m.set(0, 0, Math.cos(Math.PI/2));
		m.set(0, 1, new Complex(0, -Math.sin(Math.PI/2)));
		m.set(1, 0, new Complex(0, -Math.sin(Math.PI/2)));
		m.set(2, 2, Math.cos(Math.PI/2));
		return m;
	}
}
