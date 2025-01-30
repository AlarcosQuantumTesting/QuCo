package edu.uclm.tp3.common.model;

import java.io.Serializable;

@SuppressWarnings("serial")
public class Pair implements Serializable, Comparable<Pair> {
	
	public int index;
	public double fitness;
	
	public Pair(int index, double fitness) {
		super();
		this.index = index;
		this.fitness = fitness;
	}

	@Override
	public int compareTo(Pair o) {
		if (this.fitness>o.fitness)
			return 1;
		else if (this.fitness<o.fitness)
			return -1;
		else
			return 0;
	}
}