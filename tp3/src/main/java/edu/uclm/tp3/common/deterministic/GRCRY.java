package edu.uclm.tp3.common.deterministic;

import org.json.JSONArray;

public class GRCRY extends GRGate {

    public int qubit0;
    public GRY ry;

    public GRCRY(int qubit0, int qubit1, double theha, String name) {
        super(name);
        this.qubit0 = qubit0;
        this.ry = new GRY(qubit1, theha, name);
    }

    @Override
    protected String getQuirk() {
        JSONArray jsa = new JSONArray()
            .put(this.qubit0)
            .put(this.ry.id);
        return jsa.toString();
    }

    @Override
    public String toString() {
        return "\tU.cry(" + + this.ry.theta + ", " + this.qubit0 + ", " + this.ry.qubit + ")\n";
    }
}
