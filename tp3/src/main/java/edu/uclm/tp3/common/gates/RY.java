package edu.uclm.tp3.common.gates;

import edu.uclm.tp3.sparse.QMatrix;

public class RY extends OneQubitGate {
	
	private String code;
	private double theta;

	public RY() {
		this.code = "ry(pi/2, " + this.qubit + ")\n"; 
	}

	@Override
	public String toString() {
		return this.code;
	}

	public void setTheta(double theta, int qubit) {
		this.theta = theta;
		this.code = "ry(" + theta + ", " + qubit + ")\n";
	}
	
	@Override
	public edu.uclm.tp3.sparse.QMatrix getMatrix() {
		QMatrix m = new QMatrix();
		m.setValues(
			Math.cos(theta/2), -Math.sin(theta/2),
			Math.sin(theta/2), Math.cos(theta/2)
		);
		return m;
	}
}
