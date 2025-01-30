package edu.uclm.tp3.genetic.fitnessers;

import java.util.ArrayList;
import java.util.List;

import org.apache.commons.math3.stat.inference.MannWhitneyUTest;

public class MannWhitneyWilcoxonSignedRanKTestFitnesser extends Fitnesser {
	
	public MannWhitneyWilcoxonSignedRanKTestFitnesser() {
		super();
		this.shortName = "MWWSRT";
	}
	
	@Override
	public void setUp() {
		this.maxFitness = 1;
		this.maxError = 1;
		this.expectedFitness = 1-this.desiredError;
	}
	
	@Override
	protected double calculate() {
		
		double[] expectedArray = expected.stream().mapToDouble(i -> i).toArray();
        double[] obtainedArray = obtained.stream().mapToDouble(i -> i).toArray();

        // Realizar el test de Mann-Whitney
        MannWhitneyUTest mannWhitneyUTest = new MannWhitneyUTest();
        double pValue = mannWhitneyUTest.mannWhitneyUTest(expectedArray, obtainedArray);

		double error = 1-pValue;
		er.setError(this.obtainedFrequenciesIndex, error);
		er.setFitnesses(this.obtainedFrequenciesIndex, maxError-error);
		return error;
	}
	
	@Override
	public void setExpected(List<Integer> expected) {
		//this.expected = this.extend(expected);
		this.expected = expected;
	}
	
	@Override
	public void setObtained(List<Integer> obtained) {
		//this.obtained = this.extend(obtained);
		this.obtained = obtained;
	}
	
	private List<Integer> extend(List<Integer> data) {
		int cont = 0;
		int freq;
		List<Integer> result = new ArrayList<>();
		for (int i=0; i<data.size(); i++) {
			freq = data.get(i);
			for (int j=0; j<freq; j++)
				result.add(cont);
			cont++;
		}
		return result;
	}

	@Override
	public Fitnesser copy(int obtainedFrequenciesIndex) {
		MannWhitneyWilcoxonSignedRanKTestFitnesser result = new MannWhitneyWilcoxonSignedRanKTestFitnesser();
		result.shots = this.shots;
		result.desiredError = this.desiredError;
		result.obtainedFrequenciesIndex = obtainedFrequenciesIndex;
		result.expected = this.expected;
		return result;
	}
}
