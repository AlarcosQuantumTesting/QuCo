package edu.uclm.tp3.http;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import edu.uclm.tp3.quirk.QuirkReducer;
import edu.uclm.tp3.quirk.QuirkReducedSolver;
import edu.uclm.tp3.quirk.QuirkSolver;

@RestController
@RequestMapping("quirk")
@CrossOrigin("*")
public class QuirkController {
	
	@SuppressWarnings("unchecked")
	@PutMapping("/getQuirk")
	public Map<String, Object> getQuirk(@RequestBody Map<String, Object> info) {
		List<Integer> receivedMatrix = (List<Integer>) info.get("matrix");
		int inputQubits = (int) info.get("inputQubits");
		int qubits = (int) info.get("qubits");
		String domain = info.get("domain").toString().trim().toUpperCase();
		
		List<Object> init = QuirkSolver.getInit(qubits);
		List<List<Object>> matrixes;
		if (domain.equals("AMPLITUDE"))
			matrixes = QuirkSolver.guessAmplitudeGates(receivedMatrix, inputQubits, qubits);
		else
			matrixes = QuirkSolver.guessPhaseGates(receivedMatrix, inputQubits, qubits);
		Map<String, Object> result = new HashMap<>();
		result.put("init", init);
		result.put("cols", matrixes);
		return result;
	}
	
	@SuppressWarnings("unchecked")
	@PutMapping("/getAllQuirk")
	public Map<String, Object> getAllQuirk(@RequestBody Map<String, Object> info) {
		List<List<Integer>> receivedMatrixes = (List<List<Integer>>) info.get("matrix");
		int inputQubits = (int) info.get("inputQubits");
		int qubits = (int) info.get("qubits");
		boolean reduce = info.containsKey("reduce") && (boolean) info.get("reduce");
		String domain = info.get("domain").toString().trim().toUpperCase();

		List<Object> init = QuirkSolver.getInit(qubits);
		List<List<Object>> matrixes = null;
		if (reduce) {
			List<List<List<Integer>>> reducedMatrixes = QuirkReducer.reduce(receivedMatrixes, inputQubits, qubits);
			matrixes = QuirkReducedSolver.guessAllReducedGates(reducedMatrixes, inputQubits, qubits, domain);
		} else {
			matrixes = QuirkSolver.guessAllGates(receivedMatrixes, inputQubits, qubits, domain);
		}
		
		Map<String, Object> result = new HashMap<>();
		result.put("init", init);
		result.put("cols", matrixes);
		return result;
	}
}
