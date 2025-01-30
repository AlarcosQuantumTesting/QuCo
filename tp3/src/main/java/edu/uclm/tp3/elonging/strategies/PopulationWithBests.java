package edu.uclm.tp3.elonging.strategies;

import java.util.List;

import edu.uclm.tp3.common.model.Circuit;
import edu.uclm.tp3.common.model.Pair;
import edu.uclm.tp3.common.model.ProblemConfiguration;
import edu.uclm.tp3.common.services.EvolutionaryService;
import edu.uclm.tp3.common.strategies.Strategy;
import edu.uclm.tp3.common.utils.Files;
import edu.uclm.tp3.genetic.Mutator;
import edu.uclm.tp3.genetic.fitnessers.Fitnesser;

public class PopulationWithBests extends Strategy {

	public PopulationWithBests(String gt, ProblemConfiguration pc, Fitnesser fitnesser, ManagerService manager) {
		super(gt, pc, fitnesser, manager);
	}

	@Override
	public void apply(String templateStart, String templateEnd) throws Exception {
		List<Pair> bestIndividuals = manager.getBestIndividuals();
		manager.sort();
		bestIndividuals = manager.getBestIndividuals();
		
		int targetGeneration = this.pc.getTargetGeneration();
		int start = targetGeneration-bestIndividuals.size();
		if (start<0)
			start = 0;
		
		int cont = 0;
		int goodGeneration;
		for (int i=targetGeneration-1; i>=start; i--) {
			goodGeneration = bestIndividuals.get(i).index;
			Circuit circuit = null;
			try {
				circuit = Files.readBestCircuit(this.gt, goodGeneration, this.fitnesser);
			} catch (Exception e) {
				System.out.println();
			}
			if (EvolutionaryService.dado.nextDouble()<0.05)
				Mutator.mutate(pc, circuit);
			circuit.save(this.gt, targetGeneration, cont, this.fitnesser);
			String gatesCode = circuit.getGatesCode();
			StringBuilder sb = new StringBuilder().append(templateStart).append(gatesCode).append(templateEnd);
			circuit.saveCode(gt, targetGeneration, cont, this.fitnesser, sb.toString());
			cont++;
		}
		
		for (int i=cont; i<this.pc.getInputConfiguration().getPopulationSize(); i++) {
			Circuit circuit = EvolutionaryService.generateRandomCircuit(this.pc, 0);
			circuit.save(this.gt, targetGeneration, cont, this.fitnesser);
			String gatesCode = circuit.getGatesCode();
			StringBuilder sb = new StringBuilder().append(templateStart).append(gatesCode).append(templateEnd);
			circuit.saveCode(gt, targetGeneration, cont, this.fitnesser, sb.toString());
			cont++;
		}
		
		this.deleteSourceGeneration();
		
		pc.increaseSourceGeneration();
		this.pc.increaseGenerationToExecute();
		this.pc.setNextStrategy(new ClassicRoulette(gt, pc, fitnesser, this.manager));
	}

	@Override
	public String getInitials() {
		return "PWB";
	}
}
