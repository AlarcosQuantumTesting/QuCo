package edu.uclm.tp3.http;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import javax.servlet.http.HttpSession;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import edu.uclm.tp3.common.deterministic.FreqTable;
import edu.uclm.tp3.common.services.DeterministicService;

@RestController
@RequestMapping("deterministic")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class DeterministicController {
	
	@Autowired
	private DeterministicService service;
	
	@GetMapping("/getTemplates")
	public List<Map<String, String>> getTemplates() throws IOException {
		return this.service.getTemplates();
	}
		
	@PostMapping("/calculate") @ResponseBody
	public Map<String, Object> calculate(HttpSession session, @RequestBody Map<String, Object> info) {
		JSONObject jso = new JSONObject(info);
		
		int qubits = jso.getInt("qubits");
		
		double physicalAngle = jso.getDouble("physicalAngle");

		String functionPrefix = jso.optString("functionPrefix");

		boolean originalGR = jso.getBoolean("originalGR");
		
		FreqTable expectedFrequencies = new FreqTable(jso.getJSONObject("expectedFrequencies"));
		expectedFrequencies.sort();
		try {
			Map<String, Object> result = this.service.calculate(qubits, expectedFrequencies, physicalAngle, functionPrefix, originalGR);
			return result;
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
		}
	}

	@PostMapping("/calculateSeparating") @ResponseBody
	public Map<String, Object> calculateSeparating(HttpSession session, @RequestBody Map<String, Object> info) {
		JSONObject jso = new JSONObject(info);
		
		int qubits = jso.getInt("qubits");
		
		double physicalAngle = jso.getDouble("physicalAngle");

		String functionPrefix = jso.optString("functionPrefix");

		boolean originalGR = jso.getBoolean("originalGR");
		FreqTable expectedFrequencies = new FreqTable(jso.getJSONObject("expectedFrequencies"));
		expectedFrequencies.sort();
		
		try {
			Map<String, Object> result = this.service.calculateSeparating(qubits, expectedFrequencies, physicalAngle, functionPrefix, originalGR);
			return result;
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
		}
	}
}

