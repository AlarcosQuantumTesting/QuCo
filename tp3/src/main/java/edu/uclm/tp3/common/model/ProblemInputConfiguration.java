package edu.uclm.tp3.common.model;

import java.util.List;

import edu.uclm.tp3.blocks.model.BlockCircuit;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public final class ProblemInputConfiguration {

	private int qubits;
	private boolean[] outputs;
	private List<Integer> expectedFrequencies;
	private int populationSize;
	private int maxPopulationSize;
	private int minNumberOfColumns;
	private int maxNumberOfColumns;
	private int numberOfOutputs;
	private boolean deleteFiles;

	private boolean[] startWithH;

	private int childrenPerCouple;
	private BlockCircuit blockCircuit;

	public int getShots() {
		int shots = 0;
		for (Integer ef : this.expectedFrequencies)
			shots = shots + ef;
		return shots;
	}

	public int getQubits() {
		return qubits;
	}

	public void setQubits(int qubits) {
		this.qubits = qubits;
	}

	public List<Integer> getExpectedFrequencies() {
		return expectedFrequencies;
	}

	public void setExpectedFrequencies(List<Integer> expectedFrequencies) {
		this.expectedFrequencies = expectedFrequencies;
	}

	public int getPopulationSize() {
		return populationSize;
	}

	public void setPopulationSize(int populationSize) {
		this.populationSize = populationSize;
	}

	public int getMinNumberOfColumns() {
		return minNumberOfColumns;
	}

	public void setMinNumberOfColumns(int minNumberOfColumns) {
		this.minNumberOfColumns = minNumberOfColumns;
	}

	public int getMaxNumberOfColumns() {
		return maxNumberOfColumns;
	}

	public void setMaxNumberOfColumns(int maxNumberOfColumns) {
		this.maxNumberOfColumns = maxNumberOfColumns;
	}

	public boolean isDeleteFiles() {
		return deleteFiles;
	}

	public void setDeleteFiles(boolean deleteFiles) {
		this.deleteFiles = deleteFiles;
	}

	public boolean[] getOutputs() {
		return outputs;
	}

	public void setOutputs(boolean[] outputs) {
		this.numberOfOutputs = 0;
		this.outputs = outputs;
		for (int i = 0; i < outputs.length; i++)
			if (outputs[i])
				this.numberOfOutputs++;
	}

	public int getNumberOfOutputs() {
		return numberOfOutputs;
	}

	public int getChildrenPerCouple() {
		return this.childrenPerCouple;
	}

	public void setChildrenPerCouple(int childrenPerCouple) {
		this.childrenPerCouple = childrenPerCouple;
	}

	public int getMaxPopulationSize() {
		return maxPopulationSize;
	}

	public void setMaxPopulationSize(int maxPopulationSize) {
		this.maxPopulationSize = maxPopulationSize;
	}

	public void setStartWithH(boolean[] startWithH) {
		this.startWithH = startWithH;
	}

	public boolean[] getStartWithH() {
		return startWithH;
	}

	public void setBlockCircuit(BlockCircuit blockCircuit) {
		this.blockCircuit = blockCircuit;
	}

	public BlockCircuit getBlockCircuit() {
		return blockCircuit;
	}
}
