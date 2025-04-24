package edu.uclm.tp3.http;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import edu.uclm.tp3.common.deterministic.QCircuit;
import edu.uclm.tp3.common.deterministic.QGroverer;
import edu.uclm.tp3.common.model.CodeTemplate;
import edu.uclm.tp3.qiskit.NewGroverCoder;

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
	public Map<String, String[]> getCode(@RequestBody Map<String, Object> info, @RequestParam Boolean useMCX, @RequestParam(required = false) Boolean inParallel) {
		try {
			List<List<Integer>> receivedMatrixes = (List<List<Integer>>) info.get("matrix");
			Map<String, Object> receivedTemplate = (Map<String, Object>) info.get("template");
			CodeTemplate template = new CodeTemplate();
			template.setFileName(receivedTemplate.get("fileName").toString());
			template.setCode(receivedTemplate.get("code").toString());

			String functionName = null;
			if (info.containsKey("functionName"))
				functionName = info.get("functionName").toString();
			
			Map<String, Object> quirk = this.getAllQuirk(receivedMatrixes, useMCX, inParallel);
			String[] code = this.coder.getCode(quirk, template, functionName);		
			
			Map<String, String[]> result = new HashMap<>();
			result.put("code", code);
			return result;
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Algo ha pasado al generar el código");
		}
	}
	
	@PutMapping("/getQuirk")
	public Map<String, Object> getQuirk(@RequestBody List<Integer> info, @RequestParam Boolean useMCX, @RequestParam(required = false) Boolean separating) {
		List<List<Integer>> receivedMatrixes = new ArrayList<>();
		receivedMatrixes.add(info);
		return this.getAllQuirk(receivedMatrixes, useMCX, separating);
	}

	@PutMapping("/getAllQuirk")
	public Map<String, Object> getAllQuirk(@RequestBody List<List<Integer>> receivedMatrixes, @RequestParam Boolean useMCX, @RequestParam(required = false) Boolean separating) {
		List<Double> expected = new ArrayList<>();
		QCircuit circuit = QGroverer.buildGrover(receivedMatrixes, useMCX, separating, expected);
		Map<String, Object> result = new HashMap<>();
		JSONObject jsoCircuit = circuit.toJson().getJSONObject("circuit");

		result.put("cols", jsoCircuit.getJSONArray("cols").toList());
		result.put("expected", expected);
		return result;
	}

}
