package edu.uclm.tp3.genetic.fitnessers;

import java.util.ArrayList;
import java.util.List;

import org.apache.commons.math3.stat.correlation.SpearmansCorrelation;

public class SpearmanFitnesser extends Fitnesser {
	
	public SpearmanFitnesser() {
		super();
		this.shortName = "KlomgorovSmirnov";
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

        // Realizar el test de Kolmogorov Smirnov
        SpearmansCorrelation spearmansCorrelation = new SpearmansCorrelation();
        double correlation = spearmansCorrelation.correlation(expectedArray, obtainedArray);

        // Calcular el fitness (1 - D)
        double fitness = (correlation + 1) / 2;
        double error = 1-fitness;
        
		er.setError(this.obtainedFrequenciesIndex, error);
		er.setFitnesses(this.obtainedFrequenciesIndex, fitness);
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
		SpearmanFitnesser result = new SpearmanFitnesser();
		result.shots = this.shots;
		result.desiredError = this.desiredError;
		result.obtainedFrequenciesIndex = obtainedFrequenciesIndex;
		result.expected = this.expected;
		return result;
	}
}
