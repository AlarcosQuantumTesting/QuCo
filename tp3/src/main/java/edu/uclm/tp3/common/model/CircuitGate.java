package edu.uclm.tp3.common.model;

import java.util.List;

public class CircuitGate {
    private String id;
    private String name;
    private int column;
    private List<Integer> qubits;
    private int parentQubit;
    private String transactionId;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getColumn() {
        return column;
    }

    public void setColumn(int column) {
        this.column = column;
    }

    public List<Integer> getQubits() {
        return qubits;
    }

    public void setQubits(List<Integer> qubits) {
        this.qubits = qubits;
    }

    public int getParentQubit() {
        return parentQubit;
    }

    public void setParentQubit(int parentQubit) {
        this.parentQubit = parentQubit;
    }

    public String getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }
}
