package edu.uclm.tp3.common.deterministic;

import java.util.ArrayList;
import java.util.List;

public class QGroverDifussor {
    private QColumn h0;
    private QColumn x0;
    private QColumn oneH0;
    private QColumn mcx;
    private QColumn oneH1;
    private QColumn x1;
    private QColumn h1;

    public QGroverDifussor(int qubits) {
        this.h0 = new QColumn();
        this.x0 = new QColumn();
        this.oneH0 = new QColumn();
        this.mcx = new QColumn();
        this.oneH1 = new QColumn();
        this.x1 = new QColumn();
        this.h1 = new QColumn();

        for (int i=0; i<qubits; i++) {
            h0.addGate("H");
            x0.addGate("X");
            oneH0.addGate("1");
            mcx.addGate("•");
            oneH1.addGate("1");
            x1.addGate("X");
            h1.addGate("H");
        }
        oneH0.setGate(qubits-1, "H");
        mcx.setGate(qubits-1, "X");
        oneH1.setGate(qubits-1, "H");
    }

    public QCircuit toCircuit() {
        QCircuit result = new QCircuit();
        result.addColumn(h0);
        result.addColumn(x0);
        result.addColumn(oneH0);
        result.addColumn(mcx);
        result.addColumn(oneH1);
        result.addColumn(x1);
        result.addColumn(h1);
        return result;
    }

    public List<QColumn> getColumns() {
        List<QColumn> columns = new ArrayList<>();
        columns.add(this.h0);
        columns.add(this.x0);
        columns.add(this.oneH0);
        columns.add(this.mcx);
        columns.add(this.oneH1);
        columns.add(this.x1);   
        columns.add(this.h1);
        return columns;
    }
}
