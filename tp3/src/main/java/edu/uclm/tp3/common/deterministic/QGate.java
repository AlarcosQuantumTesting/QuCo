package edu.uclm.tp3.common.deterministic;

public abstract class QGate {

    protected String name;
    private boolean control;

    public void setName(String name) {
        this.name = name;
        this.control = name.equals("•") || name.equals("\\u2022");
    }

    public String getName() {
        return name;
    }

    public boolean isControlGate() {
        return control;
    }

    public abstract Object getId();

    protected abstract Object toJson();
}
