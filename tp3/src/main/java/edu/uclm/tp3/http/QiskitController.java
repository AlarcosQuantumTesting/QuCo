package edu.uclm.tp3.http;

import java.util.HashMap;
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
import edu.uclm.tp3.qiskit.NewQiskitCoder;

@RestController
@RequestMapping("qiskit")
@CrossOrigin("*")
public class QiskitController {
	
	@Autowired
	private NewQiskitCoder coder;
	
	@SuppressWarnings("unchecked")
	@PutMapping("/getCode")
	public Map<String, String[]> getCode(@RequestBody Map<String, Object> info) {
		try {
			boolean reduce = info.containsKey("reduce") && (boolean) info.get("reduce");

			Map<String, Object> receivedTemplate = (Map<String, Object>) info.get("template");
			CodeTemplate template = new CodeTemplate();
			template.setFileName(receivedTemplate.get("fileName").toString());
			template.setCode(receivedTemplate.get("code").toString());

			String functionName = null;
			if (info.containsKey("functionName"))
				functionName = info.get("functionName").toString();

			int inputQubits = (int) info.get("inputQubits");
			int qubits = (int) info.get("qubits");
			String domain = info.get("domain").toString().trim().toUpperCase();

			Object receivedMatrixes = info.get("matrix");

			String[] code = this.coder.getCode(receivedMatrixes, inputQubits, qubits, domain, reduce, template, functionName);


			/*if (reduce) {
				List<List<Integer>> receivedMatrixes = (List<List<Integer>>) info.get("matrix");

				List<List<List<Integer>>> reducedMatrixes = QuirkReducer.reduce(receivedMatrixes, inputQubits, qubits);
				code = this.coder.getCodeReduced(reducedMatrixes, inputQubits, qubits, domain, template, functionName);
			} else {
				code = this.coder.getCode(info, template);				
			}*/
			
			Map<String, String[]> result = new HashMap<>();
			
			result.put("code", code);
			return result;
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Algo ha pasado al generar el código");
		}
	}
}
