package edu.uclm.tp3.common.services;

import java.io.IOException;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import edu.uclm.tp3.common.model.CodeTemplate;
import edu.uclm.tp3.dao.TemplateDao;

@Service
public class TemplatesService {

    @Autowired
    private TemplateDao templateDao;

	public List<CodeTemplate> getTemplates() throws IOException {
		/*List<CodeTemplate> templates = new ArrayList<>();
		PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        Resource[] resources = resolver.getResources("classpath*:*.template.txt");
        for (Resource resource : resources) {
        	String fn = resource.getFilename();
        	CodeTemplate template = new CodeTemplate();
        	template.setCode(Utils.readFileAsString(this, resource.getFilename()));
        	template.setFileName(fn);
            templates.add(template);
        }
		return templates;*/
        return this.templateDao.findAll();
	}

	public CodeTemplate createTemplate(CodeTemplate template) {
		String fileName = template.getFileName();
        String code = template.getCode();

        if (fileName == null || code == null) 
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fileName and code are mandatory");

        try {
            /*String resourcePath = getClass().getClassLoader().getResource("").getPath();
            Path filePath = Paths.get(resourcePath, fileName);

            Files.write(filePath, code.getBytes());*/
            this.templateDao.save(template);
            return template;
        } catch (Exception e) {
        	throw new ResponseStatusException(HttpStatus.valueOf(500), "Error saving the file");
        }
	}
	
}
