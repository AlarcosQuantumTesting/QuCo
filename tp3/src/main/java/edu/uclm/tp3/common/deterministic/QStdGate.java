package edu.uclm.tp3.common.deterministic;

public class QStdGate extends QGate {

    @Override
    protected Object toJson() {
        if (this.name.equals("1"))
            return 1;
        return this.name;
    }
    
    public Object getId() {
        if (this.name.equals("1"))
            return 1;
        return this.name;
    }

}
