package edu.uclm.tp3.common.deterministic;

import java.util.ArrayList;
import java.util.List;

import org.json.JSONArray;
import org.json.JSONObject;

public class QCircuitGate extends QGate {

    private List<QColumn> columns;

    public QCircuitGate() {
        super();
        this.columns = new ArrayList<>();
    }

    public void addColumnWithCircuitGate(QCircuitGate gate) {
        QColumn column = new QColumn();
        column.addCircuitGate(gate);
        this.columns.add(column);
    }

    public void addColumn(QColumn column) {
        this.columns.add(column);
    }

    public void addColumns(QColumn... columns) {
        for (QColumn column : columns)
            this.columns.add(column);
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

    public String getId() {
        if (name == null)
            return null;
        return "~" + name;
    }
}
