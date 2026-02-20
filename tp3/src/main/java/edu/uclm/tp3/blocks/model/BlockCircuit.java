package edu.uclm.tp3.blocks.model;

import java.io.FileOutputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import edu.uclm.tp3.common.services.EvolutionaryService;
import edu.uclm.tp3.genetic.fitnessers.Fitnesser;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@SuppressWarnings("serial")
@JsonIgnoreProperties(ignoreUnknown = true)
public class BlockCircuit implements Serializable {
	private List<BlockColumn> startingColumns;
	private int numberOfBlocks;

	private Block block;

	public BlockCircuit() {
	}

	public BlockCircuit(BlockCircuit blockCircuit) {
		this();
		this.startingColumns = blockCircuit.getStartingColumns();
		this.block = blockCircuit.getBlock();
		this.numberOfBlocks = blockCircuit.numberOfBlocks;
	}

	public void setStartingColumns(Object[] receivedColumns) throws Exception {
		this.startingColumns = new ArrayList<>();
		for (int i = 0; i < receivedColumns.length; i++) {
			Object receivedColumn = receivedColumns[i];
			BlockColumn column = new BlockColumn();
			column.setGates(receivedColumn);
			this.startingColumns.add(column);
		}
	}

	public List<BlockColumn> getStartingColumns() {
		return startingColumns;
	}

	public int getNumberOfBlocks() {
		return numberOfBlocks;
	}

	public void setNumberOfBlocks(int numberOfBlocks) {
		this.numberOfBlocks = numberOfBlocks;
	}

	public void setBlock(Block block) {
		this.block = block;
	}

	public Block getBlock() {
		return block;
	}

	public String save(String token, int targetGeneration, int fileIndex, Fitnesser fitnesser) throws Exception {
		String fileName = EvolutionaryService.generationFolder(token, targetGeneration) + fileIndex;
		if (fitnesser != null)
			fileName += "." + fitnesser.getClass().getSimpleName();
		fileName += ".block";
		try (ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream(fileName))) {
			oos.writeObject(this);
		}
		return fileName;
	}

	public String saveCode(String gt, int targetGeneration, int fileIndex, Fitnesser fitnesser, String code)
			throws Exception {
		String shortFileName;
		if (fitnesser == null)
			shortFileName = fileIndex + ".py";
		else
			shortFileName = fileIndex + "." + fitnesser.getClass().getSimpleName() + ".py";
		String fileName = EvolutionaryService.generationFolder(gt, targetGeneration) + shortFileName;
		try (FileOutputStream fos = new FileOutputStream(fileName)) {
			fos.write(code.getBytes());
			return shortFileName;
		}
	}

	public StringBuilder getGatesCode() {
		StringBuilder sb = new StringBuilder();
		for (int j = 0; j < this.numberOfBlocks; j++) {
			sb.append("\n#Block " + (j + 1) + "\n");
			sb.append(this.block.getCode());
		}
		return sb;
	}
}
