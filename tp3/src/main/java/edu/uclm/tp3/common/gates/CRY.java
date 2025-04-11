package edu.uclm.tp3.common.gates;

import edu.uclm.tp3.sparse.QMatrix;

public class CRY extends TwoQubitsGate implements IRotableGate {

	private double theta;

	public CRY() {
		super();
		this.theta = Math.PI/2;
	}

	@Override
	public String toString() {
		return "cry(" + this.theta + ", " + this.qubit0 + ", " + this.qubit1 + ")\n";
	}

	public CRY setTheta(double theta) {
		this.theta = theta;
		return this;
	}

	public double getTheta() {
		return theta;
	}

	@Override
	public QMatrix getMatrix() {
		QMatrix m = new QMatrix();
		m.setValues(
				1.0, 0.0, 0.0, 0.0, 
				0.0, 1, 0, 0,
				0.0, 0.0, Math.cos(theta/2), -Math.sin(theta/2),
				0, 0, Math.sin(theta/2), Math.cos(theta/2));
		return m;
	}

	@Override
	public IRotableGate smallRotation(double radians) {
		this.theta += radians;
		return this;
	}
}
