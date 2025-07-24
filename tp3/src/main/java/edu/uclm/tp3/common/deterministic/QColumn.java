package edu.uclm.tp3.common.deterministic;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import org.json.JSONArray;

public class QColumn {

    private List<QGate> gates;

    public QColumn() {
        this.gates = new ArrayList<>();
    }

    public void replace(QGate removedGate, QGate remainingGate) {
        for (int i=0; i<this.gates.size(); i++) {
            QGate gate = this.gates.get(i);
            if (gate.getName().equals(removedGate.getName()))
                this.gates.set(i, remainingGate);
        }
    }

    public QColumn addGate(QGate gate) {
        this.gates.add(gate);
        return this;
    }

    public void setGate(int qubit, QGate gate) {
        this.gates.set(qubit, gate);
    }

    public void appendGate(QGate gate, QCircuit quirkCircuit) {
        this.addGate(gate);
        for (int i = 1; i < gate.getQubits(); i++) {
            QStdGate emptyGate = new QStdGate("1", quirkCircuit);
            this.addGate(emptyGate);
        }
    }

    public void setMatrixGate(int qubit, String gateName, QCircuit quirkCircuit) {
        QMatrixGate gate = new QMatrixGate(quirkCircuit);
        gate.setName(gateName);
        if (qubit >= this.gates.size()) {
            for (int i = this.gates.size(); i <= qubit; i++) {
                QStdGate gate1 = new QStdGate("1", quirkCircuit);
                this.gates.add(gate1); 
            }
        }
        this.gates.set(qubit, gate);
    }

    public void addGate(QCircuitGate gate) {
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

    public static QColumn merge(List<QColumn> columns, int qubits, QCircuit quirkCircuit) {
        QColumn mergedColumn = new QColumn();
        int startQubit = 0, endQubit = 0;
        for (int i=0; i < columns.size(); i++) {
            QColumn column = columns.get(i);
            if (column == null || column.getGates() == null || column.getGates().isEmpty())
                continue;
            for (int j=startQubit; j<endQubit; j++)
                mergedColumn.addGate(new QStdGate("1", quirkCircuit)); // Add empty gates for qubits before the first gate

            for (int j=0; j < column.getGates().size(); j++) {
                QGate gate = column.getGates().get(j);
                mergedColumn.addGate(gate);
                startQubit = startQubit + qubits;
                endQubit = startQubit + qubits - 1;
            }
         
        }

        return mergedColumn;
    }

    public void setGates(List<QGate> gates) {
        this.gates = gates;
    }

    @Override
    public int hashCode() {
        return Objects.hash(gates);
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        QColumn other = (QColumn) obj;
        return Objects.equals(gates, other.gates);
    }

}
