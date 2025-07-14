package edu.uclm.tp3.common.deterministic;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;

public class QCircuit extends QGate {

    private List<QColumn> columns = new ArrayList<>();
    private List<QGate> gates = new ArrayList<>();

    public void addGate(QGate gate) {
        this.gates.add(gate);
    }

    @Override
    public String toString() {
        return this.toJson().toString();
    }

    public void sortGates() {
        this.gates.sort(new Comparator<QGate>() {
            @Override
            public int compare(QGate a, QGate b) {
                if (a.getName().length()==b.getName().length())
                    return a.getName().compareTo(b.getName());
                else
                    return Integer.compare(b.getName().length(), a.getName().length());
            }
        });
    }

    public JSONObject toJson() {
        JSONObject jsoCircuit = new JSONObject();
        if (this.getName()!=null) {
            jsoCircuit.put("id", this.getId());
            jsoCircuit.put("name", this.name);
        }
        
        JSONArray jsaColumns = new JSONArray();
        for (QColumn column : this.columns) {
            jsaColumns.put(column.toJsonArray());
        }
        JSONObject jsoCols = new JSONObject();
        jsoCols.put("cols", jsaColumns);
        jsoCircuit.put("circuit", jsoCols);

        JSONArray jsaGates = new JSONArray();
        for (QGate gate : this.gates) {
            jsaGates.put(gate.toJson());
        }

        if (jsaGates.length() > 0)
            jsoCircuit.put("gates", jsaGates);
        return jsoCircuit;
    }

    public QCircuit addColumn(QRY qry) {
        QColumn column = new QColumn();
        column.addGate(qry.getId());
        this.columns.add(column);
        return this;
    }

    public QCircuit addColumn(String basicGateId) {
        QColumn column = new QColumn();
        column.addGate(basicGateId);
        this.columns.add(column);
        return this;
    }

    public QCircuit addColumn(String basicGateId, QRY qry) {
        QColumn column = new QColumn();
        column.addGate(basicGateId);
        column.addGate(qry.getId());
        this.columns.add(column);
        return this;
    }

    public QCircuit addColumn(String basicGateId, String complexGateId) {
        QColumn column = new QColumn();
        column.addGate(basicGateId);
        column.addGate(complexGateId);
        this.columns.add(column);
        return this;
    }

    public QCircuit addColumn(QColumn column) {
        this.columns.add(column);
        return this;
    }

    public void insertColumn(QColumn column, int index) {
        this.columns.add(index, column);
    }

    public void addColumns(List<QColumn> columns) {
       this.columns.addAll(columns);
    }

    public List<QColumn> getColumns() {
        return columns;
    }

    public void add(QCircuit circuit, int start) {
        for (int i=0; i<circuit.getColumns().size(); i++) {
            QColumn originalColumn = circuit.getColumns().get(i);
            QColumn newColumn = new QColumn();
            for (int j=0; j<start; j++)
                newColumn.addGate("1");
            for (int j=0; j<originalColumn.size(); j++)
                newColumn.addGate(originalColumn.get(j));
            this.addColumn(newColumn);
        }
    }

    public Map<String, Object> clean(int qubits, String splitIndex) {
		this.sortGates();
		QColumn column0 = new QColumn();
		if (splitIndex==null)
			column0.addGate("~0");
		else
			column0.addGate("~" + splitIndex + "0");

		this.insertColumn(column0, 0);

		QColumn column1 = new QColumn();
		for (int i=0; i<qubits; i++)
			column1.addGate("H");
		
        this.insertColumn(column1, 0);

		JSONObject jso = this.toJson();
		JSONArray jsaCols = jso.getJSONObject("circuit").getJSONArray("cols");
		jso.remove("circuit");
		jso.put("cols", jsaCols);

		return jso.toMap();
	}
}
