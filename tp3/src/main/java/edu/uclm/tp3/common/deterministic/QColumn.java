package edu.uclm.tp3.common.deterministic;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.json.JSONArray;

public class QColumn {

    private List<QGate> gates;

    public QColumn() {
        this.gates = new ArrayList<>();
    }

    public QColumn addGate(QGate gate) {
        this.gates.add(gate);
        return this;
    }

    public void setGate(int qubit, QGate gate) {
        this.gates.set(qubit, gate);
    }

    public void appendGate(QGate gate) {
        this.addGate(gate);
        for (int i = 1; i < gate.getQubits(); i++) {
            QStdGate emptyGate = new QStdGate("1");
            this.addGate(emptyGate);
        }
    }

    public void setMatrixGate(int qubit, String gateName) {
        QMatrixGate gate = new QMatrixGate();
        gate.setName(gateName);
        if (qubit >= this.gates.size()) {
            for (int i = this.gates.size(); i <= qubit; i++) {
                QStdGate gate1 = new QStdGate("1");
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

    public static QColumn merge(List<QColumn> columns, int qubits) {
        QColumn mergedColumn = new QColumn();
        int startQubit = 0, endQubit = 0;
        for (int i=0; i < columns.size(); i++) {
            QColumn column = columns.get(i);
            if (column == null || column.getGates() == null || column.getGates().isEmpty())
                continue;
            for (int j=startQubit; j<endQubit; j++)
                mergedColumn.addGate(new QStdGate("1")); // Add empty gates for qubits before the first gate

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

    public static QColumn build(Map<String, Object> colMap) {
        QColumn column = new QColumn();
        List<Map<String, Object>> gatesList = (List<Map<String, Object>>) colMap.get("gates");
        if (gatesList != null) {
            for (Map<String, Object> gateMap : gatesList) {
                QGate gate = QGate.build(gateMap);
                column.addGate(gate);
            }
        }
        return column;
    }

}
