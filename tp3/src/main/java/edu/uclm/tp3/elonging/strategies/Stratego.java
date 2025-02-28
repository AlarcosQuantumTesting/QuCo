package edu.uclm.tp3.elonging.strategies;

import java.util.List;
import java.util.Map;

import edu.uclm.tp3.common.model.History;
import edu.uclm.tp3.common.model.ProblemConfiguration;
import edu.uclm.tp3.common.services.EvolutionaryService;
import edu.uclm.tp3.common.strategies.Strategy;
import edu.uclm.tp3.genetic.fitnessers.Fitnesser;

public class Stratego implements IStratego {

	public Strategy getStrategy(String gt, ProblemConfiguration pc, Fitnesser fitnesser, ManagerService manager, List<Map<String, Object>> selectedStrategies) {
		if (pc.getNextStrategy()!=null)
			return pc.getNextStrategy();
		
		double tirada = EvolutionaryService.dado.nextDouble();
		
		History history = pc.getHistory(fitnesser.getClass().getSimpleName());
		if (tirada<0.5) {
			if (pc.getMassiveMutationPolicy().getCounter()<pc.getMassiveMutationPolicy().getMaxConsecutiveApplications()) {
				if (pc.getMassiveMutationPolicy().getFallsThreshold()>0) {
					if (pc.getMassiveMutationPolicy().isApplicableWhenMeanFitnessFalls()) {
						if (history.getMeanFitnessDecrements()>=pc.getMassiveMutationPolicy().getFallsThreshold()) {
							pc.getMassiveMutationPolicy().increaseCounter();
							return new AllMutants(gt, pc, fitnesser, manager);
						}
					}
				
					if (pc.getMassiveMutationPolicy().isApplicableWhenBestFitnessFalls()) {
						if (history.getBestFitnessDecrements()>=pc.getMassiveMutationPolicy().getFallsThreshold()) {
							pc.getMassiveMutationPolicy().increaseCounter();
							return new AllMutants(gt, pc, fitnesser, manager);
						} 
					}
				}
			}
		}
		
		pc.getMassiveMutationPolicy().setCounter(0);
		
		tirada = EvolutionaryService.dado.nextDouble();
		double goodThreshold = pc.getMassiveMutationPolicy().getFitnessPercentage()*fitnesser.getExpectedFitness();
		
		if (history.getLastBestFitness()>=goodThreshold) {
			if (tirada<0.7) {
				return new SmallRotations(gt, pc, fitnesser, manager);
			} else {
				return new AllMutants(gt, pc, fitnesser, manager);
			}
		}
		
		if (pc.getSourceGeneration()>5) {
			tirada = EvolutionaryService.dado.nextDouble();
			if (tirada<0.40)
				return new ClassicRoulette(gt, pc, fitnesser, manager);
			if (tirada<0.50)
				return new GenerateNewPopulation(gt, pc, fitnesser, manager);
			if (tirada<0.60)
				return new PopulationWithBests(gt, pc, fitnesser, manager);
		}
		
		return new AddOrRemoveGate(gt, pc, fitnesser, manager);
		
	}

}
