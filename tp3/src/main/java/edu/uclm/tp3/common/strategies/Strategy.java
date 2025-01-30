package edu.uclm.tp3.common.strategies;

import java.io.File;
import java.io.FilenameFilter;
import java.io.IOException;

import org.apache.commons.io.FileUtils;

import edu.uclm.tp3.common.model.ProblemConfiguration;
import edu.uclm.tp3.common.services.EvolutionaryService;
import edu.uclm.tp3.elonging.strategies.ManagerService;
import edu.uclm.tp3.genetic.fitnessers.Fitnesser;
import edu.uclm.tp3.http.TextLogger;

public abstract class Strategy {
	
	protected String gt;
	protected ProblemConfiguration pc;
	protected Fitnesser fitnesser;
	protected ManagerService manager;

	protected Strategy(String gt, ProblemConfiguration pc, Fitnesser fitnesser, ManagerService manager) {
		this.gt = gt;
		this.pc = pc;
		this.fitnesser = fitnesser;
		this.manager = manager;
	}
	
	protected void deleteSourceGeneration() throws IOException {
		TextLogger.write(gt, "\t\tdeleting source generation: " + pc.getSourceGeneration() + "\n");
		if (pc.getInputConfiguration().isDeleteFiles())
			FileUtils.deleteDirectory(EvolutionaryService.getFile(gt, pc.getSourceGeneration()));
	}

	public abstract void apply(String templateStart, String templateEnd) throws Exception;

	public void deleteAllPreviousFiles() throws IOException {
		TextLogger.write(gt, "\t\tdeleting all previous files: " + pc.getSourceGeneration() + "\n");
		if (pc.getInputConfiguration().isDeleteFiles()) {
			String start = "" + pc.getSourceGeneration() + ".";
			FilenameFilter fnf = (dir, name) -> name.startsWith(start);
			String workingFolder = EvolutionaryService.generationFolder(gt);
			String[] fileNames = new File(workingFolder).list(fnf);
			int files = fileNames.length;
			for (int i=0; i<files; i++)
				new File(workingFolder + fileNames[i]).delete();
		}
	}
	
	public abstract String getInitials();

	public void deleteGeneration(int generationToDelete) throws IOException {
		TextLogger.write(gt, "\t\tdeleting generation: " + generationToDelete + "\n");
		if (pc.getInputConfiguration().isDeleteFiles())
			FileUtils.deleteDirectory(EvolutionaryService.getFile(gt, generationToDelete));
	}
}
