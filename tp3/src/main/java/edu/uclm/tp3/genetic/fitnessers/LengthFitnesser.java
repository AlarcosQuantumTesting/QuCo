package edu.uclm.tp3.genetic.fitnessers;

import java.util.List;

public class LengthFitnesser extends Fitnesser {
	
	private final static int maxLength = 100;
	
	public LengthFitnesser() {
		super();
		this.shortName = "Length Fitnesser";
	}
	
	@Override
	public void setUp() {
		this.maxFitness = 0.1*maxLength + 0.9*2 * this.shots;
		this.maxError = this.maxFitness;		
		this.expectedFitness = (1-this.desiredError)*this.maxFitness;
	}
	
	@Override
	protected double calculate() {
		double error = 0;
		for (int i=0; i<expected.size(); i++)
			error = error + Math.abs(expected.get(i) - obtained.get(i));

		error = 0.5*this.circuitLength + 0.5*error;
		er.setError(this.obtainedFrequenciesIndex, error);
		
		er.setFitnesses(this.obtainedFrequenciesIndex, maxError-error);

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
		LengthFitnesser result = new LengthFitnesser();
		result.shots = this.shots;
		result.desiredError = this.desiredError;
		result.obtainedFrequenciesIndex = obtainedFrequenciesIndex;
		result.setCircuitLengthRequired(true);
		result.setExpected(this.expected);
		return result;
	}
	
	@Override
	public boolean isCircuitLengthRequired() {
		return true;
	}
}
