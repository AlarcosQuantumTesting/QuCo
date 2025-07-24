package edu.uclm.tp3.common.deterministic;

public class QGateReference extends QGate {

    public QGateReference(String gateName, QCircuit quirkCircuit) {
        super(quirkCircuit);
        this.name = gateName;
    }

    @Override
    public Object getId() {
        return "~" + this.name;
    }

    @Override
    protected Object toJson() {
        return this.getId();
    }

    @Override
    public int getQubits() {
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
}
