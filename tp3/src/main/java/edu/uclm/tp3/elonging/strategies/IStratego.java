package edu.uclm.tp3.elonging.strategies;

import java.util.List;
import java.util.Map;

import edu.uclm.tp3.common.model.ProblemConfiguration;
import edu.uclm.tp3.common.strategies.Strategy;
import edu.uclm.tp3.genetic.fitnessers.Fitnesser;

public interface IStratego {
	Strategy getStrategy(String gt, ProblemConfiguration pc, Fitnesser fitnesser, ManagerService manager, 
			List<Map<String, Object>> selectedStrategies);
}
