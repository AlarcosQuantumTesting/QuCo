package edu.uclm.tp3.common.strategies;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import edu.uclm.tp3.common.model.Circuit;
import edu.uclm.tp3.common.model.ExecutionResults;
import edu.uclm.tp3.common.model.ProblemConfiguration;
import edu.uclm.tp3.common.model.History;
import edu.uclm.tp3.common.model.Pair;
import edu.uclm.tp3.common.services.EvolutionaryService;
import edu.uclm.tp3.common.utils.Files;
import edu.uclm.tp3.elonging.strategies.ManagerService;
import edu.uclm.tp3.genetic.fitnessers.Fitnesser;
import edu.uclm.tp3.http.TextLogger;
import edu.uclm.tp3.parallel.TaskData;
import edu.uclm.tp3.parallel.TaskScheduler;
import edu.uclm.tp3.qiskit.QiskitRunner;
import edu.uclm.tp3.ws.HWSession;

public class RunPopulation {

	private String gt;
	private ProblemConfiguration pc;
	private Fitnesser fitnesser;
	private HWSession hw;

	public RunPopulation(String gt, ProblemConfiguration pc, HWSession hw) {
		this.gt = gt;
		this.pc = pc;
		this.hw = hw;
	}
	
	public TaskData execute() throws Exception {
		TextLogger.write(gt, "\t\tRunPopulation:execute\n");
		TextLogger.write(gt, "\t\t\texecuting generation: " + pc.getGenerationToExecute() + "\n");
		int generationToExecute = pc.getGenerationToExecute();
		QiskitRunner runner = new QiskitRunner(gt, pc.getInputConfiguration().getNumberOfOutputs(), generationToExecute);
		
		TaskData freqsAndLengths = runner.runAll(pc, this.fitnesser, hw);
		
		return freqsAndLengths; 
	}

	@SuppressWarnings("unchecked")
	public ProblemConfiguration apply(ManagerService manager, TaskData taskData) throws Exception {
		Map<String, Object> freqsAndLengths = (Map<String, Object>) taskData.getData();
		List<Object> obtainedFrequencies = (List<Object>) freqsAndLengths.get("frequencies");	

		TextLogger.write(gt, "\t\tRunPopulation:apply\n");
		int executedGeneration = pc.getGenerationToExecute();
		
		int outputBits = (int) Math.pow(2, pc.getInputConfiguration().getNumberOfOutputs());
		ExecutionResults er = new ExecutionResults(this.pc.getInputConfiguration().getPopulationSize(), outputBits);
		er.setFitnesserIndex(fitnesser.getIndex());
		
		TextLogger.write(gt, "\t\t\tCreando TaskScheduler\n");
		TaskScheduler scheduler = new TaskScheduler(gt);
		scheduler.setOriginalTask(this.fitnesser);
		scheduler.setTaskReceptor(er);
		scheduler.setData(taskData);
		scheduler.setThreadsPerCore(4);
		scheduler.run();
		
		double totalError = 0;
		double bestFitness = 0;
		int bestIndividualIndex = 0;
		
		double expectedFitness = fitnesser.getExpectedFitness();
		double totalFitness = 0;

		this.hw.send("Calculating totals");
		TextLogger.write(gt, "\t\t\tobtainedFrequencies= " + obtainedFrequencies.size() + "\n");
		for (int i=0; i<obtainedFrequencies.size(); i++) {
			List<Integer> individualExecution = (List<Integer>) obtainedFrequencies.get(i);
			er.setGotFrequencies(i, individualExecution);
			
			totalFitness = totalFitness + er.getFitness(i);
			totalError = totalError + er.getError(i);
			
			if (er.getFitness(i)>=bestFitness) {
				bestFitness = er.getFitness(i);
				bestIndividualIndex = i;
				er.setBestFitness(er.getFitness(i));
				er.setBestIndividual(i);
			}
				
			if (er.getFitness(i)>=expectedFitness) {
				hw.send("Good news: one individual selected!");
				er.setSelecteds(i, true);
				String outputFileName = "" + EvolutionaryService.getFile(gt, executedGeneration) + "." + 
						i + "." + this.fitnesser.getClass().getSimpleName() + ".selected.circ";
				Circuit circuit = Files.readCircuit(gt, executedGeneration, i, fitnesser);
				Files.writeObject(gt, outputFileName, circuit);
			}
		}
		
		double meanError = (1.0*totalError)/obtainedFrequencies.size(); 
		double meanFitness = (1.0*totalFitness)/obtainedFrequencies.size(); 

		er.setMeanError(meanError);
		er.setMeanFitness(meanFitness);
		
		List<Pair> pairs = new ArrayList<>();
		for (int i=0; i<er.size(); i++) {
			double fitness = er.getFitness(i);
			Pair pair = new Pair(i, fitness);
			pairs.add(pair);
			er.setSelectionProbability(i, fitness/totalFitness);
		}
		
		Collections.sort(pairs);
		
		Pair best = new Pair(pc.getGenerationToExecute(), pairs.get(pairs.size()-1).fitness);
		manager.add(best);

		for (int i=1; i<pairs.size(); i++) 
			pairs.get(i).fitness += pairs.get(i-1).fitness;
					
		er.setIterationIndex(this.pc.getIterationIndex());
		this.pc.addLastExecutionResults(this.fitnesser.getClass().getSimpleName(), er);
		this.updateHistory(this.fitnesser, er);
		
		String outputFileName = EvolutionaryService.generationFolder(gt) + executedGeneration + "." + this.fitnesser.getClass().getSimpleName();
		Files.writeObject(gt, outputFileName + ".selecteds", pairs);
		TextLogger.write(gt, "\t\t\toutputFileName= " + outputFileName + ".selecteds\n");
		
		Circuit bestIndividual = Files.readCircuit(gt, executedGeneration, bestIndividualIndex, fitnesser);
		TextLogger.write(gt, "\t\t\tbestIndividualIndex= " + bestIndividualIndex + "\n");

		Files.writeInt(gt, outputFileName + ".bestIndividualIndex", bestIndividualIndex);
		Files.writeObject(gt, outputFileName + ".bestIndividual.circ", bestIndividual);
		
		int randomIndividualIndex;
		do {
			randomIndividualIndex = EvolutionaryService.dado.nextInt(obtainedFrequencies.size());
		} while (randomIndividualIndex==bestIndividualIndex);
		
		Circuit randomIndividual = Files.readCircuit(gt, executedGeneration, randomIndividualIndex, fitnesser);
		
		Files.writeInt(gt, outputFileName + ".randomIndividualIndex", randomIndividualIndex);
		Files.writeObject(gt, outputFileName + ".randomIndividual.circ", randomIndividual);
		
		Files.writeObject(gt, outputFileName + ".result", er);
		return pc;
	}

	private void updateHistory(Fitnesser fitnesser, ExecutionResults er) {
		History history = this.pc.getHistory(fitnesser.getClass().getSimpleName());
		if (history==null) {
			history = new History();
			this.pc.getHistory().put(fitnesser.getClass().getSimpleName(), history);
		}
		
		history.setFitnesserName(fitnesser.getClass().getSimpleName());
		history.setFitnesserIndex(fitnesser.getIndex());
		history.setFitnesses(er.getFitnesses());
		
		if (er.getBestFitness()<=history.getLastBestFitness())
			history.increaseBestFitnessDecrements();
		else
			history.setBestFitnessDecrements(0);

		history.setLastBestFitness(er.getBestFitness());
			
		if (er.getBestFitness()>history.getBestFitness()) {
			history.setBestFitness(er.getBestFitness());
			history.setBestGeneration(pc.getSourceGeneration());
			history.setBestIndividual(er.getBestIndividual());
		}
			
		if (er.getMeanFitness()<=history.getLastMeanFitness())
			history.increaseMeanFitnessDecrements();
		else
			history.setMeanFitnessDecrements(0);

		history.setLastMeanFitness(er.getMeanFitness());	
	}
	
	public void setFitnesser(Fitnesser fitnesser) {
		this.fitnesser = fitnesser;
	}
}
