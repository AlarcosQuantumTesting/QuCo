package edu.uclm.tp3.genetic;

import edu.uclm.tp3.common.model.Circuit;
import edu.uclm.tp3.common.services.EvolutionaryService;

public class Crosser {
	
	public static Circuit[] cross(Circuit father, Circuit mother) {
		int minLength = father.getGates().size()<mother.getGates().size() ? father.getGates().size() : mother.getGates().size();
		int crossPoint;
		do {
			crossPoint = EvolutionaryService.dado.nextInt(minLength);
		} while (crossPoint==0);
		Circuit[] children = new Circuit[2];
		children[0] = cross(father, mother, crossPoint);
		children[1] = cross(mother, father, crossPoint);
		return children;
	}

	private static Circuit cross(Circuit a, Circuit b, int crossPoint) {
		Circuit circuit = new Circuit();
		for (int i=0; i<crossPoint; i++) {
			circuit.add(a.getGates().get(i));
			circuit.getGatesEncoding().add(a.getGatesEncoding().get(i));
		}
		
		for (int i=crossPoint; i<b.getGates().size(); i++) {
			circuit.add(b.getGates().get(i));
			circuit.getGatesEncoding().add(b.getGatesEncoding().get(i));
		}

		circuit.setQubits(a.getQubits());
		return circuit;
	}
}
