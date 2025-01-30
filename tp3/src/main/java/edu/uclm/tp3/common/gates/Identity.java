package edu.uclm.tp3.common.gates;

import edu.uclm.tp3.sparse.QMatrix;

public class Identity extends OneQubitGate {
	
	@Override
	public String toString() {
		return "id(" + this.qubit + ")\n";
	}
	
	@Override
	public edu.uclm.tp3.sparse.QMatrix getMatrix() {
		QMatrix m = new QMatrix();
		m.setValues(
			1.0, 0.0,
			0.0, 1.0
		);
		return m;
	}
}
