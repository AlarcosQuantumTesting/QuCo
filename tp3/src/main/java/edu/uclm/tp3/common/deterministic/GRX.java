package edu.uclm.tp3.common.deterministic;

public class GRX extends GRGate {

    public int qubit;

    @Override
    public String toString() {
        return "\tU.x(" + this.qubit + ")\n";
    }
}
