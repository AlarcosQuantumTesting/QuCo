package edu.uclm.tp3.elonging.strategies;

import java.util.ArrayList;
import java.util.List;

import edu.uclm.tp3.common.model.Circuit;
import edu.uclm.tp3.common.model.ExecutionResults;
import edu.uclm.tp3.common.model.ProblemConfiguration;
import edu.uclm.tp3.common.model.Pair;
import edu.uclm.tp3.common.strategies.Strategy;
import edu.uclm.tp3.common.utils.Files;
import edu.uclm.tp3.genetic.fitnessers.Fitnesser;

public class AllMutants extends Strategy {
	
	private List<Pair> bestIndividuals;
	private boolean usePWB;

	public AllMutants(String gt, ProblemConfiguration pc, Fitnesser fitnesser, ManagerService manager) {
		super(gt, pc, fitnesser, manager);
		this.bestIndividuals = new ArrayList<>();
		this.loadIndividuals();
	}

	@Override
	public void apply(String templateStart, String templateEnd) throws Exception {
		int sourceGeneration = pc.getSourceGeneration();
		
		Circuit circuit;
		
		int[] cont = { 0 };
		int newPopulationSize;
		if (this.bestIndividuals.size()>1)
			this.usePWB = true;
		MassiveMutator mm = new MassiveMutator(templateStart, templateEnd);
		Pair bestIndividual = this.bestIndividuals.remove(0);
		circuit = Files.readCircuit(gt, sourceGeneration, bestIndividual.index, this.fitnesser);
		mm.generateMutants(circuit, cont, gt, pc, this.fitnesser);
		newPopulationSize = cont[0];
		
		if (!this.bestIndividuals.isEmpty()) {
			if (pc.getSourceGeneration()!=pc.getGenerationToExecute())
				super.deleteGeneration(pc.getGenerationToExecute());
			pc.increaseGenerationToExecute();
			pc.setNextStrategy(this);
		} else {
			super.deleteSourceGeneration();
			super.deleteGeneration(pc.getGenerationToExecute());
			this.pc.increaseSourceGeneration();
			this.pc.increaseGenerationToExecute();
			if (this.usePWB) {
				this.pc.setSourceGeneration(this.pc.getTargetGeneration());
				this.pc.setNextStrategy(new PopulationWithBests(gt, pc, fitnesser, this.manager));
			} else {
				pc.setNextStrategy(null);
			}
		}
		
		this.pc.getInputConfiguration().setPopulationSize(newPopulationSize);
	}
	
	private void loadIndividuals() {
		if (this.bestIndividuals.isEmpty()) {
			ExecutionResults er;
			try {
				double goodThreshold = pc.getMassiveMutationPolicy().getFitnessPercentage()*fitnesser.getExpectedFitness();
				er = Files.readResults(gt, pc.getSourceGeneration(), fitnesser);
				double[] fitnesses = er.getFitnesses();
				double fitness;
				int bestIndex = 0;
				double bestFitness = Double.MIN_VALUE; 
				for (int i=0; i<fitnesses.length; i++) {
					fitness = fitnesses[i];
					if (fitness>=goodThreshold) 
						this.addGood(new Pair(i, fitness));
					if (fitness>bestFitness) {
						bestIndex = i;
						bestFitness = fitness;
					}
				}
				if (this.bestIndividuals.isEmpty())
					this.addGood(new Pair(bestIndex, bestFitness));
				this.bestIndividuals.sort((o1, o2) -> (int) (o2.fitness-o1.fitness));
			} catch (Exception e) {
				e.printStackTrace();
			}
		}
	}
	
	public void addGood(Pair pair) {
		this.bestIndividuals.add(pair);
	}
	
	@Override
	public String getInitials() {
		return "AM (" + this.bestIndividuals.size() + ")";
	}
}
