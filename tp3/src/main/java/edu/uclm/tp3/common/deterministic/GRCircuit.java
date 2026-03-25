package edu.uclm.tp3.common.deterministic;

import java.util.ArrayList;
import java.util.List;

public class GRCircuit {

    protected String functionPrefix;
    private String name;
    private int qubits;
    private List<GRGate> gates;

    public GRCircuit() {
        this.gates = new ArrayList<>();
    }

    public GRCircuit(String functionPrefix, String name, int nodeDepth) {
        this();
        this.functionPrefix = functionPrefix;
        this.name = name;
        this.qubits = nodeDepth;
    }

    public String getCode(String backend) {
        if (backend==null || backend.equalsIgnoreCase("qiskit"))
            return this.toString();
        return this.getCirqCode();
    }

    @Override // Este devuelve el código para Qiskit
    public String toString() {
        StringBuilder sb = new StringBuilder("def get" + this.functionPrefix + this.name + "():\n");
        sb.append("\tU = QuantumCircuit(" + this.qubits + ", name=\"" + this.functionPrefix + this.name + "\")\n");
        for (GRGate gate : this.gates)
            sb.append(gate.toString());
        sb.append("\treturn U.to_gate()\n\n");
        return sb.toString();
    }

    private String getCirqCode() {
        StringBuilder sb = new StringBuilder("def get" + this.functionPrefix + this.name + "() -> cirq.FrozenCircuit:\n\t");
        for (int i=0; i<this.qubits-1; i++)
            sb.append("q" + i + ", ");
        sb.append("q" + (this.qubits-1) + " = cirq.LineQubit.range(" + this.qubits + ")\n");
        sb.append("\tc = cirq.Circuit()\n");
        for (GRGate gate : this.gates)
            sb.append(gate.getCirqCode());
        sb.append("\treturn cirq.FrozenCircuit(c)\n\n");
        return sb.toString();
    }

    public void setQubits(int qubits) {
        this.qubits = qubits;
    }

    public int getQubits() {
        return this.qubits;
    }

    public GRCircuit addGate(GRGate gate) {
        this.gates.add(gate);
        return this;
    }

    public List<GRGate> getGates() {
        return this.gates;
    }

    public String getName() {
        return name;
    }
}
