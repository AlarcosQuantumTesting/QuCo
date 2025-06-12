package edu.uclm.tp3.common.transpilation;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import javax.persistence.CollectionTable;
import javax.persistence.Column;
import javax.persistence.ElementCollection;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;

@Entity
public class TranspilationWork {
    @Id @Column(name = "id", length = 36)
    private String id;
    private String name;
    @Column(columnDefinition = "TEXT")
    private String code;
    @ElementCollection
    @CollectionTable(name = "transpilation_backends", joinColumns = @JoinColumn(name = "transpilation_work_id"))
    private List<String> backends;
    private int size;
    private int progress;
    @Column(nullable = false, updatable = false)
    private LocalDateTime creationDateTime;

    public TranspilationWork() {
        this.id = UUID.randomUUID().toString();
    }

    public TranspilationWork(String id, String name, String code, List<String> backends) {
        this.id = id;
        this.name = name;
        this.code = code;
        this.setBackends(backends);
        this.size = backends.size();
        this.progress = 0;
        this.creationDateTime = LocalDateTime.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public int getProgress() {
        return progress;
    }

    public void setProgress(int progress) {
        this.progress = progress;
    }

    public int getSize() {
        return size;
    }

    public void setSize(int size) {
        this.size = size;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public LocalDateTime getCreationDateTime() {
        return creationDateTime;
    }

    public void setCreationDateTime(LocalDateTime creationDateTime) {
        this.creationDateTime = creationDateTime;
    }
   
    public List<String> getBackends() {
        return backends;
    }

    public void setBackends(List<String> backends) {
        this.backends = backends;
    }
}
