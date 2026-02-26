package edu.uclm.tp3.common.model;

import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;

import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
public class EdGate {
    @Id
    private String id;
    private int qubits;
    private int columnIndex;
    @ManyToOne @JsonIgnore
    private EdQubit qubitId;
    private String gateName;

    public EdGate() {
        this.id = UUID.randomUUID().toString();
    }

    public String getId() {
        return id;
    }
    public void setId(String id) {
        this.id = id;
    }
    public int getQubits() {
        return qubits;
    }
    public void setQubits(int qubits) {
        this.qubits = qubits;
    }
    public int getColumnIndex() {
        return columnIndex;
    }
    public void setColumnIndex(int columnIndex) {
        this.columnIndex = columnIndex;
    }
    public EdQubit getQubitId() {
        return qubitId;
    }
    public void setQubitId(EdQubit qubitId) {
        this.qubitId = qubitId;
    }
    public String getName() {
        return gateName;
    }
    public void setName(String gateName) {
        this.gateName = gateName;
    }
    
}
