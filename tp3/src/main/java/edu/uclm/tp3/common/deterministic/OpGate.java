package edu.uclm.tp3.common.deterministic;

public abstract class OpGate {
	
	protected double prob;
	double angle;
	OpGate next;

	protected OpGate(double prob) {
		this.prob = prob;
		this.angle = 2*Math.acos(Math.sqrt(prob)) - Math.PI/2;
	}
}
