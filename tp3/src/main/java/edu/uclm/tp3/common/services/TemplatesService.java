package edu.uclm.tp3.common.services;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import edu.uclm.tp3.Utils;
import edu.uclm.tp3.common.model.CodeTemplate;

@Service
public class TemplatesService {

	public List<CodeTemplate> getTemplates() throws IOException {
		List<CodeTemplate> templates = new ArrayList<>();
		PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        Resource[] resources = resolver.getResources("classpath*:*.template.txt");
        for (Resource resource : resources) {
        	String fn = resource.getFilename();
        	CodeTemplate template = new CodeTemplate();
        	template.setCode(Utils.readFileAsString(this, resource.getFilename()));
        	template.setFileName(fn);
            templates.add(template);
        }
		return templates;
	}

	public CodeTemplate createTemplate(CodeTemplate template) {
		String fileName = template.getFileName();
        String code = template.getCode();

        if (fileName == null || code == null) 
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fileName and code are mandatory");

        try {
            // Obtener la ruta real de src/main/resources
            String resourcePath = getClass().getClassLoader().getResource("").getPath();
            Path filePath = Paths.get(resourcePath, fileName);

            Files.write(filePath, code.getBytes());
            return template;
        } catch (Exception e) {
        	throw new ResponseStatusException(HttpStatus.valueOf(500), "Error saving the file");
        }
	}
	
}
