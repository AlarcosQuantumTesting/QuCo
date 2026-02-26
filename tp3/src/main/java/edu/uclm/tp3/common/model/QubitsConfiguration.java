package edu.uclm.tp3.common.model;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Entity
public class QubitsConfiguration {
    @Id
    private String name;
    private Integer qubits;
    @Column(columnDefinition = "json")
    @Convert(converter = IntArrayConverter.class)
    private int[] matrix;
    
    public String getName() {
        return name;
    }
    public void setName(String name) {
        this.name = name;
    }
    public Integer getQubits() {
        return qubits;
    }
    public void setQubits(Integer qubits) {
        this.qubits = qubits;
    }
    public int[] getMatrix() {
        return matrix;
    }
    public void setMatrix(int[] matrix) {
        this.matrix = matrix;
    }

    
}
