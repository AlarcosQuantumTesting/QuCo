package edu.uclm.tp3.common.model;

import org.json.JSONArray;
import org.json.JSONObject;

public class History {

	private String fitnesserName;
	private int meanFitnessDecrements;
	private int bestFitnessDecrements;
	private int bestGeneration;
	private int bestIndividual;
	private double bestFitness;
	private double lastBestFitness;
	private double lastMeanFitness;
	
	private double[] fitnesses;
	private int fitnesserIndex;
	
	public History() {
	}
	
	public History(JSONObject jso) {
		this.fitnesserName = jso.getString("fitnesserName");
		this.meanFitnessDecrements = jso.getInt("meanFitnessDecrements");
		this.bestFitnessDecrements = jso.getInt("bestFitnessDecrements");
		this.bestGeneration = jso.getInt("bestGeneration");
		this.bestIndividual = jso.getInt("bestIndividual");
		this.bestFitness = jso.getDouble("bestFitness");
		this.lastBestFitness = jso.getDouble("lastBestFitness");
		this.lastMeanFitness = jso.getDouble("lastMeanFitness");
		JSONArray jsaFitnesses = jso.getJSONArray("fitnesses");
		this.fitnesses = new double[jsaFitnesses.length()];
		for (int i=0; i<jsaFitnesses.length(); i++)
			this.fitnesses[i] = jsaFitnesses.getDouble(i);
	}

	public int getMeanFitnessDecrements() {
		return meanFitnessDecrements;
	}
	
	public void setMeanFitnessDecrements(int meanFitnessDecrements) {
		this.meanFitnessDecrements = meanFitnessDecrements;
	}
	
	public int getBestFitnessDecrements() {
		return bestFitnessDecrements;
	}
	
	public void setBestFitnessDecrements(int bestFitnessDecrements) {
		this.bestFitnessDecrements = bestFitnessDecrements;
	}
	
	public int getBestGeneration() {
		return bestGeneration;
	}
	
	public void setBestGeneration(int bestGeneration) {
		this.bestGeneration = bestGeneration;
	}
	
	public int getBestIndividual() {
		return bestIndividual;
	}
	
	public void setBestIndividual(int bestIndividual) {
		this.bestIndividual = bestIndividual;
	}
	
	public double getLastBestFitness() {
		return lastBestFitness;
	}
	
	public void setLastBestFitness(double lastBestFitness) {
		this.lastBestFitness = lastBestFitness;
	}
	
	public double[] getFitnesses() {
		return fitnesses;
	}
	
	public void setFitnesses(double[] fitnesses) {
		this.fitnesses = fitnesses;
	}
	
	public void setBestFitness(double bestFitness) {
		this.bestFitness = bestFitness;
	}
	
	public double getBestFitness() {
		return bestFitness;
	}
	
	public void setLastMeanFitness(double lastMeanFitness) {
		this.lastMeanFitness = lastMeanFitness;
	}
	
	public double getLastMeanFitness() {
		return lastMeanFitness;
	}

	public void increaseBestFitnessDecrements() {
		this.bestFitnessDecrements++;
	}
	
	public void increaseMeanFitnessDecrements() {
		this.meanFitnessDecrements++;
	}

	public void setFitnesserName(String fitnesserName) {
		this.fitnesserName = fitnesserName;
	}
	
	public String getFitnesserName() {
		return fitnesserName;
	}

	public void setFitnesserIndex(int index) {
		this.fitnesserIndex = index;
	}
	
	public int getFitnesserIndex() {
		return fitnesserIndex;
	}
}
