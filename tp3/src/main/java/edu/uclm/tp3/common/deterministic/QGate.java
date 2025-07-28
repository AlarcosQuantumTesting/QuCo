package edu.uclm.tp3.common.deterministic;

public abstract class QGate {

    protected QCircuit circuit;
    protected String name;
    protected boolean control;

    public QGate(QCircuit circuit) {
        this.circuit = circuit;
    }

    @Override
    public abstract int hashCode();

    public final QGate setName(String name) {
        this.name = name;
        this.control = name.equals("•") || name.equals("\u2022");
        return this;
    }

    public String getName() {
        return name;
    }

    public boolean isControlGate() {
        return control;
    }

    public abstract Object getId();

    protected abstract Object toJson();

    public abstract int getQubits();

}
