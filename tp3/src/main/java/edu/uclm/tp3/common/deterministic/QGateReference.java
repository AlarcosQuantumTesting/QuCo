package edu.uclm.tp3.common.deterministic;

public class QGateReference extends QGate {

    private Object id;
    private int qubits;

    public QGateReference(String gateName, QCircuit quirkCircuit) {
        super(quirkCircuit);
        this.name = gateName;
        this.qubits = -1;
    }

    @Override
    public Object getId() {
        if (this.id == null)
            return "~" + this.name;
        return this.id;
    }

    public void setId(Object id) {
        this.id = id;
    }

    @Override
    protected Object toJson() {
        return this.getId();
    }

    @Override
    public int getQubits() {
        if (this.qubits!=-1)
            return this.qubits;
            
        QGate referencedGate = this.circuit.getGates().stream()
            .filter(gate -> name.equals(gate.getName()))
            .findFirst()
            .orElse(null);

        if (referencedGate == null)
            return 0;

        return referencedGate.getQubits();
    }

    @Override
    public int hashCode() {
        QGate referencedGate = this.circuit.getGates().stream()
            .filter(gate -> name.equals(gate.getName()))
            .findFirst()
            .orElse(null);

        if (referencedGate == null)
            return 0;

        return 31*referencedGate.hashCode();
    }

    public void setQubits(int qubits) {
       this.qubits = qubits;
    }
}
