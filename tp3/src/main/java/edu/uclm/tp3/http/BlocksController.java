package edu.uclm.tp3.http;

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

import edu.uclm.tp3.blocks.strategies.StrategyWrapper;
import edu.uclm.tp3.common.model.ProblemConfiguration;
import edu.uclm.tp3.common.services.BlocksService;
import edu.uclm.tp3.common.services.EvolutionaryService;
import edu.uclm.tp3.common.strategies.RunPopulation;
import edu.uclm.tp3.common.strategies.Strategy;
import edu.uclm.tp3.elonging.strategies.IStratego;
import edu.uclm.tp3.elonging.strategies.ParameterizableStratego;
import edu.uclm.tp3.elonging.strategies.Stratego;
import edu.uclm.tp3.genetic.fitnessers.SimpleFitnesser;
import edu.uclm.tp3.parallel.TaskData;
import edu.uclm.tp3.ws.HWSession;

@RestController
@RequestMapping("blocks")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class BlocksController extends EvolutionaryController {
	
	@Autowired
	private BlocksService service;

	@Autowired
    private SseEmitters emitters;
	
	@PutMapping("/generateInitialPopulation") @ResponseBody
	public long generateInitialPopulation(HttpSession session, @RequestBody ProblemConfiguration pc) {
		return super.generateInitialPopulation(session, pc, pc.getInputConfiguration().getMinNumberOfColumns());
	}
	
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
		SimpleFitnesser sessionFitnesser = (SimpleFitnesser) session.getAttribute("fitnesser");
		
		ProblemConfiguration pc = (ProblemConfiguration) session.getAttribute("pc");
		Map<String, Object> result = new HashMap<>();

		try {			
			String templateStart = session.getAttribute("templateStart").toString();
			String templateEnd = session.getAttribute("templateEnd").toString();
			
			int iterationIndex = pc.getIterationIndex();
			TextLogger.write(gt, "GeneticController:runPopulation gt=" + gt + "\n");
			TextLogger.write(gt, "\titerationIndex=" + iterationIndex + "\n");
			
			SimpleFitnesser fitnesser = sessionFitnesser;
			
			int sourceGeneration = pc.getSourceGeneration();
			IStratego stratego = selectedStratego.equalsIgnoreCase("fixedStratego") ? new Stratego() : new ParameterizableStratego();

			RunPopulation runPopulation = new RunPopulation(gt, pc, hw, emitters);



			pc.setSourceGeneration(sourceGeneration);

			TextLogger.write(gt, "\t" + fitnesser.getClass().getSimpleName() + "\n");
			long strategyTime= System.currentTimeMillis();
			Strategy strategy = stratego.getStrategy(gt, pc, fitnesser, manager, selectedStrategies);
			TextLogger.write(gt, "\t\t" + strategy.getClass().getSimpleName() + "\n");
			TextLogger.write(gt, "\t\tsourceGeneration=" + pc.getSourceGeneration() + "\n");
			TextLogger.write(gt, "\t\ttargetGeneration=" + pc.getTargetGeneration() + "\n");				
				
			emitters.sendMessage("Applying " + strategy.getClass().getSimpleName());
			StrategyWrapper sw = new StrategyWrapper(strategy);
			sw.apply(gt, pc, templateStart, templateEnd, fitnesser);
			result.put("strategyTime", System.currentTimeMillis()-strategyTime);
			runPopulation.setFitnesser(fitnesser);
			long startExecutionTime = System.currentTimeMillis();
			TaskData taskData = runPopulation.execute();
			long startCalculusTime = System.currentTimeMillis();
			result.put("executionTime", startCalculusTime-startExecutionTime);
			pc = runPopulation.apply(this.manager, taskData);
			result.put("calculusTime", System.currentTimeMillis()-startCalculusTime);
			pc.getLastExecutionResults().get(fitnesser.getClass().getSimpleName()).setStrategy(strategy);

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

