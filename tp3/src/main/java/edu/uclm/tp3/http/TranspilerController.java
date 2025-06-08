package edu.uclm.tp3.http;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import edu.uclm.tp3.common.services.TranspilerService;
import edu.uclm.tp3.common.transpilation.DtoTranspilationWork;
import edu.uclm.tp3.common.transpilation.TranspilationWork;
import edu.uclm.tp3.common.transpilation.TranspiledCircuit;
import edu.uclm.tp3.transpiler.Backend;

@RestController
@RequestMapping("transpiler")
@CrossOrigin("*")
public class TranspilerController {

	@Autowired
	private TranspilerService service;
	
	@GetMapping("/getBackends")
	public List<Backend> getBackends() {
		return service.getBackends();
	}

	@PostMapping("/addBackend")
	public void addBackend(@RequestBody Backend backend) {
		service.addBackend(backend);
	}

	@SuppressWarnings("unchecked")
	@PostMapping("/transpile")
	public String transpile(@RequestBody Map<String, Object> info) {
		String code = (String) info.get("code");
		List<String> backends = (List<String>) info.get("backends");
		String name = null;
		if (info.containsKey("name"))
			name = (String) info.get("name");
		return service.transpile(code, name, backends);
	}

	@GetMapping("/getStatus/{id}")
	public int getProgress(@PathVariable String id) {
		return service.getTranspilationWork(id).getProgress();
	}

	@GetMapping("/getTranspiledCircuits/{id}")
	public List<TranspiledCircuit> getTranspiledCircuits(@PathVariable String id) {
		return service.getTranspiledCircuits(id);
	}

	@GetMapping("/getListOfTranspilationWorks")
	public List<DtoTranspilationWork> getListOfTranspilationWorks() {
		return service.getListOfTranspilationWorks();
	}

	@DeleteMapping("/cancelTranspilation")
	public void cancelTranspilation(@RequestParam String id) {
		service.cancelTranspilation(id);
	}

	@GetMapping("/getTranspiledCode")
	public Map<String, String> getTranspiledCode(@RequestParam String id) {
		Map<String, String> result = new HashMap<>();
		result.put("code", service.getTranspiledCode(id));
		return result;
	}

	@GetMapping("/getErrors")
	public Map<String, String> getErrors(@RequestParam String id) {
		Map<String, String> result = new HashMap<>();
		result.put("code", service.getErrors(id));
		return result;
	}
}
