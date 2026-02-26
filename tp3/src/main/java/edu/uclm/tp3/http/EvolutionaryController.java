package edu.uclm.tp3.http;

import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.locks.ReentrantLock;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

import org.apache.tomcat.util.http.fileupload.FileUtils;
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
import edu.uclm.tp3.genetic.fitnessers.SimpleFitnesser;
import edu.uclm.tp3.parallel.TaskData;
import edu.uclm.tp3.ws.HWSession;

@RestController
public abstract class EvolutionaryController {

	@Autowired
	protected ManagerService manager;

	@Autowired
	private SseEmitters emitters;

	@GetMapping("/resetSession")
	@ResponseBody
	public String resetSession(HttpSession session, HttpServletRequest request) {
		Object gtObj = session.getAttribute("gt");
		ProblemConfiguration pc = (ProblemConfiguration) session.getAttribute("pc");

		if (gtObj != null && pc != null && pc.getInputConfiguration().isDeleteFiles()) {
			String gt = (String) gtObj;

			RunPopulation.requestCancellation(gt);

			ReentrantLock lock = RunPopulation.getLockFor(gt);
			lock.lock();
			try {
				File dirToDelete = new File(EvolutionaryService.generationFolder(gt));

				if (dirToDelete.exists())
					FileUtils.deleteDirectory(dirToDelete);
			} catch (IOException e) {
				e.printStackTrace();
				return "Error deleting files: " + e.getMessage();
			} finally {
				lock.unlock();
				deleteDirectorySafelyLater(new File(EvolutionaryService.generationFolder(gt)));
			}
		}

		session.removeAttribute("gt");
		session.removeAttribute("pc");

		return "Session reset and files deleted.";
	}

	public static void deleteDirectorySafelyLater(File dir) {
		new Thread(() -> {
			try {
				Thread.sleep(3000);
				if (dir.exists()) {
					FileUtils.deleteDirectory(dir);
				}
			} catch (Exception e) {
				System.err.println("Error al eliminar en segundo intento: " + e.getMessage());
			}
		}).start();
	}

	@GetMapping("/getGates")
	@ResponseBody
	public List<GateDescription> getGates() {
		return EvolutionaryService.getGateNames();
	}

	@GetMapping("/getStrategies")
	public List<String> getStrategies() {
		return EvolutionaryService.getStrategies();
	}

	@SuppressWarnings("unchecked")
	@PutMapping("/selectFitnesser")
	@ResponseBody
	public SimpleFitnesser selectFitness(HttpSession session, @RequestBody Map<String, Object> info) {
		try {
			JSONObject jso = new JSONObject(info);

			int shots = jso.getInt("shots");
			double desiredError = jso.getDouble("desiredError");
			session.setAttribute("lastDesiredError", desiredError);
			List<Integer> expectedFrequencies = (List<Integer>) info.get("expectedFrequencies");

			SimpleFitnesser fitnesser = new SimpleFitnesser();
			session.setAttribute("fitnesser", fitnesser);
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

	@GetMapping("/updateDesiredError")
	@ResponseBody
	public void updateDesiredError(HttpSession session, @RequestParam double desiredError) {
		try {
			SimpleFitnesser fitnesser = (SimpleFitnesser) session.getAttribute("fitnesser");
			if (fitnesser == null) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No fitnesser in session");
			}
			fitnesser.setDesiredError(desiredError);
			fitnesser.setUp();
			session.setAttribute("fitnesser", fitnesser);

			session.setAttribute("lastDesiredError", desiredError);
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
		}
	}

	@SuppressWarnings("unchecked")
	@PutMapping("/updateExpectedFrequencies")
	@ResponseBody
	public SimpleFitnesser updateExpectedFrequencies(HttpSession session, @RequestBody Map<String, Object> info) {
		try {
			SimpleFitnesser fitnesser = (SimpleFitnesser) session.getAttribute("fitnesser");
			if (fitnesser == null) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No fitnesser in session");
			}
			session.setAttribute("fitnesser", fitnesser);
			/*
			 * List<Integer> expectedFrequencies = (List<Integer>)
			 * info.get("expectedFrequencies");
			 * int shots = (int) info.get("shots");
			 */

			List<Object> rawExpectedFrequencies = (List<Object>) info.get("expectedFrequencies");
			List<Integer> expectedFrequencies = new java.util.ArrayList<>();
			for (Object obj : rawExpectedFrequencies) {
				if (obj instanceof Number) {
					expectedFrequencies.add(((Number) obj).intValue());
				}
			}

			int shots = 0;
			Object shotsObj = info.get("shots");
			if (shotsObj instanceof Number) {
				shots = ((Number) shotsObj).intValue();
			}

			fitnesser.setExpected(expectedFrequencies);
			fitnesser.setShots(shots);
			fitnesser.setUp();

			return fitnesser;
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid payload: " + e.getMessage(), e);
		}
	}

	public final long generateInitialPopulation(HttpSession session, ProblemConfiguration pc, int initialLength) {
		long startTime = System.currentTimeMillis();
		String gt = "" + EvolutionaryService.dado.nextInt();
		session.setAttribute("gt", gt);
		SimpleFitnesser fitnesser = (SimpleFitnesser) session.getAttribute("fitnesser");
		pc.setSimpleFitnesser(fitnesser);

		try {
			String[] startEnd = this.getService().generatePopulation(gt, pc, initialLength);
			session.setAttribute("templateStart", startEnd[0]);
			session.setAttribute("templateEnd", startEnd[1]);
			session.setAttribute("pc", pc);
			return System.currentTimeMillis() - startTime;
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
		}
	}

	@GetMapping("/firstRun")
	@ResponseBody
	public Map<String, Object> firstRun(HttpSession session) {
		long startTime = System.currentTimeMillis();
		try {
			if (session.getAttribute("gt") == null)
				throw new Exception("Generate the initial population firstly");
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
		}

		HWSession hw = this.manager.get(session);
		String gt = session.getAttribute("gt").toString();
		SimpleFitnesser fitnesser = (SimpleFitnesser) session.getAttribute("fitnesser");
		session.setAttribute("fitnesser", fitnesser);
		ProblemConfiguration pc = (ProblemConfiguration) session.getAttribute("pc");
		pc.setSimpleFitnesser(fitnesser);

		Map<String, Object> result = new HashMap<>();
		try {
			int iterationIndex = pc.getIterationIndex();
			TextLogger.write(gt, "GeneticController:firstRun gt=" + gt + "\n");
			TextLogger.write(gt, "\titerationIndex=" + iterationIndex + "\n");
			TextLogger.write(gt, "\tsourceGeneration=" + pc.getSourceGeneration() + "\n");
			TextLogger.write(gt, "\ttargetGeneration=" + pc.getTargetGeneration() + "\n");
			TextLogger.write(gt, "\tgenerationToExecute=" + pc.getGenerationToExecute() + "\n");

			if (emitters == null) {
				emitters = new SseEmitters();
			}

			RunPopulation runPopulation = new RunPopulation(gt, pc, hw, emitters);
			TaskData taskData = runPopulation.execute();

			long startCalculusTime = System.currentTimeMillis();
			result.put("executionTime", startCalculusTime - startTime);

			int sourceGeneration = pc.getSourceGeneration();

			pc.setSourceGeneration(sourceGeneration);
			TextLogger.write(gt, "\t" + fitnesser.getClass().getSimpleName() + "\n");
			runPopulation.setFitnesser(fitnesser);
			pc = runPopulation.apply(this.manager, taskData);
			pc.getLastExecutionResults().get(fitnesser.getClass().getSimpleName()).setStrategy("First execution");

			result.put("calculusTime", System.currentTimeMillis() - startCalculusTime);
			pc.increaseIterationIndex();
			pc.increaseTargetGeneration();

			TextLogger.write(gt, "\titerationIndex=" + iterationIndex + "\n");
			TextLogger.write(gt, "\tsourceGeneration=" + pc.getSourceGeneration() + "\n");
			TextLogger.write(gt, "\ttargetGeneration=" + pc.getTargetGeneration() + "\n");
			TextLogger.write(gt, "\tgenerationToExecute=" + pc.getGenerationToExecute() + "\n\n");

			result.put("populationSize", pc.getInputConfiguration().getPopulationSize());
			result.put("lastExecutionResults", pc.getLastExecutionResults());
			result.put("totalTime", System.currentTimeMillis() - startTime);
			return result;
		} catch (Exception e) {
			e.printStackTrace();
			TextLogger.write(gt, e.getMessage());
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
		}
	}

	public abstract Map<String, Object> runPopulation(HttpSession session, @RequestParam double desiredError,
			@RequestParam String selectedStratego,
			@RequestBody List<Map<String, Object>> selectedStrategies);

	protected abstract EvolutionaryService getService();

	@GetMapping("/getCode/{generation}/{index}")
	@ResponseBody
	public String getCode(HttpSession session, @PathVariable int generation, @PathVariable int index,
			@RequestParam String fitnesserName) {
		String gt = session.getAttribute("gt").toString();
		try {
			String templateStart = session.getAttribute("templateStart").toString();
			String templateEnd = session.getAttribute("templateEnd").toString();
			return this.getService().getCode(gt, generation, index, fitnesserName, templateStart, templateEnd);
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
		}
	}

	@SuppressWarnings("unchecked")
	@GetMapping("/getSimpleFitnesser")
	@ResponseBody
	public SimpleFitnesser getSimpleFitnesser(HttpSession session) {
		return EvolutionaryService.getSimpleFitnesser();
	}
}
