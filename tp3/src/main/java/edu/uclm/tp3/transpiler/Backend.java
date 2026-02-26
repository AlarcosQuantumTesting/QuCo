package edu.uclm.tp3.transpiler;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Entity
public class Backend {
    @Id
    private String name;
    private int qubits;
    private String remarks;

    public String getName() {
        return name;
    }
    public void setName(String name) {
        this.name = name;
    }
    public int getQubits() {
        return qubits;
    }
    public void setQubits(int qubits) {
        this.qubits = qubits;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }

    public String getRemarks() {
        return remarks;
    }
}
