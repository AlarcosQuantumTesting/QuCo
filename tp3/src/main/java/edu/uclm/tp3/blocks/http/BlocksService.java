package edu.uclm.tp3.blocks.http;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import edu.uclm.tp3.blocks.model.BlockCircuit;
import edu.uclm.tp3.blocks.model.BlockColumn;
import edu.uclm.tp3.common.model.Circuit;
import edu.uclm.tp3.common.model.ProblemConfiguration;
import edu.uclm.tp3.common.model.ProblemInputConfiguration;
import edu.uclm.tp3.common.services.EvolutionaryService;
import edu.uclm.tp3.ws.HWSession;

@Service
public class BlocksService extends EvolutionaryService {

	@Override
	public String getInitialization(ProblemConfiguration pc) {
		ProblemInputConfiguration gic = pc.getInputConfiguration();
		BlockCircuit blockCircuit = gic.getBlockCircuit();
		List<BlockColumn> startingColumns = blockCircuit.getStartingColumns();
		
		StringBuilder sbH = new StringBuilder();
		for (int i=0; i<startingColumns.size(); i++) {
			BlockColumn column = startingColumns.get(i);
			for (int j=0; j<column.getGates().size(); j++)
				sbH.append(column.getGates().get(j).getCode());
		}
		return sbH.toString();
	}

	@Override
	protected void buildIndividuals(String token, ProblemConfiguration pc, String[] startEnd, int initialLength, HWSession hw) throws Exception {
		int targetGeneration = pc.getTargetGeneration();
		int populationSize = pc.getInputConfiguration().getPopulationSize();
		for (int i=0; i<populationSize; i++) {
			Circuit circuit = generateRandomCircuit(pc, initialLength);
			if (i%10==0 || i==populationSize-1)
				hw.send((i+1) + " of " + populationSize);
			circuit.save(token, targetGeneration, i, null);
			String gatesCode = circuit.getGatesCode();
			StringBuilder sb = new StringBuilder().append(startEnd[0]).append(gatesCode).append(startEnd[1]);
			circuit.saveCode(token, targetGeneration, i, null, sb.toString());

			BlockCircuit block = new BlockCircuit(pc.getInputConfiguration().getBlockCircuit());
			block.getBlock().setBlock(circuit);
			block.save(token, targetGeneration, i, null);
			sb = new StringBuilder().append(startEnd[0]).append(block.getGatesCode()).append(startEnd[1]);
			block.saveCode(token, targetGeneration, i, null, sb.toString());
		}
	}
	
	@Override
	public String getCode(String gt, int generation, int index, String fitnesserName, String templateStart, String templateEnd) throws Exception {
		String fileName = getFile(gt, generation).getAbsolutePath() + File.separatorChar + index;
		if (generation>0)
			fileName = fileName + "." + fitnesserName;
		fileName = fileName + ".py";
		String result;
		try(FileInputStream fis = new FileInputStream(fileName)) {
			byte[] b = new byte[fis.available()];
			fis.read(b);
			result = new String(b);
		} catch (FileNotFoundException e) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Sorry, we can't find the file");
		}
		return result;
	}
}