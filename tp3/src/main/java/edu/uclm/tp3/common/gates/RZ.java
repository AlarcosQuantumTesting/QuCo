package edu.uclm.tp3.common.gates;

import edu.uclm.tp3.Complex;
import edu.uclm.tp3.sparse.QMatrix;

public class RZ extends OneQubitGate implements IRotableGate {

	public RZ() {
		super();
		this.angle = Math.PI/2;
	}

	@Override
	public String toString() {
		if (this.angle==Math.PI/2)
			return "rx(pi/2, " + this.qubit + ")\n";
		return "rx(" + this.angle + ", " + this.qubit + ")\n";
	}

	public void setTheta(double theta) {
		this.angle = theta;
	}
	
	
	@Override
	public edu.uclm.tp3.sparse.QMatrix getMatrix() {
		QMatrix m = new QMatrix();
		m.setValues(
			0.0, 0.0,
			0.0, 0.0
		);
		m.set(0, 0, new Complex(Math.cos(this.angle), -Math.sin(this.angle)));
		m.set(1, 1, new Complex(Math.cos(this.angle), Math.sin(this.angle)));
		return m;
	}

	@Override
	public IRotableGate smallRotation(double radians) {
		this.angle += radians;
		return this;
	}
}
