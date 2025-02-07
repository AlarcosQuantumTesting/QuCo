package edu.uclm.tp3.http;

import java.io.IOException;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import edu.uclm.tp3.common.model.CodeTemplate;
import edu.uclm.tp3.common.services.TemplatesService;

@RestController
@RequestMapping("templates")
@CrossOrigin("*")
public class TemplatesController {
	
	@Autowired
	private TemplatesService service;
	
	@GetMapping("/getTemplates")
	public List<CodeTemplate> getTemplates() throws IOException {
		return this.service.getTemplates();
	}
	
	@PostMapping("/createTemplate") 
	public CodeTemplate createTemplate(@RequestBody CodeTemplate template) {
		if (!template.getFileName().endsWith(".template.txt"))
			template.setFileName(template.getFileName() + ".template.txt");
		return this.service.createTemplate(template);
	}
	
	@PostMapping("/updateTemplate") 
	public CodeTemplate updateTemplate(@RequestBody CodeTemplate template) {
		return null;
	}
}
