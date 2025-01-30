package edu.uclm.tp3.common.gates;

import edu.uclm.tp3.sparse.QMatrix;

@SuppressWarnings("serial")
public class H extends OneQubitGate {
	
	@Override
	public String toString() {
		return "h(" + this.qubit + ")\n";
	}
	
	@Override
	public edu.uclm.tp3.sparse.QMatrix getMatrix() {
		QMatrix m = new QMatrix();
		m.setValues(
			1/Math.sqrt(2), 1/Math.sqrt(2), 
			1/Math.sqrt(2), -1/Math.sqrt(2)
		);
		return m;
	}
}
