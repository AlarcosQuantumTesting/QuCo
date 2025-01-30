package edu.uclm.tp3.common.utils;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;

import org.apache.commons.io.FileUtils;

import edu.uclm.tp3.common.model.Circuit;
import edu.uclm.tp3.common.model.ExecutionResults;
import edu.uclm.tp3.common.services.EvolutionaryService;
import edu.uclm.tp3.genetic.fitnessers.Fitnesser;
import edu.uclm.tp3.http.TextLogger;

public class Files {

	public static void writeInt(String gt, String fileName, int value) throws Exception {
		try(ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream(fileName))) {
			oos.writeInt(value);
			TextLogger.write(gt, "\t\t\tGuardado " + fileName + ".selecteds\n");
		}
	}
	
	public static void writeObject(String gt, String fileName, Object value) throws Exception {
		try(ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream(fileName))) {
			oos.writeObject(value);
			TextLogger.write(gt, "\t\t\tGuardado " + fileName + ".selecteds\n");
		}
	}
	
	public static Object readSelecteds(String gt, int generation, Fitnesser fitnesser) throws Exception {
		String fileName = EvolutionaryService.generationFolder(gt) + generation + "." + fitnesser.getClass().getSimpleName() + ".selecteds";
		try(ObjectInputStream ois = new ObjectInputStream(new FileInputStream(fileName))) {
			Object result = ois.readObject();
			return result;
		}
	}
	
	public static Circuit readCircuit(String fileName) throws Exception {
		Circuit circuit;
		try(ObjectInputStream ois = new ObjectInputStream(new FileInputStream(fileName))) {
			circuit = (Circuit) ois.readObject();
		}
		return circuit;
	}
	
	public static Circuit readCircuit(String gt, int generation, int index, Fitnesser fitnesser) throws Exception {
		Circuit circuit;
		String fileName = EvolutionaryService.generationFolder(gt, generation) + index;
		fileName = fileName + (generation==0 ? ".circ" : "."  + fitnesser.getClass().getSimpleName() + ".circ");
		try(ObjectInputStream ois = new ObjectInputStream(new FileInputStream(fileName))) {
			circuit = (Circuit) ois.readObject();
		}
		return circuit;
	}
	
	public static Circuit readBestCircuit(String gt, int generation, Fitnesser fitnesser) throws Exception {
		Circuit circuit;
		String fileName = EvolutionaryService.getFile(gt, generation) + "." + fitnesser.getClass().getSimpleName() + ".bestIndividual.circ";
		try(ObjectInputStream ois = new ObjectInputStream(new FileInputStream(fileName))) {
			circuit = (Circuit) ois.readObject();
		}
		return circuit;
	}
	
	public static Circuit readRandomCircuit(String gt, int generation, Fitnesser fitnesser) throws Exception {
		String fileName = EvolutionaryService.getFile(gt, generation) + "." + fitnesser.getClass().getSimpleName() + ".randomIndividual.circ";
		Circuit circuit;
		try(ObjectInputStream ois = new ObjectInputStream(new FileInputStream(fileName))) {
			circuit = (Circuit) ois.readObject();
		}
		return circuit;
	}
	
	public static ExecutionResults readResults(String gt, int generation, Fitnesser fitnesser) throws Exception {
		String fileName = EvolutionaryService.getFile(gt, generation) + "." + fitnesser.getClass().getSimpleName() + ".result";
		ExecutionResults er;
		try(ObjectInputStream ois = new ObjectInputStream(new FileInputStream(fileName))) {
			er = (ExecutionResults) ois.readObject();
		}
		return er;
	}

	public static void copy(String gt, int sourceGeneration, int sourceIndex, int targetGeneration, int targetIndex, Fitnesser fitnesser) throws IOException {
		String[] sourceFileNames = { "", "" };
		String[] targetFileNames = { "", "" };
		if (sourceGeneration == 0) {
			sourceFileNames[0] = "" + EvolutionaryService.getFile(gt, sourceGeneration) + File.separatorChar + sourceIndex + ".circ";
			sourceFileNames[1] = "" + EvolutionaryService.getFile(gt, sourceGeneration) + File.separatorChar + sourceIndex + ".py";
		} else {
			sourceFileNames[0] = "" + EvolutionaryService.getFile(gt, sourceGeneration) + File.separatorChar + sourceIndex + 
					fitnesser.getClass().getSimpleName() + ".circ";
			sourceFileNames[1] = "" + EvolutionaryService.getFile(gt, sourceGeneration) + File.separatorChar + sourceIndex + 
					fitnesser.getClass().getSimpleName() + ".py";
		}
		targetFileNames[0] = "" + EvolutionaryService.getFile(gt, targetGeneration) + File.separatorChar + sourceIndex + "." +
				fitnesser.getClass().getSimpleName() + ".circ";
		targetFileNames[1] = "" + EvolutionaryService.getFile(gt, targetGeneration) + File.separatorChar + sourceIndex + "." +
				fitnesser.getClass().getSimpleName() + ".py";
		FileUtils.copyFile(new File(sourceFileNames[0]), new File(targetFileNames[0]));
		FileUtils.copyFile(new File(sourceFileNames[1]), new File(targetFileNames[1]));
	}
}
