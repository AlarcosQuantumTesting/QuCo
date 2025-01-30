package edu.uclm.tp3.genetic.fitnessers;

import java.util.List;

public class SimpleFitnesser extends Fitnesser {
	
	private int maxDeviation;

	public SimpleFitnesser() {
		super();
		this.shortName = "SimpleFitnesser";
		this.circuitLengthRequired = true;
	}
	
	@Override
	public void setUp() {
		int minFreq = Integer.MAX_VALUE;
		int minFreqIndex = 0;
		for (int i=0; i<this.expected.size(); i++) {
			if (this.expected.get(i)<minFreq) {
				minFreq = this.expected.get(i);
				minFreqIndex = i;
			}
		}
		
		this.maxDeviation = 0;
		int expectedFreq;
		for (int i=0; i<this.expected.size(); i++) {
			expectedFreq = this.expected.get(i);
			if (i==minFreqIndex) {
				this.maxDeviation = this.maxDeviation + this.shots - expectedFreq;
			} else {
				this.maxDeviation = this.maxDeviation + expectedFreq;
			}
		}
		
		this.maxFitness = 1;
		this.maxError = 1;
		this.expectedFitness = 1 - this.desiredError;
	}
	
	@Override
	protected double calculate() {
		double error = 0;
		for (int i=0; i<expected.size(); i++)
			error = error + Math.abs(expected.get(i) - obtained.get(i));

		error = error/this.maxDeviation;
		double fitness = 1 - error;  
		error = Math.round(error*100.0)/100.0;
		fitness = Math.round(fitness*100.0)/100.0;
		er.setError(this.obtainedFrequenciesIndex, error);
		er.setFitnesses(this.obtainedFrequenciesIndex, fitness);

		return error;
	}
	
	@Override
	public void setExpected(List<Integer> expected) {
		this.expected = expected;
	}
	
	@Override
	public void setObtained(List<Integer> obtained) {
		this.obtained = obtained;
	}

	@Override
	public Fitnesser copy(int obtainedFrequenciesIndex) {
		SimpleFitnesser result = new SimpleFitnesser();
		result.shots = this.shots;
		result.desiredError = this.desiredError;
		result.obtainedFrequenciesIndex = obtainedFrequenciesIndex;
		result.setExpected(this.expected);
		return result;
	}
}
