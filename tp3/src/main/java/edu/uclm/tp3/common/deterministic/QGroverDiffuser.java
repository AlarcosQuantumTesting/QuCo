package edu.uclm.tp3.common.deterministic;

import java.util.ArrayList;
import java.util.List;

public class QGroverDiffuser {
    private QColumn h0;
    private QColumn x0;
    private QColumn oneH0;
    private QColumn mcXOrZ;
    private QColumn oneH1;
    private QColumn x1;
    private QColumn h1;

    public QGroverDiffuser(int qubits, boolean useMCX) {
        if (useMCX) {
            this.h0 = new QColumn();
            this.x0 = new QColumn();
            this.oneH0 = new QColumn();
            this.mcXOrZ = new QColumn();
            this.oneH1 = new QColumn();
            this.x1 = new QColumn();
            this.h1 = new QColumn();

            for (int i=0; i<qubits; i++) {
                h0.addGate("H");
                x0.addGate("X");
                oneH0.addGate("1");
                mcXOrZ.addGate("•");
                oneH1.addGate("1");
                x1.addGate("X");
                h1.addGate("H");
            }
            oneH0.setGate(qubits-1, "H");
            mcXOrZ.setGate(qubits-1, "X");
            oneH1.setGate(qubits-1, "H");
        } else {
            this.h0 = new QColumn();
            this.x0 = new QColumn();
            this.mcXOrZ = new QColumn();
            this.x1 = new QColumn();
            this.h1 = new QColumn();

            for (int i=0; i<qubits; i++) {
                h0.addGate("H");
                x0.addGate("X");
                mcXOrZ.addGate("•");
                x1.addGate("X");
                h1.addGate("H");
            }
            mcXOrZ.setGate(qubits-1, "Z");
        }
    }

    public QCircuit toCircuit() {
        QCircuit result = new QCircuit();
        result.addColumn(h0);
        result.addColumn(x0);
        if (oneH0!=null)
           result.addColumn(oneH0);
        result.addColumn(mcXOrZ);
        if (oneH1!=null)
            result.addColumn(oneH1);
        result.addColumn(x1);
        result.addColumn(h1);
        return result;
    }

    public List<QColumn> getColumns() {
        List<QColumn> columns = new ArrayList<>();
        columns.add(this.h0);
        columns.add(this.x0);
        if (this.oneH0 != null)
            columns.add(this.oneH0);
        columns.add(this.mcXOrZ);
        if (this.oneH1 != null) 
            columns.add(this.oneH1);
        columns.add(this.x1);   
        columns.add(this.h1);
        return columns;
    }
}
