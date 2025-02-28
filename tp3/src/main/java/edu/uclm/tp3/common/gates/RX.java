package edu.uclm.tp3.common.gates;

import edu.uclm.tp3.Complex;
import edu.uclm.tp3.sparse.QMatrix;

public class RX extends OneQubitGate implements IRotableGate {

	public RX() {
		super();
		this.angle = Math.PI/2;
	}

	@Override
	public String toString() {
		if (this.angle==Math.PI/2)
			return "rx(pi/2, " + this.qubit + ")\n";
		return "rx(" + this.angle + ", " + this.qubit + ")\n";
	}
	
	@Override
	public QMatrix getMatrix() {
		QMatrix m = new QMatrix();
		m.set(0, 0, Math.cos(this.angle));
		m.set(0, 1, new Complex(0, -Math.sin(this.angle)));
		m.set(1, 0, new Complex(0, -Math.sin(this.angle)));
		m.set(2, 2, Math.cos(this.angle));
		return m;
	}

	@Override
	public IRotableGate smallRotation(double radians) {
		this.angle += radians;
		return this;
	}
}
