package edu.uclm.tp3.common.deterministic;

public class GRY extends GRGate {

    public int qubit;
    public double theta;

    public GRY(int qubit, double theta) {
        this.qubit = qubit;
        this.theta = theta;
    }

    @Override
    public String toString() {
        return "\tU.ry(" + this.theta + ", " + this.qubit + ")\n";
    }
}
