package edu.uclm.tp3.http;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import edu.uclm.tp3.classic.QMatrix;
import edu.uclm.tp3.classic.QSolver;

@RestController
@RequestMapping("classicMatrix")
@CrossOrigin("*")
public class ClassicMatrixController {
	
	@GetMapping("/getEmptyMatrix")
	public QMatrix getEmptyMatrix(@RequestParam(required = false) int inputQubits, @RequestParam int outputQubits) {
		return new QMatrix(inputQubits, outputQubits);
	}

	@PutMapping("/getMatrixesInJSON")
	public Map<String, Object> getMatrixesInJSON(@RequestBody Map<String, Object> info) {
		List<QMatrix> gates = calculateMatrixes(info);
		QMatrix finalGate = QMatrix.multiply(gates);
		
		Map<String, Object> result = new HashMap<>();
		result.put("intermediate", gates);
		result.put("finalGate", finalGate);
		return result;
	}
	
	@PutMapping("/getMatrixesForQiskit")
	public Map<String, Object> getMatrixesForQiskit(@RequestBody Map<String, Object> info) {
		List<QMatrix> gates = calculateMatrixes(info);
		QMatrix finalGate = QMatrix.multiply(gates);
		
		Map<String, Object> result = new HashMap<>();
		result.put("intermediate", this.toQiskitCode(gates));
		result.put("finalGate", finalGate.toQiskitCode(-1));
		return result;
	}
	
	private List<String> toQiskitCode(List<QMatrix> gates) {
		ArrayList<String> result = new ArrayList<>();
		for (int i=0; i<gates.size(); i++)
			result.add(gates.get(i).toQiskitCode(i));
		return result;
	}

	private List<QMatrix> calculateMatrixes(Map<String, Object> info) {
		JSONObject jso = new JSONObject(info);
		int qubits = jso.getInt("qubits");
		int inputQubits = jso.optInt("inputQubits");
		
		JSONArray jsaOnes = jso.getJSONArray("ones");
		int nOnes = jsaOnes.length();
		if (nOnes==0)
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "There are no rows ending in 1");
		int[] ones = new int[nOnes];
		for (int i=0; i<nOnes; i++)
			ones[i] = jsaOnes.getInt(i);
		
		QMatrix input = new QMatrix(qubits, inputQubits);
		QMatrix expected = input.expects(ones);
		
		return QSolver.guessGates(input, expected);
	}
}
