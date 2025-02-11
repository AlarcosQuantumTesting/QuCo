package edu.uclm.tp3.common.gates;

import edu.uclm.tp3.sparse.QMatrix;

public class RY extends OneQubitGate implements IRotableGate {

	public RY() {
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
			Math.cos(this.angle/2), -Math.sin(this.angle/2),
			Math.sin(this.angle/2), Math.cos(this.angle/2)
		);
		return m;
	}

	@Override
	public IRotableGate smallRotation(double radians) {
		this.angle += radians;
		return this;
	}
}
