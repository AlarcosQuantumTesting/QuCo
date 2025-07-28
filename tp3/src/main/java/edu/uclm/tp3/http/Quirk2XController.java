package edu.uclm.tp3.http;

import java.util.Map;

import org.json.JSONObject;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import edu.uclm.tp3.coders.Quirk2Qiskit;
import edu.uclm.tp3.common.deterministic.QCircuit;

@RestController
@RequestMapping("quirk2x")
@CrossOrigin("*")
public class Quirk2XController {
	
	@PostMapping("/getCode")
	public String getCode(@RequestBody Map<String, Object> circuit) {
		try {
			JSONObject jsoCircuit = new JSONObject(circuit);
			QCircuit qCircuit = QCircuit.build(jsoCircuit);
			StringBuilder sb = new StringBuilder("from qiskit import QuantumCircuit\n");
			sb.append("from qiskit.circuit.library import *");

			StringBuilder sbGatesDeclaration = Quirk2Qiskit.getGatesDeclaration(qCircuit);
			if (sbGatesDeclaration.length()>0)
				sb.append("\n\n").append(sbGatesDeclaration);

			sb.append("circuit = QuantumCircuit(" + qCircuit.getQubits() + ")\n");

			sb.append(Quirk2Qiskit.getColumnsDeclaration(qCircuit));
			sb.append("print(circuit)");
			return sb.toString();
		} catch (Exception e) {
			throw new RuntimeException("Error generating code: " + e.getMessage(), e);	
		}
	}
	
}
