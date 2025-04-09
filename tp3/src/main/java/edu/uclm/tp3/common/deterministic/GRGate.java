package edu.uclm.tp3.common.deterministic;

public abstract class GRGate {

    protected String id;

    protected GRGate(String id) {
        if (id != null) 
            this.id = id.startsWith("~") ? id : "~" + id;
    }

    @Override
    public abstract String toString();

    public boolean isTrivial() {
        return false;
    }

    protected abstract String getQuirk();

    public String getId() {
        return this.id;
    }
}
