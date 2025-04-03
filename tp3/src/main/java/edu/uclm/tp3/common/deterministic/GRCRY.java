package edu.uclm.tp3.common.deterministic;

public class GRCRY extends GRGate {

    public int qubit0;
    public int qubit1;
    public double theha;

    public GRCRY(int qubit0, int qubit1, double theha) {
        this.qubit0 = qubit0;
        this.qubit1 = qubit1;
        this.theha = theha;
    }


    @Override
    public String toString() {
        return "\tU.cry(" + + this.theha + ", " + this.qubit0 + ", " + this.qubit1 + ")\n";
    }
}
