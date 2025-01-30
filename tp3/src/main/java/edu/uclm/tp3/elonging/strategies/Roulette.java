package edu.uclm.tp3.elonging.strategies;

import java.util.List;

import edu.uclm.tp3.common.model.Circuit;
import edu.uclm.tp3.common.model.ProblemConfiguration;
import edu.uclm.tp3.common.model.Pair;
import edu.uclm.tp3.common.strategies.Strategy;
import edu.uclm.tp3.common.utils.Files;
import edu.uclm.tp3.genetic.fitnessers.Fitnesser;

public abstract class Roulette extends Strategy {

	protected Roulette(String gt, ProblemConfiguration pc, Fitnesser fitnesser, ManagerService manager) {
		super(gt, pc, fitnesser, manager);
	}

	@SuppressWarnings("unchecked")
	@Override
	public void apply(String templateStart, String templateEnd) throws Exception {
		int sourceGeneration = pc.getSourceGeneration();
		int targetGeneration = pc.getTargetGeneration();
		
		List<Pair> selecteds = (List<Pair>) Files.readSelecteds(gt, sourceGeneration, fitnesser);
		Circuit[] circuits = this.generateOffspring(gt, targetGeneration, sourceGeneration, selecteds);

		this.deleteSourceGeneration();
		
		Circuit circuit;
		for (int i=0; i<circuits.length; i++) {
			circuit = circuits[i];			
			String gatesCode = circuit.getGatesCode();
			StringBuilder sb = new StringBuilder().append(templateStart).append(gatesCode).append(templateEnd);
			circuit.saveCode(gt, targetGeneration, i, this.fitnesser, sb.toString());
		}
		
		this.pc.setNextStrategy(null);		
		this.pc.increaseSourceGeneration();
		this.pc.increaseGenerationToExecute();
	}
	
	protected abstract Circuit[] generateOffspring(String gt, int targetGeneration, int sourceGeneration, List<Pair> selecteds) throws Exception;
}
