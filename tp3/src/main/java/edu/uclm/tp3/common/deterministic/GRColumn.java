package edu.uclm.tp3.common.deterministic;

import java.util.ArrayList;
import java.util.List;

public class GRColumn {

    private List<GRGate> gates = new ArrayList<>();

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        for (GRGate gate : gates)
            sb.append(gate.toString());
        return sb.toString();
    }

    public void add(GRGate gate) {
        this.gates.add(gate);
    }

}
