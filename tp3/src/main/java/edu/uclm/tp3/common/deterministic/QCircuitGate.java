package edu.uclm.tp3.common.deterministic;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import org.json.JSONArray;
import org.json.JSONObject;

public class QCircuitGate extends QGate {

    private List<QColumn> columns;
    private int qubits;
    private Object id;

    public QCircuitGate(QCircuit circuit) {
        super(circuit);
        this.columns = new ArrayList<>();
    }

    public void replace(QGate removedGate, QGate remainingGate) {
        for (QColumn column : this.columns)
            column.replace(removedGate, remainingGate);
    }

    public QGate addColumn(QGate gate) {
        QGate existingGate = this.circuit.findGate(gate);
        if (existingGate!=null)
            gate = existingGate;
        QColumn column = new QColumn();
        column.addGate(gate);
        this.addColumn(column);
        return this;
    }

    public void addColumn(String gateName, QGate otherGate) {
        QGate existingGate = this.circuit.findGate(otherGate);
        if (existingGate!=null)
            return;
        QColumn column = new QColumn();
        column.addGate(new QStdGate(gateName, this.circuit));
        column.addGate(otherGate);
        this.columns.add(column);
    }

    public void addColumn(QColumn column) {
        this.columns.add(column);
    }

    public void addColumns(QColumn... columns) {
        for (QColumn column : columns)
            this.addColumn(column);
    }

    @Override
    protected Object toJson() {
        JSONObject jso = new JSONObject();
        jso.put("id", this.getId());
        jso.put("name", this.getName());
        JSONObject jsoCircuit = new JSONObject();
        JSONArray jsaColumns = new JSONArray();
        for (int i=0; i<this.columns.size(); i++) {
            QColumn column = this.columns.get(i);
            jsaColumns.put(column.toJsonArray());
        }
        jsoCircuit.put("cols", jsaColumns);
        jso.put("circuit", jsoCircuit);
        return jso;
    }

    public List<QColumn> getColumns() {
        return columns;
    }

    public Object getId() {
        if (this.id == null)
            return "~" + this.name;
        return this.id;
    }

    public void setId(Object id) {
        this.id = id;
    }

    @Override
    public int getQubits() {
        return this.qubits;
    }

    public void setColumns(List<QColumn> columnList) {
        this.columns = columnList;
    }

    public void setQubits(int qubits) {
        this.qubits = qubits;
    }

    public void calculateQubits() {
        int maxQubit = 0;
        for (QColumn column : this.columns) {
            List<QGate> gates = column.getGates();
            for (int i = 0; i < gates.size(); i++) {
                QGate gate = gates.get(i);
                if (!(gate instanceof QStdGate && ((QStdGate) gate).isEmptyGate())) 
                    maxQubit = Math.max(maxQubit, i + gate.getQubits());
            }
        }
        this.qubits = maxQubit;
    }

    @Override
    public int hashCode() {
        return Objects.hash(columns, qubits);
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        QCircuitGate other = (QCircuitGate) obj; 
        return qubits == other.qubits &&
            Objects.equals(columns, other.columns);
    }
}
