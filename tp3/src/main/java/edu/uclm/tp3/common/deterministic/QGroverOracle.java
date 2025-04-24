package edu.uclm.tp3.common.deterministic;

import java.util.ArrayList;
import java.util.List;

public class QGroverOracle {
    private QColumn encoding0;
    private QColumn h0;
    private QColumn mcx;
    private QColumn h1;
    private QColumn encoding1;

    public QGroverOracle(List<Integer> row) {
        this.encoding0 = this.encode(row);
        this.h0 = this.buildH(row);
        this.mcx = this.buildMCX(row);
        this.h1 = this.buildH(row);
        this.encoding1 = this.encode(row);   
    }

    public List<QColumn> getColumns() {
        List<QColumn> columns = new ArrayList<>();
        columns.add(this.encoding0);
        columns.add(this.h0);
        columns.add(this.mcx);
        columns.add(this.h1);
        columns.add(this.encoding1);
        return columns;
    }

    private QColumn buildMCX(List<Integer> row) {
        QColumn column = new QColumn();
        for (int i=0; i<row.size(); i++)
            column.addGate("•");
        column.setGate(row.size()-1, "X");
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

}
