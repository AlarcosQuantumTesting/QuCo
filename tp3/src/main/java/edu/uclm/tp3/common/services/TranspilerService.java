package edu.uclm.tp3.common.services;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import edu.uclm.tp3.common.transpilation.DtoTranspilationWork;
import edu.uclm.tp3.common.transpilation.TranspilationTask;
import edu.uclm.tp3.common.transpilation.TranspilationWork;
import edu.uclm.tp3.common.transpilation.TranspiledCircuit;
import edu.uclm.tp3.transpiler.Backend;

@Service
public class TranspilerService {

    @Autowired
    private edu.uclm.tp3.dao.BackendDao backendDao;
    @Autowired
    private edu.uclm.tp3.common.transpilation.TranspilationWorkDao transpilationWorkDao;
    @Autowired
    private edu.uclm.tp3.common.transpilation.TranspiledCircuitDao transpiledCircuitDao;

    public List<Backend> getBackends() {
        return this.backendDao.findAll();
    }

    public void addBackend(Backend backend) {
        this.backendDao.save(backend);
    }

    public String transpile(String code, String name, List<String> backends) {
        TranspilationTask tw = new TranspilationTask(code, name, backends, this.transpilationWorkDao, this.transpiledCircuitDao);
        Thread t = new Thread(tw);
        t.start();
        return tw.getId();
    }

    public TranspilationWork getTranspilationWork(String id) {
        return this.transpilationWorkDao.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Transpilation work not found with id: " + id));
    }

    public List<TranspiledCircuit> getTranspiledCircuits(String id) {
        return this.transpiledCircuitDao.findByParentWorkId(id);
    }

    public List<DtoTranspilationWork> getListOfTranspilationWorks() {
        List<DtoTranspilationWork> result = new java.util.ArrayList<>();
        List<TranspilationWork> ttww = this.transpilationWorkDao.getListOfTranspilationWorks();
        for (TranspilationWork tw : ttww) {
            DtoTranspilationWork dto = new DtoTranspilationWork();
            dto.setId(tw.getId());
            dto.setName(tw.getName());
            dto.setCreationDateTime(tw.getCreationDateTime());
            List<String> backends = tw.getBackends();
            for (String backend : backends) {
                TranspiledCircuit tc = this.transpiledCircuitDao.findByParentWorkIdAndBackend(tw.getId(), backend);
                Object[] statusLine = new Object[5];
                if (tc!=null) {
                    statusLine[0] = tc.getId();
                    statusLine[1] = backend;
                    if (tc.getErrors() != null) {
                        statusLine[4] = true;
                        statusLine[2] = tc.getErrors();
                    } else {
                        statusLine[4] = false;
                        statusLine[2] = tc.getCode();
                    }
                    statusLine[3] = true;
                } else {
                    statusLine[0] = null;
                    statusLine[1] = backend;
                    statusLine[2] = "Not transpiled yet";
                    statusLine[3] = false;
                }                     
                dto.addBackend(statusLine);
            }
            result.add(dto);
        }
        return result;
    }

    public String getTranspiledCode(String id) {
       return this.transpiledCircuitDao.findById(id).get().getCode();
    }

    public String getErrors(String id) {
       return this.transpiledCircuitDao.findById(id).get().getErrors();
    }
}
