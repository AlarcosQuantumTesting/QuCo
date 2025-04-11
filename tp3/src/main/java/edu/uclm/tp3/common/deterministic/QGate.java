package edu.uclm.tp3.common.deterministic;

public abstract class QGate {

    protected String name;

    public void setName(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }
    
    public String getId() {
        if (name == null)
            return null;
        return "~" + name;
    }

    protected abstract Object toJson();
}
