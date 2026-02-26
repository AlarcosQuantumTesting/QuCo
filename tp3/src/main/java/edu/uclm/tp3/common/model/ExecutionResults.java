package edu.uclm.tp3.common.model;

import java.io.Serializable;
import java.util.List;

import edu.uclm.tp3.common.strategies.Strategy;
import edu.uclm.tp3.parallel.TaskReceptor;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@SuppressWarnings("serial")
@JsonIgnoreProperties(ignoreUnknown = true)
public class ExecutionResults implements Serializable, TaskReceptor {
	private int fitnesserIndex;
	private double[] errors;
	private double[] fitnesses;
	private int[] lengths;
	private int[][] gotFrequencies;
	private boolean[] selecteds;
	private double bestFitness;
	private int bestIndividual;
	private double[] selectionProbabilities;
	private double meanError;
	private double meanFitness;
	private String strategy;
	private int iterationIndex;
	private String initials;

	public ExecutionResults() {
	}

	public ExecutionResults(int individuals, int numberOfOutputs) {
		this.errors = new double[individuals];
		this.fitnesses = new double[individuals];
		this.lengths = new int[individuals];
		this.gotFrequencies = new int[individuals][numberOfOutputs];
		this.selecteds = new boolean[individuals];
		this.selectionProbabilities = new double[individuals];
	}

	public synchronized void setGotFrequencies(int individual, List<Integer> frequencies) {
		for (int j = 0; j < frequencies.size(); j++)
			this.gotFrequencies[individual][j] = frequencies.get(j);
	}

	public void setSelecteds(int individual, boolean selected) {
		this.selecteds[individual] = selected;
	}

	public void setBestFitness(double bestFitness) {
		this.bestFitness = bestFitness;
	}

	public void setBestIndividual(int bestIndividual) {
		this.bestIndividual = bestIndividual;
	}

	public void setMeanError(double meanError) {
		this.meanError = meanError;
	}

	public void setMeanFitness(double meanFitness) {
		this.meanFitness = meanFitness;
	}

	public double[] getErrors() {
		return errors;
	}

	public double getError(int individual) {
		return errors[individual];
	}

	public synchronized void setError(int individual, double error) {
		this.errors[individual] = error;
	}

	public double getFitness(int individual) {
		return this.fitnesses[individual];
	}

	public synchronized void setFitnesses(int individual, double fitness) {
		this.fitnesses[individual] = fitness;
	}

	public synchronized void setLength(int individual, int length) {
		this.lengths[individual] = length;
	}

	public double[] getFitnesses() {
		return fitnesses;
	}

	public int[][] getGotFrequencies() {
		return gotFrequencies;
	}

	public void setGotFrequencies(int individual, int[] frequencies) {
		this.gotFrequencies[individual] = frequencies;
	}

	public boolean[] getSelecteds() {
		return selecteds;
	}

	public double[] getSelectionProbabilities() {
		return selectionProbabilities;
	}

	public void setSelectionProbability(int individual, double selectionProbabilities) {
		this.selectionProbabilities[individual] = selectionProbabilities;
	}

	public double getBestFitness() {
		return bestFitness;
	}

	public int getBestIndividual() {
		return bestIndividual;
	}

	public double getMeanError() {
		return meanError;
	}

	public double getMeanFitness() {
		return meanFitness;
	}

	public void setStrategy(Strategy strategy) {
		this.strategy = strategy.getClass().getSimpleName();
		this.initials = strategy.getInitials();
	}

	public String getInitials() {
		return initials;
	}

	public void setStrategy(String strategy) {
		this.strategy = strategy;
	}

	public String getStrategy() {
		return strategy;
	}

	public int size() {
		return this.fitnesses.length;
	}

	public void setIterationIndex(int iterationIndex) {
		this.iterationIndex = iterationIndex;
	}

	public int getIterationIndex() {
		return iterationIndex;
	}

	public void setFitnesserIndex(int fitnesserIndex) {
		this.fitnesserIndex = fitnesserIndex;
	}

	public int getFitnesserIndex() {
		return fitnesserIndex;
	}

	public void setLengths(int[] lengths) {
		this.lengths = lengths;
	}

	public int[] getLengths() {
		return lengths;
	}
}
