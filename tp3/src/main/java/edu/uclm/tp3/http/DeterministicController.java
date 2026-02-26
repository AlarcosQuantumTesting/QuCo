package edu.uclm.tp3.http;

import java.io.IOException;
import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import com.fasterxml.jackson.databind.ObjectMapper;

import edu.uclm.tp3.common.deterministic.FreqTable;
import edu.uclm.tp3.common.services.DeterministicService;
import edu.uclm.tp3.common.services.GroverService;
import edu.uclm.tp3.common.services.HammingService;

@RestController
@RequestMapping("deterministic")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class DeterministicController {
	
	@Autowired
	private DeterministicService service;
	@Autowired
	private GroverService groverService;
	@Autowired
	private HammingService hammingService;
	
	@GetMapping("/getTemplates")
	public List<Map<String, String>> getTemplates() throws IOException {
		return this.service.getTemplates();
	}

	@PostMapping(path = "/newCalculate", produces = MediaType.APPLICATION_JSON_VALUE) @ResponseBody
	public ResponseEntity<StreamingResponseBody> newCalculate(HttpServletRequest req, @RequestBody Map<String, Object> info) {
		JSONObject jso = new JSONObject(info);
		
		int qubits = jso.getInt("qubits");
		FreqTable expectedFrequencies = new FreqTable(jso.getJSONObject("expectedFrequencies"));
		if (expectedFrequencies.getPairs().size()==0)
			throw new ResponseStatusException(HttpStatus.NOT_ACCEPTABLE, "There are no selected values");
		double physicalAngle = jso.getDouble("physicalAngle");
		boolean inParallel = jso.getBoolean("inParallel");
		boolean splitCircuits = jso.getBoolean("splitCircuits");
		String functionPrefix = jso.optString("functionPrefix");
		String algorithm = jso.optString("algorithm", "grenoble");
		boolean originalGR = algorithm.equals("originalGR");
		boolean useMCX = jso.optBoolean("useMCX", false);
		
		expectedFrequencies.sort();
		try {
			Map<String, Object> result = null;
			if (algorithm.equals("grover")) {
				if (inParallel)
					result = this.groverService.calculateInParallel(qubits, expectedFrequencies, useMCX);
				else if (splitCircuits)
					result = this.groverService.calculateSplitting(qubits, expectedFrequencies, useMCX);
				else
					result = this.groverService.calculate(qubits, expectedFrequencies, useMCX);
			} else if (algorithm.equals("hamming")) {
				result = this.hammingService.calculate(qubits, expectedFrequencies, functionPrefix);
			} else {
				if (inParallel)
					result = this.service.calculateInParallel(qubits, expectedFrequencies, physicalAngle, functionPrefix, originalGR);
				else if (splitCircuits)
					result = this.service.calculateSplitting(qubits, expectedFrequencies, physicalAngle, functionPrefix, originalGR);
				else
					result = this.service.calculate(qubits, expectedFrequencies, physicalAngle, functionPrefix, originalGR);
			}
			return this.buildResponse(result);
		} catch (IOException e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST);

		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
		}
	}

	private ResponseEntity<StreamingResponseBody> buildResponse(Map<String, Object> result) {
		StreamingResponseBody body = out -> {
			new ObjectMapper().writeValue(out, result);
		};
		return ResponseEntity
			.ok()
			.contentType(MediaType.APPLICATION_JSON)
			.body(body);
	}
}

