package edu.uclm.tp3.common.deterministic;

public class GRX extends GRGate {

    public int qubit;

    public GRX() {
        super("X");
        this.id = "X";
    }

    @Override
    protected String getQuirk() {
        return "X";
    }

    @Override
    public String toString() {
        return "\tU.x(" + this.qubit + ")\n";
    }

    @Override
    public boolean isTrivial() {
        return true;
    }
}
