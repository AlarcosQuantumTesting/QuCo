package edu.uclm.tp3.common.model;

import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;

@Entity
public class EdCircuit {
    @Id @Column(length = 255)
    private String name;
    private int columns;
    @Column(columnDefinition = "TEXT")
    private String descritpion;
    @OneToMany(mappedBy = "circuit", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<EdQubit> qubits;

    public String getName() {
        return name;
    }
    public void setName(String name) {
        this.name = name;
    }
    public int getColumns() {
        return columns;
    }
    public void setColumns(int columns) {
        this.columns = columns;
    }
    public String getDescritpion() {
        return descritpion;
    }
    public void setDescritpion(String descritpion) {
        this.descritpion = descritpion;
    }

    public List<EdQubit> getQubits() {
        return qubits;
    }

    public void setQubits(List<EdQubit> qubits) {
        this.qubits = qubits;
    }
}
