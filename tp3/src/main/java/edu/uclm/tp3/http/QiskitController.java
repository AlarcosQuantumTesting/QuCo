package edu.uclm.tp3.http;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import edu.uclm.tp3.common.model.CodeTemplate;
import edu.uclm.tp3.common.model.QiskitCode;
import edu.uclm.tp3.dao.QiskitCodeDao;
import edu.uclm.tp3.qiskit.NewQiskitCoder;

@RestController
@RequestMapping("qiskit")
@CrossOrigin("*")
public class QiskitController {
	
	@Autowired
	private NewQiskitCoder coder;

	@Autowired
	private QiskitCodeDao qiskitCodeDao;

	@GetMapping("/getCustomizedGates")
	public List<QiskitCode> getCustomizedGates() {
		return this.qiskitCodeDao.findAll();
	}

	@DeleteMapping("/deleteGate/{name}")
	public void deleteGate(@PathVariable String name) {
		try {
			this.qiskitCodeDao.deleteById(name);
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se ha podido eliminar la puerta personalizada");
		}
	}

	@SuppressWarnings("unchecked")
	@PostMapping("/saveCode")
	public void saveCode(@RequestBody Map<String, Object> info) {
		QiskitCode code = new QiskitCode();
		code.setName(info.get("name").toString());
		code.setDescription(info.get("description").toString());
		code.setFunction((boolean) info.get("isFunction"));
		List<String> lines = (List<String>) info.get("lines");
		StringBuilder sb = new StringBuilder();
		for (String line : lines)
			sb.append(line).append("\n");
		code.setCode(sb.toString());
		code.setQubits((Integer) info.get("qubits"));
		this.qiskitCodeDao.save(code);
	}
	
	@SuppressWarnings("unchecked")
	@PutMapping("/getCode")
	public Map<String, String> getCode(@RequestBody Map<String, Object> info) {
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

			String code = this.coder.getCode(receivedMatrixes, inputQubits, qubits, domain, reduce, template, functionName);
			String expected = this.coder.getExpected(receivedMatrixes, qubits-inputQubits);
			code = code.replace("#EXPECTED#", "expected = " + expected);
			Map<String, String> result = new HashMap<>();			
			result.put("code", code);
			return result;
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Algo ha pasado al generar el código");
		}
	}
}
