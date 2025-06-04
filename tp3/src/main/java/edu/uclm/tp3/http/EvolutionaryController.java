package edu.uclm.tp3.http;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import edu.uclm.tp3.common.model.ProblemConfiguration;
import edu.uclm.tp3.common.services.EvolutionaryService;
import edu.uclm.tp3.common.services.GateDescription;
import edu.uclm.tp3.common.strategies.RunPopulation;
import edu.uclm.tp3.elonging.strategies.ManagerService;
import edu.uclm.tp3.genetic.fitnessers.Fitnesser;
import edu.uclm.tp3.genetic.fitnessers.FitnessersService;
import edu.uclm.tp3.parallel.TaskData;
import edu.uclm.tp3.ws.HWSession;

@RestController
public abstract class EvolutionaryController {
		
	@Autowired
	protected FitnessersService fitnesserService;
	
	@Autowired
	protected ManagerService manager;

	@Autowired
    private SseEmitters emitters;
	
	@GetMapping("/resetSession") @ResponseBody
	public String resetSession(HttpSession session, HttpServletRequest request) {
		session.removeAttribute("gt");
		session.removeAttribute("pc");
		return session.getId();
	}
	
	@GetMapping("/getFitnessers") @ResponseBody
	public List<String> getFitnessers() {
		List<String> result = new ArrayList<>();
		for (Class<?> clazz : this.fitnesserService.getFitnesserClasses())
			result.add(clazz.getSimpleName());
		return result;
	}
	
	@GetMapping("/getGates") @ResponseBody
	public List<GateDescription> getGates() {
		return EvolutionaryService.getGateNames();
	}
	
	@GetMapping("/getStrategies")
	public List<String> getStrategies() {
		return EvolutionaryService.getStrategies();
	}
	
	@SuppressWarnings("unchecked")
	@PutMapping("/selectFitnesser") @ResponseBody
	public Fitnesser selectFitness(HttpSession session, @RequestBody Map<String, Object> info) {
		try {
			Map<String, Fitnesser> fitnessers = (Map<String, Fitnesser>) session.getAttribute("fitnessers");
			if (fitnessers==null) {
				fitnessers = new HashMap<>();
				session.setAttribute("fitnessers", fitnessers);
			}
			
			JSONObject jso = new JSONObject(info);
			String name = jso.getString("name");
			boolean selected = jso.getBoolean("selected");
			
			if (!selected) {
				fitnessers.remove(name);
				return null;
			}
			
			int shots = jso.getInt("shots");
			double desiredError = jso.getDouble("desiredError");
			session.setAttribute("lastDesiredError", desiredError);
			List<Integer> expectedFrequencies = (List<Integer>) info.get("expectedFrequencies");
			
			Fitnesser fitnesser = fitnessers.get(name);
			if (fitnesser==null) {
				fitnesser = this.fitnesserService.getInstance(name);
				fitnessers.put(name, fitnesser);
			}
			int populationSize = jso.getInt("populationSize");
			fitnesser.setPopulationSize(populationSize);
			fitnesser.setShots(shots);
			fitnesser.setDesiredError(desiredError);
			fitnesser.setExpected(expectedFrequencies);
			fitnesser.setUp();
			return fitnesser;
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
		}
	}
	
	@SuppressWarnings("unchecked")
	@GetMapping("/updateDesiredError") @ResponseBody
	public Collection<Fitnesser> updateDesiredError(HttpSession session, @RequestParam double desiredError) {
		try {
			Map<String, Fitnesser> fitnessers = (Map<String, Fitnesser>) session.getAttribute("fitnessers");
			if (fitnessers==null) 
				throw new Exception("Please, select one or more fistnessers before updating the desired error");

			for (Fitnesser fitnesser : fitnessers.values()) {
				fitnesser.setDesiredError(desiredError);
				fitnesser.setUp();
			}
			session.setAttribute("lastDesiredError", desiredError);
			return fitnessers.values();
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
		}
	}
	
	@SuppressWarnings("unchecked")
	@PutMapping("/updateExpectedFrequencies") @ResponseBody
	public Collection<Fitnesser> updateExpectedFrequencies(HttpSession session, @RequestBody Map<String, Object> info) {
		try {
			Map<String, Fitnesser> fitnessers = (Map<String, Fitnesser>) session.getAttribute("fitnessers");
			if (fitnessers==null) 
				throw new Exception("Please, select one or more fistnessers before updating the expected frequencies");

			List<Integer> expectedFrequencies = (List<Integer>) info.get("expectedFrequencies");
			int shots = (int) info.get("shots");
			
			for (Fitnesser fitnesser : fitnessers.values()) {
				fitnesser.setExpected(expectedFrequencies);
				fitnesser.setShots(shots);
				fitnesser.setUp();
			}
			return fitnessers.values();
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
		}
	}
	
	@SuppressWarnings("unchecked")
	public final long generateInitialPopulation(HttpSession session, ProblemConfiguration pc, int initialLength) {
		long startTime = System.currentTimeMillis();
		String gt = ""  + EvolutionaryService.dado.nextInt();
		session.setAttribute("gt", gt);
		//HWSession hw = this.manager.get(session);
		Map<String, Fitnesser> fitnessers = (Map<String, Fitnesser>) session.getAttribute("fitnessers");
		pc.setRemoteFitnessers(fitnessers.values().toArray(new Fitnesser[0]));
		
		try {
			//String[] startEnd= this.getService().generatePopulation(gt, pc, initialLength, hw);
			String[] startEnd= this.getService().generatePopulation(gt, pc, initialLength);
			session.setAttribute("templateStart", startEnd[0]);
			session.setAttribute("templateEnd", startEnd[1]);
			session.setAttribute("pc", pc);
			return System.currentTimeMillis()-startTime;
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
		}
	}
	
	@SuppressWarnings("unchecked")
	@GetMapping("/firstRun") @ResponseBody
	public Map<String, Object> firstRun(HttpSession session) {
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
		pc.setRemoteFitnessers(fitnessers);
		
		Map<String, Object> result = new HashMap<>();
		try {			
			int iterationIndex = pc.getIterationIndex();
			TextLogger.write(gt, "GeneticController:firstRun gt=" + gt + "\n");
			TextLogger.write(gt, "\titerationIndex=" + iterationIndex + "\n");
			TextLogger.write(gt, "\tsourceGeneration=" + pc.getSourceGeneration() + "\n");
			TextLogger.write(gt, "\ttargetGeneration=" + pc.getTargetGeneration() + "\n");
			TextLogger.write(gt, "\tgenerationToExecute=" + pc.getGenerationToExecute() + "\n");
			
			Fitnesser fitnesser;
			
			// RunPopulation runPopulation = new RunPopulation(gt, pc, hw);
			if (emitters == null) {
				emitters = new SseEmitters(); // solo si el constructor no necesita nada
			}

			RunPopulation runPopulation = new RunPopulation(gt, pc, hw, emitters);
			TaskData taskData = runPopulation.execute();
	
			long startCalculusTime = System.currentTimeMillis();
			result.put("executionTime", startCalculusTime-startTime);
			
			int sourceGeneration = pc.getSourceGeneration();
			for (int i=0; i<fitnessers.length; i++) {
				fitnesser = fitnessers[i];
				pc.setSourceGeneration(sourceGeneration);
				TextLogger.write(gt, "\t" + fitnesser.getClass().getSimpleName() + "\n");
				runPopulation.setFitnesser(fitnesser);
				pc = runPopulation.apply(this.manager, taskData);
				pc.getLastExecutionResults().get(fitnesser.getClass().getSimpleName()).setStrategy("First execution");
			}
	
			result.put("calculusTime", System.currentTimeMillis()-startCalculusTime);
			pc.increaseIterationIndex();
			pc.increaseTargetGeneration();
	
			TextLogger.write(gt, "\titerationIndex=" + iterationIndex + "\n");
			TextLogger.write(gt, "\tsourceGeneration=" + pc.getSourceGeneration() + "\n");
			TextLogger.write(gt, "\ttargetGeneration=" + pc.getTargetGeneration() + "\n");
			TextLogger.write(gt, "\tgenerationToExecute=" + pc.getGenerationToExecute() + "\n\n");
			
			result.put("populationSize", pc.getInputConfiguration().getPopulationSize());
			result.put("lastExecutionResults", pc.getLastExecutionResults());
			result.put("totalTime", System.currentTimeMillis()-startTime);
			return result;
		} catch (Exception e) {
			e.printStackTrace();
			TextLogger.write(gt, e.getMessage());
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
		}
	}
	
	public abstract Map<String, Object> runPopulation(HttpSession session, @RequestParam double desiredError, @RequestParam String selectedStratego,
			@RequestBody List<Map<String, Object>> selectedStrategies);
	
	protected abstract EvolutionaryService getService();
	
	@GetMapping("/getCode/{generation}/{index}") @ResponseBody
	public String getCode(HttpSession session, @PathVariable int generation, @PathVariable int index, @RequestParam String fitnesserName) {
		String gt = session.getAttribute("gt").toString();
		try {
			String templateStart = session.getAttribute("templateStart").toString();
			String templateEnd = session.getAttribute("templateEnd").toString();
			return this.getService().getCode(gt, generation, index, fitnesserName, templateStart, templateEnd);
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
		}
	}
}

