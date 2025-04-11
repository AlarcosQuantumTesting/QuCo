package edu.uclm.tp3.common.deterministic;

import org.json.JSONArray;

public class GRCU extends GRGate {

    String functionPrefix;
    String childName;
    int startQubit;
    int endQubit;
    private int controlQubit = -1;

    public GRCU(String functionPrefix, String childName, int startQubit, int endQubit, String name) {
        super(name);
        this.functionPrefix = functionPrefix;
        this.childName = childName;
        this.startQubit = startQubit;
        this.endQubit = endQubit;
    }

    public GRCU(String functionPrefix, String childName, int startQubit, int endQubit, int controlQubit, String name) {
        this(functionPrefix, childName, startQubit, endQubit, name);
        this.controlQubit = controlQubit;
    }

    @Override
    protected String getQuirk() {
        JSONArray jsa = new JSONArray();
        if (this.controlQubit==-1)
            jsa.put(1);
        else
            jsa.put("•");
        jsa.put(this.id);
        return jsa.toString();
    }

    @Override
    public String toString() {
        if (this.controlQubit==-1)
            return "\tU.append(get" + this.functionPrefix + this.childName + "(), [" + Coder.getTargetQubits(startQubit, endQubit) + "])\n";
        return "\tU.append(get" + this.functionPrefix + this.childName + "().control(" + this.controlQubit + "), [" + Coder.getTargetQubits(startQubit, endQubit) + "])\n";
    }

    public String getFunctionPrefix() {
        return functionPrefix;
    }
    public String getChildName() {
        return childName;
    }
    public int getStartQubit() {
        return startQubit;
    }
    public int getEndQubit() {
        return endQubit;
    }
    public int getControlQubit() {
        return controlQubit;
    }

}
