package edu.uclm.tp3.common.model;

import java.util.List;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;

import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
public class EdQubit {
    @Id
    private String id;
    @ManyToOne @JsonIgnore
    private EdCircuit circuit;
    @OneToMany(mappedBy = "qubitId", cascade = jakarta.persistence.CascadeType.ALL, orphanRemoval = true)
    private List<EdGate> gates;

    public EdQubit() {
        this.id = java.util.UUID.randomUUID().toString();
    }

    public List<EdGate> getGates() {
        return gates;
    }

    public void setGates(List<EdGate> gates) {
        this.gates = gates;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public EdCircuit getCircuit() {
        return circuit;
    }

    public void setCircuit(EdCircuit circuit) {
        this.circuit = circuit;
    }
}
