package edu.uclm.tp3.http;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import edu.uclm.tp3.common.services.TranspilerService;
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
}
