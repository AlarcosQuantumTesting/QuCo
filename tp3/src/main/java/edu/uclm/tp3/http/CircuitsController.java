package edu.uclm.tp3.http;

import java.util.Iterator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import edu.uclm.tp3.common.model.EdCircuit;
import edu.uclm.tp3.dao.EdCircuitDao;
import edu.uclm.tp3.common.model.CircuitEditorPayload;
import edu.uclm.tp3.common.services.CircuitEditorService;
import java.util.Map;
import org.springframework.http.ResponseEntity;

@RestController
@RequestMapping("circuits")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class CircuitsController {

    @Autowired
    private EdCircuitDao circuitDao;

    @Autowired
    private CircuitEditorService circuitEditorService;

    @PostMapping("/generateCode")
    public ResponseEntity<Map<String, Object>> generateCode(@RequestBody CircuitEditorPayload payload) throws Exception {
        Map<String, Object> result = this.circuitEditorService.generateCode(payload);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/saveCircuit")
    public void saveCircuit(@RequestBody EdCircuit circuit) {
        circuit.getQubits().forEach(q -> q.setCircuit(circuit));
        circuit.getQubits().stream().forEach(q -> q.getGates().forEach(g -> g.setQubitId(q)));
        this.circuitDao.save(circuit);
    }

    @GetMapping("/getCircuitNames")
    public Iterator<String> getCircuitNames() {
        return this.circuitDao.findAll().stream().map(EdCircuit::getName).iterator();
    }

    @GetMapping("/getCircuit/{name}")
    public EdCircuit getCircuit(@PathVariable String name) {
        return this.circuitDao.findById(name).get();
    }
}

