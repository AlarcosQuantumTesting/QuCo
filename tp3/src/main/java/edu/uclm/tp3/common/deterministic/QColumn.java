package edu.uclm.tp3.common.deterministic;

import java.util.ArrayList;
import java.util.List;

import org.json.JSONArray;

public class QColumn {

    private List<QGate> gates;

    public QColumn() {
        this.gates = new ArrayList<>();
    }

    public void addGate(QGate gate) {
        this.gates.add(gate);
    }

    public void addStdGate(String gateName) {
        QStdGate gate = new QStdGate();
        gate.setName(gateName);
        this.addGate(gate);
    }

    public void setStdGate(int index, String gateName) {
        QStdGate gate = new QStdGate();
        gate.setName(gateName);
        this.gates.set(index, gate);
    }

    public void addMatrixGate(String gateName) {
        QMatrixGate gate = new QMatrixGate();
        gate.setName(gateName);
        this.addGate(gate);
    }

    public void setMatrixGate(int index, String gateName) {
        QMatrixGate gate = new QMatrixGate();
        gate.setName(gateName);
        this.gates.set(index, gate);
    }

    public void addCircuitGate(QCircuitGate gate) {
        this.gates.add(gate);
    }

    public JSONArray toJsonArray() {
        JSONArray jsa = new JSONArray();
        for (QGate gate : this.gates)
            jsa.put(gate.getId());
        return jsa;
    }

    public List<QGate> getGates() {
        return gates;
    }

    public int size() {
        return this.gates.size();
    }

    public boolean isControlColumn() {
        return this.gates.stream().anyMatch(gate -> gate instanceof QStdGate && ((QStdGate) gate).isControlGate());
    }

    public static QColumn merge(List<QColumn> columns, int qubits) {
        QColumn mergedColumn = new QColumn();
        int startQubit = 0, endQubit = 0;
        for (int i=0; i < columns.size(); i++) {
            QColumn column = columns.get(i);
            if (column == null || column.getGates() == null || column.getGates().isEmpty())
                continue;
            for (int j=startQubit; j<endQubit; j++)
                mergedColumn.addStdGate("1"); // Add empty gates for qubits before the first gate

            for (int j=0; j < column.getGates().size(); j++) {
                QGate gate = column.getGates().get(j);
                mergedColumn.addGate(gate);
                startQubit = startQubit + qubits;
                endQubit = startQubit + qubits - 1;
            }
         
        }

        return mergedColumn;
    }
}
