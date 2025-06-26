package edu.uclm.tp3.common.deterministic;

import java.util.ArrayList;
import java.util.List;

public class QGroverOracle {
    private QColumn encoding0;
    private QColumn h0;
    private QColumn mcXOrZ;
    private QColumn h1;
    private QColumn encoding1;

    public QGroverOracle(List<Integer> row, boolean useMCX) {
        this.encoding0 = this.encode(row);
        if (useMCX) {
            this.h0 = this.buildH(row);
            this.mcXOrZ = this.buildMCXOrMCH(row, "X");
            this.h1 = this.buildH(row);
        } else {
            this.mcXOrZ = this.buildMCXOrMCH(row, "Z");
        }
        this.encoding1 = this.encode(row);   
    }

    public List<QColumn> getColumns() {
        List<QColumn> columns = new ArrayList<>();
        columns.add(this.encoding0);
        if (this.h0 != null) 
            columns.add(this.h0);
        columns.add(this.mcXOrZ);
        if (this.h1!=null)
            columns.add(this.h1);
        columns.add(this.encoding1);
        return columns;
    }

    private QColumn buildMCXOrMCH(List<Integer> row, String gate) {
        QColumn column = new QColumn();
        for (int i=0; i<row.size(); i++)
            column.addGate("•");
        column.setGate(row.size()-1, gate);
        return column;
    }

    private QColumn buildH(List<Integer> row) {
        QColumn column = new QColumn();
        for (int i=0; i<row.size(); i++)
            column.addGate("1");
        column.setGate(row.size()-1, "H");
        return column;
    }

    private QColumn encode(List<Integer> row) {
        QColumn column = new QColumn();
        for (int i=0; i<row.size(); i++) {
            Integer value = row.get(i);
            if (value==null || value==0)
                column.addGate("X");
            else 
                column.addGate("1");
        }
        return column;
    }

    public QColumn getEncoding0() {
        return encoding0;
    }

    public QColumn getH0() {
        return h0;
    }

    public QColumn getMcXOrZ() {
        return mcXOrZ;
    }

    public QColumn getH1() {
        return h1;
    }

    public QColumn getEncoding1() {
        return encoding1;
    }

    public QCircuit toCircuit() {
        QCircuit result = new QCircuit();
        result.addColumn(encoding0);
        if (h0 != null)
            result.addColumn(h0);
        result.addColumn(mcXOrZ);
        if (h1!=null)
            result.addColumn(h1);
        result.addColumn(encoding1);
        return result;
    }
}
