package edu.uclm.tp3.blocks.strategies;

import edu.uclm.tp3.blocks.model.BlockCircuit;
import edu.uclm.tp3.common.model.Circuit;
import edu.uclm.tp3.common.model.ProblemConfiguration;
import edu.uclm.tp3.common.strategies.Strategy;
import edu.uclm.tp3.common.utils.Files;
import edu.uclm.tp3.genetic.fitnessers.Fitnesser;

public class StrategyWrapper {

	private Strategy strategy;

	public StrategyWrapper(Strategy strategy) {
		this.strategy = strategy;
	}

	public void apply(String gt, ProblemConfiguration pc, String templateStart, String templateEnd, Fitnesser fitnesser) throws Exception {
		this.strategy.apply(templateStart, templateEnd);
		
		int targetGeneration = pc.getTargetGeneration();
		
		int populationSize = pc.getInputConfiguration().getPopulationSize();
		for (int i=0; i<populationSize; i++) {
			Circuit circuit = Files.readCircuit(gt, targetGeneration, i, fitnesser);
			BlockCircuit block = new BlockCircuit(pc.getInputConfiguration().getBlockCircuit());
			block.getBlock().setBlock(circuit);
			StringBuilder code = new StringBuilder().append(templateStart).append(block.getGatesCode()).append(templateEnd);
			block.saveCode(gt, targetGeneration, i, fitnesser, code.toString());
		}
	}

}
