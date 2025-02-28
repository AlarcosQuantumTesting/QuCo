package edu.uclm.tp3.http;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import edu.uclm.tp3.common.model.CodeTemplate;
import edu.uclm.tp3.qiskit.GroverSolver;
import edu.uclm.tp3.qiskit.NewGroverCoder;
import edu.uclm.tp3.quirk.QuirkSolver;

@RestController
@RequestMapping("grover")
@CrossOrigin("*")
public class GroverController {
	
	@Autowired
	private NewGroverCoder coder;
	
	@PutMapping("/getQiskitMatrix")
	public Map<String, String[]> getQiskitMatrix(@RequestBody List<List<Integer>> receivedMatrixes) {
		throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Function not implemented yet");
	}
	
	@SuppressWarnings("unchecked")
	@PutMapping("/getCode")
	public Map<String, String[]> getCode(@RequestBody Map<String, Object> info) {
		try {
			List<List<Integer>> receivedMatrixes = (List<List<Integer>>) info.get("matrix");
			Map<String, Object> receivedTemplate = (Map<String, Object>) info.get("template");
			CodeTemplate template = new CodeTemplate();
			template.setFileName(receivedTemplate.get("fileName").toString());
			template.setCode(receivedTemplate.get("code").toString());

			String functionName = null;
			if (info.containsKey("functionName"))
				functionName = info.get("functionName").toString();
			
			Map<String, Object> quirk = this.getAllQuirk(receivedMatrixes);
			String[] code = this.coder.getCode(quirk, template, functionName);		
			
			Map<String, String[]> result = new HashMap<>();
			result.put("code", code);
			return result;
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Algo ha pasado al generar el código");
		}
	}
	
	@PutMapping("/getQuirk")
	public Map<String, Object> getQuirk(@RequestBody List<Integer> info) {
		List<List<Integer>> receivedMatrixes = new ArrayList<>();
		receivedMatrixes.add(info);
		return this.getAllQuirk(receivedMatrixes);
	}

	@PutMapping("/getAllQuirk")
	public Map<String, Object> getAllQuirk(@RequestBody List<List<Integer>> receivedMatrixes) {
		int qubits = receivedMatrixes.get(0).size();
		double N = Math.pow(2, qubits);
		double M = receivedMatrixes.size();
		if (M>=N/2) {
			for (int i=0; i<M; i++)
				receivedMatrixes.get(i).add(0);
			qubits++;
		}
		int nOptimal = (int) Math.floor(Math.PI/4*Math.sqrt(N/M));
		
		List<Object> init = QuirkSolver.getInit(qubits);
		List<Object> hh = GroverSolver.getGate(qubits, "H");
		
		List<List<Object>> oracle = GroverSolver.guessGroverOracle(receivedMatrixes, qubits);
		List<Object> barriers = GroverSolver.getGate(qubits, "…");
		List<List<Object>> difussor = GroverSolver.guessDifussor(qubits);
		
		List<List<Object>> matrixes = new ArrayList<>();
		matrixes.add(hh);
		matrixes.add(barriers);
		for (int i=0; i<nOptimal; i++) {
			matrixes.addAll(oracle);
			matrixes.add(barriers);
			matrixes.addAll(difussor);
			if (i!=nOptimal-1)
				matrixes.add(barriers);
		}
		
		Map<String, Object> result = new HashMap<>();
		result.put("init", init);
		result.put("cols", matrixes);
		return result;
	}
}
