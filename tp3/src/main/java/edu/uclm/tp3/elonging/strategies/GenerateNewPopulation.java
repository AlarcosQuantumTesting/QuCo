package edu.uclm.tp3.elonging.strategies;

import edu.uclm.tp3.common.model.Circuit;
import edu.uclm.tp3.common.model.ProblemConfiguration;
import edu.uclm.tp3.common.services.EvolutionaryService;
import edu.uclm.tp3.common.strategies.Strategy;
import edu.uclm.tp3.genetic.fitnessers.Fitnesser;

public class GenerateNewPopulation extends Strategy {

	public GenerateNewPopulation(String gt, ProblemConfiguration pc, Fitnesser fitnesser, ManagerService manager) {
		super(gt, pc, fitnesser, manager);
	}

	@Override
	public void apply(String templateStart, String templateEnd) throws Exception {
		int targetGeneration = this.pc.getTargetGeneration();
		for (int i=0; i<this.pc.getInputConfiguration().getPopulationSize(); i++) {
			Circuit circuit = EvolutionaryService.generateRandomCircuit(this.pc, 0);
			circuit.save(pc, this.gt, targetGeneration, i, this.fitnesser);
			String gatesCode = circuit.getGatesCode();
			StringBuilder sb = new StringBuilder().append(templateStart).append(gatesCode).append(templateEnd);
			circuit.saveCode(gt, targetGeneration, i, this.fitnesser, sb.toString());
		}
		
		this.deleteSourceGeneration();
		
		this.pc.setNextStrategy(new PopulationWithBests(gt, pc, fitnesser, this.manager));
		this.pc.increaseSourceGeneration();
		this.pc.increaseGenerationToExecute();
	}

	@Override
	public String getInitials() {
		return "GNP";
	}
}
