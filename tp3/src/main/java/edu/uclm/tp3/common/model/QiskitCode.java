package edu.uclm.tp3.common.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Entity
public class QiskitCode {
    @Id
    private String name;
    @Column(length = 1000)
    private String description;
    private boolean isFunction;
    @Column(columnDefinition = "TEXT")
    private String code;
    private Integer qubits;
    
    public String getName() {
        return name;
    }
    public String getDescription() {
        return description;
    }
    public boolean isFunction() {
        return isFunction;
    }
    public String getCode() {
        return code;
    }
    public void setName(String name) {
        this.name = name;
    }
    public void setDescription(String description) {
        this.description = description;
    }
    public void setFunction(boolean isFunction) {
        this.isFunction = isFunction;
    }
    public void setCode(String code) {
        this.code = code;
    }

    public Integer getQubits() {
        return qubits;
    }

    public void setQubits(Integer qubits) {
        this.qubits = qubits;
    }
}
