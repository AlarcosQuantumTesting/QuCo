package edu.uclm.tp3.elonging.http;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpSession;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import edu.uclm.tp3.common.http.EvolutionaryController;
import edu.uclm.tp3.common.model.ProblemConfiguration;
import edu.uclm.tp3.common.services.EvolutionaryService;
import edu.uclm.tp3.common.strategies.RunPopulation;
import edu.uclm.tp3.common.strategies.Strategy;
import edu.uclm.tp3.elonging.strategies.IStratego;
import edu.uclm.tp3.elonging.strategies.ParameterizableStratego;
import edu.uclm.tp3.elonging.strategies.Stratego;
import edu.uclm.tp3.genetic.GeneticService;
import edu.uclm.tp3.genetic.fitnessers.Fitnesser;
import edu.uclm.tp3.http.TextLogger;
import edu.uclm.tp3.parallel.TaskData;
import edu.uclm.tp3.ws.HWSession;

@RestController
@RequestMapping("elonging")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class ElongingController extends EvolutionaryController {
	
	@Autowired
	private GeneticService service;
	
	@PutMapping("/generateInitialPopulation") @ResponseBody
	public long generateInitialPopulation(HttpSession session, @RequestBody ProblemConfiguration pc) {
		try {
			if (pc.getSelected1QubitGates().isEmpty() && pc.getProbOf1QubitGates()>0)
				throw new Exception("There are no selected 1 qubit gates, but you specificy a chance of " + pc.getProbOf1QubitGates());
			if (pc.getSelected2QubitGates().isEmpty() && pc.getProbOf2QubitGates()>0)
				throw new Exception("There are no selected 2 qubit gates, but you specificy a chance of " + pc.getProbOf2QubitGates());
			if (pc.getSelected3QubitGates().isEmpty() && pc.getProbOf3QubitGates()>0)
				throw new Exception("There are no selected 3 qubit gates, but you specificy a chance of " + pc.getProbOf3QubitGates());
			if (pc.getSelectedNQubitGates().isEmpty() && pc.getProbOfNQubitGates()>0)
				throw new Exception("There are no selected gates of 3 or more qubits, but you specificy a chance of " + pc.getProbOfNQubitGates());
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
		}
		return super.generateInitialPopulation(session, pc, pc.getInputConfiguration().getMinNumberOfColumns());
	}
	
	@SuppressWarnings("unchecked")
	@PostMapping("/runPopulation") @ResponseBody
	public Map<String, Object> runPopulation(HttpSession session, @RequestParam double desiredError, @RequestParam String selectedStratego,
			@RequestBody List<Map<String, Object>> selectedStrategies) {
		long startTime = System.currentTimeMillis();
		try {
			if (session.getAttribute("gt")==null)
				throw new Exception("Generate the initial population firstly");
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
		}
		
		HWSession hw = this.manager.get(session);
		String gt = session.getAttribute("gt").toString();
		Map<String, Fitnesser> sessionFitnessers = (Map<String, Fitnesser>) session.getAttribute("fitnessers");
		Fitnesser[] fitnessers = sessionFitnessers.values().toArray(new Fitnesser[0]);
		
		ProblemConfiguration pc = (ProblemConfiguration) session.getAttribute("pc");
		Map<String, Object> result = new HashMap<>();

		try {			
			String templateStart = session.getAttribute("templateStart").toString();
			String templateEnd = session.getAttribute("templateEnd").toString();
			
			int iterationIndex = pc.getIterationIndex();
			TextLogger.write(gt, "GeneticController:runPopulation gt=" + gt + "\n");
			TextLogger.write(gt, "\t" + java.time.Instant.now().toString() + ")\n");  
			TextLogger.write(gt, "\titerationIndex=" + iterationIndex + "\n");
			
			Fitnesser fitnesser;
			IStratego stratego = selectedStratego.equalsIgnoreCase("fixedStratego") ? new Stratego() : new ParameterizableStratego();
			
			int sourceGeneration = pc.getSourceGeneration();
			RunPopulation runPopulation = new RunPopulation(gt, pc, hw);
			for (int i=0; i<fitnessers.length; i++) {
				fitnesser = fitnessers[i];
				pc.setSourceGeneration(sourceGeneration);

				TextLogger.write(gt, "\t" + fitnesser.getClass().getSimpleName() + "\n");
				long strategyTime= System.currentTimeMillis();
				Strategy strategy = stratego.getStrategy(gt, pc, fitnesser, manager, selectedStrategies);
				TextLogger.write(gt, "\t\t" + strategy.getClass().getSimpleName() + "\n");
				TextLogger.write(gt, "\t\tsourceGeneration=" + pc.getSourceGeneration() + "\n");
				TextLogger.write(gt, "\t\ttargetGeneration=" + pc.getTargetGeneration() + "\n");				
				
				hw.send("Applying " + strategy.getClass().getSimpleName());
				strategy.apply(templateStart, templateEnd);
				result.put("strategyTime", System.currentTimeMillis()-strategyTime);

				runPopulation.setFitnesser(fitnesser);
				long startExecutionTime = System.currentTimeMillis();
				TaskData taskData = runPopulation.execute();
				long startCalculusTime = System.currentTimeMillis();
				result.put("executionTime", startCalculusTime-startExecutionTime);
				pc = runPopulation.apply(this.manager, taskData);
				result.put("calculusTime", System.currentTimeMillis()-startCalculusTime);
				pc.getLastExecutionResults().get(fitnesser.getClass().getSimpleName()).setStrategy(strategy);
			}

			pc.increaseIterationIndex();
			pc.increaseTargetGeneration();

			TextLogger.write(gt, "\titerationIndex=" + iterationIndex + "\n");
			TextLogger.write(gt, "\tsourceGeneration=" + pc.getSourceGeneration() + "\n");
			TextLogger.write(gt, "\ttargetGeneration=" + pc.getTargetGeneration() + "\n");
			TextLogger.write(gt, "\tgenerationToExecute=" + pc.getGenerationToExecute() + "\n\n");
			
			result.put("populationSize", pc.getInputConfiguration().getPopulationSize());
			result.put("lastExecutionResults", pc.getLastExecutionResults());
			result.put("time", System.currentTimeMillis()-startTime);
			return result;
		} catch (Exception e) {
			e.printStackTrace();
			TextLogger.write(gt, e.getMessage());
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
		}
	}

	@Override
	protected EvolutionaryService getService() {
		return this.service;
	}
}

