package edu.uclm.tp3.genetic;

import org.springframework.stereotype.Service;

import edu.uclm.tp3.common.model.Circuit;
import edu.uclm.tp3.common.model.ProblemConfiguration;
import edu.uclm.tp3.common.model.ProblemInputConfiguration;
import edu.uclm.tp3.common.services.EvolutionaryService;
import edu.uclm.tp3.ws.HWSession;

@Service
public class GeneticService extends EvolutionaryService {
	
	@Override
	public String getInitialization(ProblemConfiguration pc) {
		ProblemInputConfiguration gic = pc.getInputConfiguration();
		StringBuilder sbH = new StringBuilder();
		for (int i=0; i<gic.getStartWithH().length; i++) {
			if (gic.getStartWithH()[i])
				sbH.append("circuit.h(" + i + ")\n");
		}
		return sbH.toString();
	}

	@Override
	protected void buildIndividuals(String token, ProblemConfiguration pc, String[] startEnd, int initialLength, HWSession hw) throws Exception {
		int targetGeneration = pc.getTargetGeneration();
		int populationSize = pc.getInputConfiguration().getPopulationSize();
		for (int i=0; i<populationSize; i++) {
			Circuit circuit = generateRandomCircuit(pc, initialLength);
			if (i%10==0 || i==populationSize-1)
				hw.send((i+1) + " of " + populationSize);
			circuit.save(token, targetGeneration, i, null);
			String gatesCode = circuit.getGatesCode();
			StringBuilder sb = new StringBuilder().append(startEnd[0]).append(gatesCode).append(startEnd[1]);
			circuit.saveCode(token, targetGeneration, i, null, sb.toString());
		}
	}

}
