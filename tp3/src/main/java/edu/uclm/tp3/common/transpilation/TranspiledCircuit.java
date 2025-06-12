package edu.uclm.tp3.common.transpilation;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;

@Entity
public class TranspiledCircuit {
    @Id @Column
    private String id;
    @ManyToOne
    @JoinColumn(name = "work_id")   
    private TranspilationWork parentWork;
    private String backend;
    private long time;
    @Column(columnDefinition = "LONGTEXT")
    private String sourceCode;
    @Column(columnDefinition = "TEXT")
    private String errors;

    public TranspiledCircuit() {
        this.id = java.util.UUID.randomUUID().toString();
    }

    public void setTranspilationWork(TranspilationWork work) {
        this.parentWork = work;
    }

    public void setBackend(String backend) {
        this.backend = backend;
    }

    public void setTranspilationTime(long time) {
        this.time = time;
    }

    public void setCode(String sourceCode) {
        this.sourceCode = sourceCode;
    }

    public String getBackend() {
        return backend;
    }

    public String getCode() {
        return sourceCode;
    }

    public TranspilationWork getParentWork() {
        return parentWork;
    }

    public long getTime() {
        return time;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getId() {
        return id;
    }

    public void setErrors(String errors) {
        this.errors = errors;
    }

    public String getErrors() {
        return errors;
    }
}
