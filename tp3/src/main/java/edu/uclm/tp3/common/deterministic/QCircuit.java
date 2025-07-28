package edu.uclm.tp3.common.deterministic;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;

public class QCircuit {

    private String name;
    private List<QColumn> columns = new ArrayList<>();
    private List<QGate> gates = new ArrayList<>();
    private int qubits;

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
        if (this.getName()!=null)
            jsoCircuit.put("name", this.name);
        
        JSONArray jsaColumns = new JSONArray();
        for (QColumn column : this.columns)
            jsaColumns.put(column.toJsonArray());
        
        jsoCircuit.put("cols", jsaColumns);

        JSONArray jsaGates = new JSONArray();
        for (QGate gate : this.gates)
            jsaGates.put(gate.toJson());

        if (jsaGates.length() > 0)
            jsoCircuit.put("gates", jsaGates);
        return jsoCircuit;
    }

    public QCircuit addColumn(QColumn column) {
        this.columns.add(column);
        if (this.qubits<column.size())
            this.qubits = column.size();
        return this;
    }

    public void addGate(QGate gate) {
        if (this.gates.stream().anyMatch(g -> g.getName().equals(gate.getName()))) 
            return;
        this.gates.add(gate);
    }

    public void addGates(List<QGate> gates) {
        for (QGate gate : gates) {
            if (this.gates.stream().anyMatch(g -> g.getName().equals(gate.getName())))
                continue;
            this.gates.add(gate);
        }
    }

    public void addColumn(QGate gate) {
        QColumn column = new QColumn();
        column.addGate(gate);
        this.addColumn(column);
    }

    public void insertColumn(QColumn column, int index) {
        this.columns.add(index, column);
    }

    public void insertColumnWithGate(int index, QGate gate) {
        QColumn column = new QColumn();
        column.addGate(gate);
        if (column.size()>this.qubits)
            this.qubits = column.size();
        this.columns.add(index, column);
    }

    public void addColumns(List<QColumn> columns) {
        for (QColumn column : columns)
            this.addColumn(column);
    }

    public List<QColumn> getColumns() {
        return columns;
    }

    public static QCircuitGate getH(int qubits, QCircuit quirkCircuit) {
        QCircuitGate hGate = new QCircuitGate(quirkCircuit);
        hGate.setName("InitialH");
        QColumn h = new QColumn();
        for (int i=0; i<qubits; i++)
            h.addGate(new QStdGate("H", quirkCircuit));
        hGate.addColumn(h);
        hGate.setQubits(qubits);
        return hGate;
    }

    public Map<String, Object> clean(int qubits, String splitIndex) {
		this.sortGates();
		QColumn column0 = new QColumn();
		/*if (splitIndex==null)
			column0.addGate("~0");
		else
			column0.addGate("~" + splitIndex + "0");

		this.insertColumn(column0, 0);

		QColumn column1 = new QColumn();
		for (int i=0; i<qubits; i++)
			column1.addGate("H");
		
        this.insertColumn(column1, 0); */

		JSONObject jso = this.toJson();
		JSONArray jsaCols = jso.getJSONArray("cols");
		jso.put("cols", jsaCols);

		return jso.toMap();
	}

    public void setName(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }

    public List<QGate> getGates() {
        return gates;
    }

    public int getQubits() {
        return qubits;
    }

    public void setQubits(int qubits) {
        this.qubits = qubits;
    }

    public void setColumns(List<QColumn> columns) {
        this.columns = columns;
    }

    public void setGates(List<QGate> gates) {
        this.gates = gates;
    }

    public static QCircuit build(JSONObject jsoCircuit) {
        QCircuit qc = new QCircuit();

        JSONArray jsaGates = jsoCircuit.optJSONArray("gates");
        if (jsaGates!=null) {
            for (int i=0; i<jsaGates.length(); i++) {
                JSONObject gate = jsaGates.getJSONObject(i);
                if (gate.opt("matrix")!=null) {
                    QMatrixGate qmg = buildQMatrixGate(gate, qc);
                    qc.addGate(qmg);
                } else if (gate.opt("circuit")!=null) {
                    QCircuitGate qcg = buildQCircuitGate(gate, qc);
                    qc.addGate(qcg);
                }
            }
        }
        qc.sortGates();
        for (int i=0; i<qc.getGates().size(); i++) {
            QGate gate = qc.getGates().get(i);
            if (gate instanceof QCircuitGate) {
                QCircuitGate qcg = (QCircuitGate) gate;
                qcg.calculateQubits();
            }
        }

        JSONArray jsaCols = jsoCircuit.optJSONArray("cols");
        if (jsaCols!=null) {
            for (int i=0; i<jsaCols.length(); i++) {
                JSONArray jsaCol = jsaCols.getJSONArray(i);
                QColumn column = buildColumn(jsaCol, qc);
                qc.addColumn(column);
            }
        }

        return qc;
    }

    private static QColumn buildColumn(JSONArray jsaCol, QCircuit qc) {
        int qubits = 0;
        QColumn column = new QColumn();
        for (int i=0; i<jsaCol.length(); i++) {
            String gateName = jsaCol.get(i).toString();
            QGate gate;
            if (gateName.startsWith("~")) 
                gate = qc.findGate(gateName);
            else 
                gate = new QStdGate(gateName, qc);
            column.addGate(gate);
            qubits = qubits + 1;
        }
        QGate lastGate = column.getGates().get(column.size()-1);
        if (lastGate.getQubits()>1)
            qubits = qubits + lastGate.getQubits() - 1;
        
        if (qubits>qc.qubits)
            qc.qubits = qubits;

        return column;
    }

    private static QCircuitGate buildQCircuitGate(JSONObject jsoGate, QCircuit quirkCircuit) {
        QCircuitGate gate = new QCircuitGate(quirkCircuit);
        gate.setName(jsoGate.getString("name"));
        gate.setId(jsoGate.getString("id"));
        JSONObject jsoCircuit = jsoGate.getJSONObject("circuit");
        JSONArray jsaCols = jsoCircuit.getJSONArray("cols");
        for (int i=0; i<jsaCols.length(); i++) {
            JSONArray jsaCol = jsaCols.getJSONArray(i);
            addColumnGates(gate, jsaCol, quirkCircuit);
        }
        return gate;
    }

    private static void addColumnGates(QCircuitGate gate, JSONArray jsaCol, QCircuit quirkCircuit) {
        QColumn column = new QColumn();
        for (int i=0; i<jsaCol.length(); i++) {
            String gateId = jsaCol.get(i).toString();
            if (gateId.toString().startsWith("~")) {
                QGateReference qgr = new QGateReference(gateId.substring(1), quirkCircuit);
                column.addGate(qgr);
            } else {
                column.addGate(new QStdGate(gateId, quirkCircuit));
            }
        }
        gate.addColumn(column);
    }

    private static QMatrixGate buildQMatrixGate(JSONObject jsoGate, QCircuit quirkCircuit) {
        QMatrixGate gate = new QMatrixGate(quirkCircuit);
        gate.setName(jsoGate.getString("name"));
        gate.setId(jsoGate.getString("id"));
        gate.setMatrix(jsoGate.getString("matrix"));
        return gate;
    }

    public QGate findGate(QGate gate) {
        int hashCode = gate.hashCode();
        for (int i=0; i<this.gates.size(); i++) {
            QGate existingGate = this.gates.get(i);
            if (existingGate.hashCode()==hashCode)
                return existingGate;
        }
        return null;
    }

    public QGate findGate(String gateId) {
        for (int i=0; i<this.gates.size(); i++) {
            QGate existingGate = this.gates.get(i);
            if (existingGate.getId().equals(gateId))
                return existingGate;
        }
        return null;
    }
}
