package edu.uclm.tp3.common.transpilation;

import java.time.LocalDateTime;
import java.util.List;

public class DtoTranspilationWork {

    private String id;
    private String name;
    private List<Object[]> backendStates;
    private LocalDateTime creationDateTime;

    public DtoTranspilationWork() {
        this.backendStates = new java.util.ArrayList<>();
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void addBackend(Object[] statusLine) {
        this.backendStates.add(statusLine);
    }

    public void setCreationDateTime(LocalDateTime creationDateTime) {
        this.creationDateTime = creationDateTime;
    }

    public List<Object[]> getBackendStates() {
        return backendStates;
    }
    public LocalDateTime getCreationDateTime() {
        return creationDateTime;
    }
    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }
}
