package edu.uclm.tp3.common.services;

public class DtoStatusLine {

    private String id;
    private String backend;
    private boolean hasErrors;
    private boolean finished;
    private long transpilationTime;

    public void setId(String id) {
        this.id = id;
    }

    public void setBackend(String backend) {
        this.backend = backend;
    }

    public void setHasErrors(boolean hasErrors) {
        this.hasErrors = hasErrors;
    }

    public void setFinished(boolean finished) {
        this.finished = finished;
    }

    public String getId() {
        return id;
    }

    public String getBackend() {
        return backend;
    }

    public boolean getHasErrors() {
        return hasErrors;
    }

    public boolean isFinished() {
        return this.finished;
    }

    public void setTime(long transpilationTime) {
        this.transpilationTime = transpilationTime;
    }

    public long getTranspilationTime() {
        return transpilationTime;
    }
}
