package edu.uclm.tp3.common.deterministic;

public class GRCU extends GRGate {

    String functionPrefix;
    String childName;
    int startQubit;
    int endQubit;
    private int controlQubit = -1;

    public GRCU(String functionPrefix, String childName, int startQubit, int endQubit) {
        this.functionPrefix = functionPrefix;
        this.childName = childName;
        this.startQubit = startQubit;
        this.endQubit = endQubit;
    }

    public GRCU(String functionPrefix, String childName, int startQubit, int endQubit, int controlQubit) {
        this(functionPrefix, childName, startQubit, endQubit);
        this.controlQubit = controlQubit;
    }

    @Override
    public String toString() {
        if (this.controlQubit==-1)
            return "\tU.append(get" + this.functionPrefix + this.childName + "(), [" + Coder.getTargetQubits(startQubit, endQubit) + "])\n";
        return "\tU.append(get" + this.functionPrefix + this.childName + "().control(" + this.controlQubit + "), [" + Coder.getTargetQubits(startQubit, endQubit) + "])\n";
    }
}
