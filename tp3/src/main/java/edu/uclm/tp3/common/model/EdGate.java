package edu.uclm.tp3.common.model;

import java.util.List;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Transient;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@JsonIgnoreProperties(ignoreUnknown = true)
public class EdGate {
    @Id
    private String id;
    private int qubits;
    private int columnIndex;
    @ManyToOne @JsonIgnore
    private EdQubit qubitId;
    private String gateName;

    @Transient
    private Integer parentQubit;
    @Transient
    private List<Integer> targetQubits;
    @Transient
    private String transactionId;

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

    public Integer getParentQubit() {
        return parentQubit;
    }
    public void setParentQubit(Integer parentQubit) {
        this.parentQubit = parentQubit;
    }
    public List<Integer> getTargetQubits() {
        return targetQubits;
    }
    public void setTargetQubits(List<Integer> targetQubits) {
        this.targetQubits = targetQubits;
    }
    public String getTransactionId() {
        return transactionId;
    }
    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }

    @Transient
    private java.util.Map<String, Object> dslParams;

    public java.util.Map<String, Object> getDslParams() {
        return dslParams;
    }

    public void setDslParams(java.util.Map<String, Object> dslParams) {
        this.dslParams = dslParams;
    }
}
