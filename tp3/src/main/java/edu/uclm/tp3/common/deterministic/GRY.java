package edu.uclm.tp3.common.deterministic;

import org.json.JSONArray;

public class GRY extends GRGate {

    public int qubit;
    public double theta;

    public GRY(int qubit, double theta, String id) {
        super(id);
        this.qubit = qubit;
        this.theta = theta;
    }

    @Override
    protected String getQuirk() {
        JSONArray jsa = new JSONArray();
        for (int i=0; i<qubit; i++)
            jsa.put(i);
        jsa.put(this.id);
        return jsa.toString();
    }

    public double getTheta() {
        return theta;
    }

    @Override
    public String toString() {
        return "\tU.ry(" + this.theta + ", " + this.qubit + ")\n";
    }
}
