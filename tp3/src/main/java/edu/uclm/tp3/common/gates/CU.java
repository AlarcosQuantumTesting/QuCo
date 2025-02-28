package edu.uclm.tp3.common.gates;

import edu.uclm.tp3.common.services.EvolutionaryService;
import edu.uclm.tp3.sparse.QMatrix;

public class CU extends TwoQubitsGate implements IRotableGate {

	private double[] angles = new double[4];

	public CU() {
		super();
		for (int i=0; i<4; i++)
			this.angles[i] = Math.PI/2;
	}
		
	@Override
	public String toString() {
		return "cu(" + this.angles[0] + ", " + this.angles[1] + ", " + this.angles[2] + ", "  + this.angles[3] + ", " + this.qubit0 + ", " + this.qubit1 + ")\n";
	}
	
	@Override
	public edu.uclm.tp3.sparse.QMatrix getMatrix() {
		QMatrix m = new QMatrix();
		m.setValues(
			1.0, 0.0, 0.0, 0.0,
			0.0, 0.0, 0.0, 0.0,
			0.0, 0.0, 1.0, 0.0, 
			0.0, 0.0, 0.0, 0.0
		);		
		return m;
	}

	@Override
	public IRotableGate smallRotation(double radians) {
		int i = EvolutionaryService.dado.nextInt(this.angles.length);
		this.angles[i] += radians;
		return this;
	}
}
