package edu.uclm.tp3.elonging.strategies;

import java.util.Collections;
import java.util.List;

import edu.uclm.tp3.common.model.Circuit;
import edu.uclm.tp3.common.model.ProblemConfiguration;
import edu.uclm.tp3.common.model.Pair;
import edu.uclm.tp3.common.services.EvolutionaryService;
import edu.uclm.tp3.common.utils.Files;
import edu.uclm.tp3.genetic.Crosser;
import edu.uclm.tp3.genetic.Mutator;
import edu.uclm.tp3.genetic.fitnessers.Fitnesser;

public class ClassicRoulette extends Roulette {

	public ClassicRoulette(String gt, ProblemConfiguration pc, Fitnesser fitnesser, ManagerService manager) {
		super(gt, pc, fitnesser, manager);
	}

	protected Circuit[] generateOffspring(String gt, int targetGeneration, int sourceGeneration, List<Pair> selecteds) throws Exception {
		Circuit[] parents = new Circuit[selecteds.size()];
		for (int i=0; i<selecteds.size(); i++) {
			Circuit circuit = Files.readCircuit(gt, sourceGeneration, i, fitnesser);
			parents[i] = circuit;
		}
		
		Pair lastPair = selecteds.get(selecteds.size()-1);
		int index0 = selectParent(selecteds, lastPair.fitness);
		int index1;
		//do {
			index1 = selectParent(selecteds, lastPair.fitness);
		//} while (index0==index1);
		index0 = 0;
		index1 = selecteds.size()-1;
		
		Circuit father = parents[index0];
		Circuit mother = parents[index1];
		Circuit[] children = Crosser.cross(father, mother);
				
		if (EvolutionaryService.dado.nextDouble()<0.03) 
			Mutator.mutate(pc, children[0]);
		
		if (EvolutionaryService.dado.nextDouble()<0.03)
			Mutator.mutate(pc, children[1]);
				
		parents[index0] = children[0];
		parents[index1] = children[1];
		
		for (int i=0; i<parents.length; i++)
			parents[i].save(gt, targetGeneration, i, fitnesser);
		return parents;
	}

	private int selectParent(List<Pair> selecteds, double bestFitness) {
		double tirada = EvolutionaryService.dado.nextDouble()*bestFitness;
		int index = Collections.binarySearch(selecteds, new Pair(0, tirada));
		if (index<0)
			index = -index-1;
		return index;
	}
	
	@Override
	public String getInitials() {
		return "CR";
	}
}
