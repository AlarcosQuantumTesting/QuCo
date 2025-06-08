package edu.uclm.tp3.common.services;

import java.util.List;
import java.util.Map;

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

    private Map<String, TranspilationTask> transpilationTasks = new java.util.HashMap<>();

    public List<Backend> getBackends() {
        return this.backendDao.findAll();
    }

    public void addBackend(Backend backend) {
        this.backendDao.save(backend);
    }

    public String transpile(String code, String name, List<String> backends) {
        TranspilationTask tw = new TranspilationTask(this, code, name, backends, this.transpilationWorkDao, this.transpiledCircuitDao);
        this.transpilationTasks.put(tw.getId(), tw);
        Thread t = new Thread(tw);
        t.start();
        return tw.getId();
    }

    public void cancelTranspilation(String id) {
        TranspilationTask tw = this.transpilationTasks.get(id);
        if (tw!=null) {
            tw.stop();
            this.transpilationTasks.remove(id);
        }
        this.transpilationWorkDao.deleteById(id);
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
            dto.setProgress(tw.getProgress());
            List<String> backends = tw.getBackends();
            for (String backend : backends) {
                TranspiledCircuit tc = this.transpiledCircuitDao.findByParentWorkIdAndBackend(tw.getId(), backend);
                DtoStatusLine dtoStatusLine = new DtoStatusLine();
                dtoStatusLine.setBackend(backend);
                if (tc!=null) {
                    dtoStatusLine.setId(tc.getId());
                    if (tc.getErrors() != null) {
                        dtoStatusLine.setHasErrors(true);
                    } else {
                        dtoStatusLine.setHasErrors(false);
                    }
                    dtoStatusLine.setTime(tc.getTime());
                    dtoStatusLine.setFinished(true);
                } 
                dto.addStatusLine(dtoStatusLine);
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

    public void removeTask(String id) {
       this.transpilationTasks.remove(id);
    }
}
