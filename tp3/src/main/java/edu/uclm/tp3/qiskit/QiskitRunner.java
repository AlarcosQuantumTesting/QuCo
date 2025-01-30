package edu.uclm.tp3.qiskit;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import edu.uclm.tp3.common.model.ProblemConfiguration;
import edu.uclm.tp3.common.services.EvolutionaryService;
import edu.uclm.tp3.genetic.fitnessers.Fitnesser;
import edu.uclm.tp3.http.TextLogger;
import edu.uclm.tp3.parallel.TaskData;
import edu.uclm.tp3.parallel.TaskReceptor;
import edu.uclm.tp3.ws.HWSession;

public class QiskitRunner implements TaskReceptor {
	
	private String gt;	
	private int numberOfOutputs;
	private Map<Integer, List<Integer>> executionResults;
	private Map<Integer, Integer> circuitLengths;
	private String processDirectory;
	
	public QiskitRunner(String gt, int numberOfOutputs, int generation) {
		this.gt = gt;
		this.numberOfOutputs = numberOfOutputs;
		this.processDirectory = EvolutionaryService.generationFolder(gt, generation);
		
		this.executionResults = new HashMap<>();
		this.circuitLengths = new HashMap<>();
		
		TextLogger.write(gt, 4, "QiskitRunner()\n");
		TextLogger.write(gt, 5, "numberOfOutputs: " + numberOfOutputs + "\n");
		TextLogger.write(gt, 5, "processDirectory: " + processDirectory + "\n");
	}

	public TaskData runAll(ProblemConfiguration pc, Fitnesser fitnesser, HWSession hw) throws Exception {
		TextLogger.write(gt, 4, "QiskitRunner::runAll(pc, fitnesser, hw)\n");
		this.executionResults.clear();

		String extension =  fitnesser==null ? ".py" : "." + fitnesser.getClass().getSimpleName() + ".py";
		
		String[] fileNames = new String[pc.getInputConfiguration().getPopulationSize()];
		for (int i=0; i<fileNames.length; i++)
			fileNames[i] = i + extension;
		int files = fileNames.length;
		
		TextLogger.write(gt, 4, "files= " + files + "\n");
		
		int cores = Runtime.getRuntime().availableProcessors();
		cores = cores*2;
		if (files<cores)
			cores = files;
		
		TextLogger.write(gt, 4, "cores= " + cores + "\n");
		
		Thread[] tt = new Thread[cores];
		int chunkSize = cores;
		TextLogger.write(gt, 5, "chunkSize= " + chunkSize + "\n");
		int loops = files/chunkSize;
		TextLogger.write(gt, 5, "loops= " + loops + "\n");
		int cont = 0;
		for (int i=0; i<loops; i++) {
			for (int j=0; j<chunkSize; j++) {
				TextLogger.write(this.gt, 5, "new QiskitSimpleRunner(runner, fileName=" + fileNames[cont] + ", fileIndex="+ cont + ")\n");
				QiskitSimpleRunner runner = new QiskitSimpleRunner(this, fileNames[cont], cont);
				cont++;
				tt[j] = new Thread(runner);
				TextLogger.write(this.gt, 5, "tt[" + j + "] = new Thread(runner);\n");
				tt[j].start();
				TextLogger.write(this.gt, 5, "tt[" + j + "].start();\n");
				if (cont%10==0 || cont==files-1)
					hw.send("Executing " + (cont+1) + "/" + files);
			}
			for (int j=0; j<chunkSize; j++)
				tt[j].join();
		}
		
		chunkSize = files%cores;
		TextLogger.write(gt, 5, "final chunkSize= " + chunkSize + "\n");
		for (int j=0; j<chunkSize; j++) {
			TextLogger.write(this.gt, 5, "new QiskitSimpleRunner(runner, fileName=" + fileNames[cont] + ", fileIndex="+ cont + ")\n");
			QiskitSimpleRunner runner = new QiskitSimpleRunner(this, fileNames[cont], cont);
			cont++;
			tt[j] = new Thread(runner);
			tt[j].start();
			if (cont%10==0 || cont==files-1)
				hw.send("Executing " + (cont+1) + "/" + files);
		}
		for (int j=0; j<chunkSize; j++)
			tt[j].join();
		
		
		List<List<Integer>> frequencies = this.executionResults.entrySet().stream()
				.sorted(Comparator.comparing(Map.Entry::getKey, Comparator.naturalOrder()))
				.map(Map.Entry::getValue)
				.collect(Collectors.toList());
		List<Integer> circuitLengths = this.circuitLengths.entrySet().stream()
				.sorted(Comparator.comparing(Map.Entry::getKey, Comparator.naturalOrder()))
				.map(Map.Entry::getValue)
				.collect(Collectors.toList());
		
		Map<String, Object> resultMap = new HashMap<>();
		resultMap.put("frequencies", frequencies);
		resultMap.put("circuitLengths", circuitLengths);
		TaskData result = new TaskData();
		result.setData(resultMap);
		result.setSize(frequencies.size());
		return result;
	}
	
	public synchronized void setResults(int fileIndex, List<Integer> obtainedFrequencies, int circuitLength) {
		this.executionResults.put(fileIndex, obtainedFrequencies);
		this.circuitLengths.put(fileIndex, circuitLength);
	}
	
	public int getOutputQubits() {
		return numberOfOutputs;
	}
	
	public String getProcessDirectory() {
		return processDirectory;
	}

	public String getGt() {
		return this.gt;
	}
}
