package edu.uclm.tp3.http;

import java.util.Iterator;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import edu.uclm.tp3.common.model.QubitsConfiguration;
import edu.uclm.tp3.dao.QubitsConfigurationDao;

@RestController
@RequestMapping("qubitsConfigurations")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class QubitsConfigurationsController {

    @Autowired
    private QubitsConfigurationDao dao;
	
	@GetMapping("/getQubitConfigurationNames")
    public Iterator<String> getQubitConfigurationNames() {
        return this.dao.findAll().stream().map(QubitsConfiguration::getName).iterator();
    }

    @GetMapping("/getQubitsConfiguration/{name}")
    public QubitsConfiguration getQubitsConfiguration(@PathVariable String name) {
        return this.dao.findById(name).get();
    }

    @PostMapping("/saveQubitsConfiguration")
    public void saveQubitsConfiguration(@RequestBody QubitsConfiguration qc) {
        this.dao.save(qc);
    }
}

