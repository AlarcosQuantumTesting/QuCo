package edu.uclm.tp3.elonging.strategies;

import java.util.List;

import edu.uclm.tp3.common.gates.IRotableGate;
import edu.uclm.tp3.common.model.Circuit;
import edu.uclm.tp3.common.model.ProblemConfiguration;
import edu.uclm.tp3.common.model.Pair;
import edu.uclm.tp3.common.services.EvolutionaryService;
import edu.uclm.tp3.common.strategies.Strategy;
import edu.uclm.tp3.common.utils.Files;
import edu.uclm.tp3.genetic.fitnessers.Fitnesser;

public class SmallRotations extends Strategy {
	
	public SmallRotations(String gt, ProblemConfiguration pc, Fitnesser fitnesser, ManagerService manager) {
		super(gt, pc, fitnesser, manager);
	}

	@SuppressWarnings("unchecked")
	@Override
	public void apply(String templateStart, String templateEnd) throws Exception {
		int sourceGeneration = pc.getSourceGeneration();
		int targetGeneration = pc.getTargetGeneration();
		
		List<Pair> selecteds = (List<Pair>) Files.readSelecteds(gt, sourceGeneration, fitnesser);
		
		Circuit[] badCircuits = this.readCircuits(selecteds, sourceGeneration);
		Circuit circuit;
		int columns;
		for (int i=0; i<badCircuits.length; i++) {
			circuit = badCircuits[i];
			columns = circuit.getGates().size();
			if (columns>2) {
				IRotableGate rotableGate = circuit.getRotableGate();
				if (rotableGate==null) {
					EvolutionaryService.addGate(pc, circuit);
				} else {
					double radians = EvolutionaryService.dado.nextDouble()*0.5;
					rotableGate.smallRotation(radians);
				}
			} else {
				EvolutionaryService.addGate(pc, circuit);
			}
			circuit.save(pc, gt, targetGeneration, i, fitnesser);
			String gatesCode = circuit.getGatesCode();
			StringBuilder sb = new StringBuilder().append(templateStart).append(gatesCode).append(templateEnd);
			circuit.saveCode(gt, targetGeneration, i, fitnesser, sb.toString());
		}
		
		this.deleteSourceGeneration();
		this.pc.setNextStrategy(null);
		this.pc.increaseSourceGeneration();
		this.pc.increaseGenerationToExecute();
	}
	
	private Circuit[] readCircuits(List<Pair> pairs, int sourceGeneration) throws Exception {
		Circuit[] circuits = new Circuit[pairs.size()];
		for (int i=0; i<pairs.size(); i++) {
			int index = pairs.get(i).index;
			Circuit circuit = Files.readCircuit(gt, sourceGeneration, index, this.fitnesser);
			circuits[i]=circuit;
		}
		return circuits;
	}
	
	@Override
	public String getInitials() {
		return "SmallRotations";
	}
}
