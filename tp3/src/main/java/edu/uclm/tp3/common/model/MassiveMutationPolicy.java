package edu.uclm.tp3.common.model;

public class MassiveMutationPolicy {
	
	private int fallsThreshold;  // Número de caídas tras las que se aplica
	
	private boolean applicableWhenMeanFitnessFalls;
	private boolean applicableWhenBestFitnessFalls;
	
	private double fitnessPercentage;  // Aplicar cuando el mejor fitness supere este porcentaje del fitness deseado
	
	private int maxConsecutiveApplications;
	private int counter;
	
	public int getFallsThreshold() {
		return fallsThreshold;
	}
	
	public void setFallsThreshold(int fallsThreshold) {
		this.fallsThreshold = fallsThreshold;
	}
	
	public boolean isApplicableWhenMeanFitnessFalls() {
		return applicableWhenMeanFitnessFalls;
	}
	
	public void setApplicableWhenMeanFitnessFalls(boolean applicableWhenMeanFitnessFalls) {
		this.applicableWhenMeanFitnessFalls = applicableWhenMeanFitnessFalls;
	}
	
	public boolean isApplicableWhenBestFitnessFalls() {
		return applicableWhenBestFitnessFalls;
	}
	
	public void setApplicableWhenBestFitnessFalls(boolean applicableWhenBestFitnessFalls) {
		this.applicableWhenBestFitnessFalls = applicableWhenBestFitnessFalls;
	}
	
	public double getFitnessPercentage() {
		return fitnessPercentage;
	}
	
	public void setFitnessPercentage(double fitnessPercentage) {
		this.fitnessPercentage = fitnessPercentage;
	}
	
	public int getMaxConsecutiveApplications() {
		return maxConsecutiveApplications;
	}
	
	public void setMaxConsecutiveApplications(int maxConsecutiveApplications) {
		this.maxConsecutiveApplications = maxConsecutiveApplications;
	}
	
	public int getCounter() {
		return counter;
	}
	
	public void setCounter(int counter) {
		this.counter = counter;
	}
	
	public void increaseCounter() {
		this.counter++;
	}
	
	public void resetCounter() {
		this.counter = 0;
	}
}
