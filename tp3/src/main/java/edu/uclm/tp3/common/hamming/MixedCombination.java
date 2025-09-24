package edu.uclm.tp3.common.hamming;

import java.util.ArrayList;
import java.util.List;

import edu.uclm.tp3.common.deterministic.QCircuit;
import edu.uclm.tp3.common.deterministic.QColumn;
import edu.uclm.tp3.common.deterministic.QStdGate;

public class MixedCombination {
    public List<Integer> values;
    public int qubits;
    public String unified;
    public int commons;

    private MixedCombination() {
        this.values = new ArrayList<>();
    }

    public MixedCombination(int source, int target, int qubits) {
        this();
        this.qubits = qubits;
        this.values.add(source);
        if (target!=-1) {
            this.values.add(target);
            this.unify();
        } else {
            this.unified = String.format("%" + qubits + "s", Integer.toBinaryString(source)).replace(' ', '0');
            this.commons = 0;
        }
    }

    private void unify() {
        StringBuilder unified = new StringBuilder();

        String binarySource = this.unified;
        if (binarySource==null)
            binarySource = String.format("%" + qubits + "s", Integer.toBinaryString(this.values.get(0))).replace(' ', '0');
        String binaryTarget = String.format("%" + qubits + "s", Integer.toBinaryString(this.values.get(1))).replace(' ', '0');        
        for (int i = 0; i < this.qubits; i++) {
            if (binarySource.charAt(i) == binaryTarget.charAt(i)) {
                unified.append(binaryTarget.charAt(i));
            } else {
                unified.append('-');
                this.commons++;
            }
        }
        this.unified = unified.toString();
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder(this.unified + " ➡️ [" + this.values.get(0));
        for (int i=1; i<this.values.size(); i++)
            sb.append(" " + this.values.get(i));
        sb.append("], " + this.commons);
        return sb.toString();
    }

    public static MixedCombination unify(MixedCombination a, MixedCombination b) {
        String bA = a.unified;
        String bB = b.unified;
        int qubits = bA.length();
        StringBuilder unified = new StringBuilder();
        int differents = 0;
        for (int i = 0; i < qubits; i++) {
            if (bA.charAt(i) == bB.charAt(i)) {
                unified.append(bA.charAt(i));
            } else {
                unified.append('-');
                differents++;
            }
            if (differents>1)
                return null;
        }
        MixedCombination result = new MixedCombination();
        result.values.addAll(a.values);
        result.values.addAll(b.values);
        result.qubits = qubits;
        result.unified = unified.toString();
        return result;
    }

    public String getName() {
        StringBuilder sb = new StringBuilder("get");
        for (int i=0; i<this.values.size(); i++) {
            sb.append(this.values.get(i));
            if (i<this.values.size()-1)
                sb.append("_");
        }
        return sb.toString();
    }

    public String getCode() {
        StringBuilder sb = new StringBuilder("def ");
        sb.append(this.getName());
        
        sb.append("() : # " + this.values.size() + " values\n");
        sb.append("\tU = QuantumCircuit(" + this.qubits + ")\n");
        for (int i=0; i<unified.length(); i++)
            if (unified.charAt(i)=='1')
                sb.append("\tU.x(" + i + ")\n");
            else if (unified.charAt(i)=='-')
                sb.append("\tU.h(" + i + ")\n");

        sb.append("\treturn U\n\n");
        return sb.toString();
    }

    public QCircuit getCircuit() {
        QCircuit r = new QCircuit();
        StringBuilder sb = new StringBuilder();
        for (int i=0; i<this.values.size(); i++) {
            sb.append(this.values.get(i));
            if (i<this.values.size()-1)
                sb.append("_");
        }
        QColumn column = new QColumn();
        int first = -1;
        for (int i=0; i<unified.length(); i++)
            if (unified.charAt(i)!='0') {
                first = i;
                break;
            }

        if (first==-1)
            first = 0;
        for (int i=0; i<first; i++)
            column.addGate(new QStdGate("1", r));

        for (int i=first; i<unified.length(); i++) {
            if (unified.charAt(i)=='1')
                column.addGate(new QStdGate("X", r));
            else if (unified.charAt(i)=='-')
                column.addGate(new QStdGate("H", r));
            else
                column.addGate(new QStdGate("1", r));
        }
        r.addColumn(column);
        r.setName(sb.toString());
        return r;
    }

}
