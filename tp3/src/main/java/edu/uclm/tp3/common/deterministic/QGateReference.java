package edu.uclm.tp3.common.deterministic;

public class QGateReference extends QGate {

    public QGateReference(String gateName) {
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
        return 1;
    }

}
