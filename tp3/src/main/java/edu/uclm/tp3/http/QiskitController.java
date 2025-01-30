package edu.uclm.tp3.http;

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

import edu.uclm.tp3.qiskit.QiskitCoder;
import edu.uclm.tp3.quirk.QuirkReducer;

@RestController
@RequestMapping("qiskit")
@CrossOrigin("*")
public class QiskitController {
	
	@Autowired
	private QiskitCoder coder;
	
	@SuppressWarnings("unchecked")
	@PutMapping("/getCode")
	public Map<String, String[]> getCode(@RequestBody Map<String, Object> info) {
		try {
			boolean reduce = info.containsKey("reduce") && (boolean) info.get("reduce");
			String[] code;
			if (reduce) {
				List<List<Integer>> receivedMatrixes = (List<List<Integer>>) info.get("matrix");
				int inputQubits = (int) info.get("inputQubits");
				int qubits = (int) info.get("qubits");
				String domain = info.get("domain").toString().trim().toUpperCase();
				
				List<List<List<Integer>>> reducedMatrixes = QuirkReducer.reduce(receivedMatrixes, inputQubits, qubits);
				code = this.coder.getCodeReduced(reducedMatrixes, inputQubits, qubits, domain);
			} else {
				code = this.coder.getCode(info);				
			}
			
			Map<String, String[]> result = new HashMap<>();
			
			result.put("code", code);
			return result;
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Algo ha pasado al generar el código");
		}
	}
}
