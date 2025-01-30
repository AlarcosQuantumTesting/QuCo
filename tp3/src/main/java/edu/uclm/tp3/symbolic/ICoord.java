package edu.uclm.tp3.symbolic;

import edu.uclm.tp3.Complex;

public abstract class ICoord {
	protected Complex factor;
	
	public ICoord(Complex factor) {
		this.factor = factor;
	}
	
	public ICoord(double factor) {
		this(new Complex(factor, 0));
	}	

	public final Complex getFactor() {
		return this.factor;
	}
	
	public void setFactor(Complex factor) {
		this.factor = factor;
	}
}
