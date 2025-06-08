package edu.uclm.tp3.common.transpilation;

import java.time.LocalDateTime;
import java.util.List;

import edu.uclm.tp3.common.services.DtoStatusLine;

public class DtoTranspilationWork {

    private String id;
    private String name;
    private List<DtoStatusLine> statusLines;
    private LocalDateTime creationDateTime;
    private int progress;

    public DtoTranspilationWork() {
        this.statusLines = new java.util.ArrayList<>();
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setCreationDateTime(LocalDateTime creationDateTime) {
        this.creationDateTime = creationDateTime;
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

    public void addStatusLine(DtoStatusLine dtoStatusLine) {
        this.statusLines.add(dtoStatusLine);
    }

    public List<DtoStatusLine> getStatusLines() {
        return statusLines;
    }

    public void setProgress(int progress) {
        this.progress = progress;
    }

    public int getProgress() {
        return progress;
    }
}
