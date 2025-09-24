package edu.uclm.tp3.genetic.fitnessers;

import java.util.List;
import java.util.Map;

import edu.uclm.tp3.common.model.ExecutionResults;
import edu.uclm.tp3.parallel.Task;
import edu.uclm.tp3.parallel.TaskData;
import edu.uclm.tp3.parallel.TaskReceptor;

public abstract class Fitnesser implements Task {
	
	private int index;
	protected String shortName;
	protected double maxFitness;
	protected double maxError;
	protected double expectedFitness;

	protected int shots;
	protected double desiredError;
	protected boolean circuitLengthRequired;
	private double error;
	protected List<Integer> expected;
	protected List<Integer> obtained;
	
	protected int obtainedFrequenciesIndex;
	protected ExecutionResults er;
	protected int populationSize;
	protected int circuitLength;
	private TaskReceptor target;

	protected abstract double calculate();
	
	public abstract void setUp();
	
	public double getMaxError() {
		return this.maxError;
	}

	@Override
	public void run() {
		this.error = this.calculate();		
	}
	
	public double getError() {
		return error;
	}
	
	public abstract void setExpected(List<Integer> expected);
	
	public abstract void setObtained(List<Integer> obtained);

	public void setMaxFitness(double maxFitness) {
		this.maxFitness = maxFitness;
	}
	
	public double getMaxFitness() {
		return maxFitness;
	}

	public void setExpectedFitness(double expectedFitness) {
		this.expectedFitness = expectedFitness;
	}
	
	public double getExpectedFitness() {
		return this.expectedFitness;
	}

	public String getShortName() {
		return shortName;
	}

	public void setShortName(String shortName) {
		this.shortName = shortName;
	}

	public void setIndex(int index) {
		this.index = index;
	}
	
	public int getIndex() {
		return index;
	}

	public int getShots() {
		return shots;
	}

	public void setShots(int shots) {
		this.shots = shots;
	}

	public double getDesiredError() {
		return desiredError;
	}

	public void setDesiredError(double desiredError) {
		this.desiredError = desiredError;
	}

	public void setError(double error) {
		this.error = error;
	}

	public abstract Fitnesser copy(int obtainedFrequenciesIndex);
	
	public int getObtainedFrequenciesIndex() {
		return obtainedFrequenciesIndex;
	}

	public void setExecutionResult(ExecutionResults er) {
		this.er = er;
	}

	public void setPopulationSize(int populationSize) {
		this.populationSize = populationSize;
	}

	public int getPopulationSize() {
		return populationSize;
	}
	
	public void setCircuitLengthRequired(boolean circuitLengthRequired) {
		this.circuitLengthRequired = circuitLengthRequired;
	}
	
	public boolean isCircuitLengthRequired() {
		return circuitLengthRequired;
	}

	public void setCircuitLengthRequired(int circuitLength) {
		this.circuitLength = circuitLength;
	}
	
	public void setTarget(TaskReceptor target) {
		this.target = target;
	}
	
	@SuppressWarnings("unchecked")
	@Override
	public void prepare(Task originalTask, TaskData taskData, int index) {
		Fitnesser original = (Fitnesser) originalTask;
		this.setExecutionResult((ExecutionResults) this.target);
		this.shots = original.shots;
		this.desiredError = original.desiredError;
		this.obtainedFrequenciesIndex = index;
		this.expected = original.expected;
		Map<String, Object> data = (Map<String, Object>) taskData.getData();
		List<Integer> obtained = ((List<List<Integer>>) data.get("frequencies")).get(index);
		this.setObtained(obtained);
		int circuitLength = ((List<Integer>) data.get("circuitLengths")).get(index);
		this.er.setLength(index, circuitLength);
		this.circuitLengthRequired = original.circuitLengthRequired;
		this.setUp();
	}
}
