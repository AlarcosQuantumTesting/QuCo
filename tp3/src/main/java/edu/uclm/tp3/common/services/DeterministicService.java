package edu.uclm.tp3.common.services;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Service;

import edu.uclm.tp3.Utils;
import edu.uclm.tp3.common.deterministic.BinaryTree;
import edu.uclm.tp3.common.deterministic.MatrixSolver;
import edu.uclm.tp3.common.deterministic.UnifierSolver;
import edu.uclm.tp3.common.deterministic.SmallAnglesRemovalSolver;
import edu.uclm.tp3.common.deterministic.Solver;
import edu.uclm.tp3.common.deterministic.GroverRudolphSolver;
import edu.uclm.tp3.common.model.Circuit;

@Service
public class DeterministicService {
	
	public Map<String, Object> calculate(int qubits, 
			List<Integer> expectedFrequencies, boolean usePhysicalAngle, double physicalAngle, boolean unifySimiliarNodes) throws Exception {
		
		int nOfOutputs = (int) Math.pow(2, qubits);
		int shots = expectedFrequencies.stream().mapToInt(Integer::intValue).sum();

		BinaryTree tree = new BinaryTree();
		for (int i=0; i<qubits-1; i++)
			tree.addChildren(0);
		
		for (int i=0; i<nOfOutputs; i++) {
			String binary = String.format("%" + qubits + "s", Integer.toBinaryString(i)).replace(' ', '0');
			int freq = expectedFrequencies.get(i);
			tree.setFrequencies(binary, freq);
		}
		
		tree.normalizeProbabilities();
		
		Circuit circuit = new Circuit();
		circuit.setQubits(qubits);
		
		Solver solver = null;
		if (usePhysicalAngle && unifySimiliarNodes) {
			tree.removeLowAngles(physicalAngle);
			solver = new UnifierSolver(tree, circuit);
		} else if (usePhysicalAngle) {
			tree.removeLowAngles(physicalAngle);
			solver = new SmallAnglesRemovalSolver(tree, circuit);
		} else { 
			solver = new GroverRudolphSolver(tree, circuit);
		}

		return solver.solve(shots);
	}

	public List<Map<String, String>> getTemplates() throws IOException {
		List<Map<String, String>> templates = new ArrayList<>();
		PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        Resource[] resources = resolver.getResources("classpath*:d.*");
        for (Resource resource : resources) {
        	String fn = resource.getFilename();
        	HashMap<String, String> template = new HashMap<>();
        	template.put("code", Utils.readFileAsString(this, resource.getFilename()));
        	fn = fn.substring(fn.lastIndexOf(File.separatorChar)+1);
        	template.put("name", fn);
            templates.add(template);
        }
		return templates;
	}

}
