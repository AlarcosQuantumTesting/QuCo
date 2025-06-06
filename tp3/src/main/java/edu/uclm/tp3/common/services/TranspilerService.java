package edu.uclm.tp3.common.services;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import edu.uclm.tp3.common.transpilation.TranspilationWork;
import edu.uclm.tp3.transpiler.Backend;

@Service
public class TranspilerService {

    @Autowired
    private edu.uclm.tp3.dao.BackendDao backendDao;

    public List<Backend> getBackends() {
        return this.backendDao.findAll();
    }

    public void addBackend(Backend backend) {
        this.backendDao.save(backend);
    }

    public String transpile(String code, String name, List<String> backends) {
        TranspilationWork tw = new TranspilationWork(code, name, backends);
        Thread t = new Thread(tw);
        t.start();
        return tw.getId();
    }

}
