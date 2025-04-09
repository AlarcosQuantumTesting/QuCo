package edu.uclm.tp3.common.deterministic;

import org.json.JSONObject;

public class QRY extends QGate {

    private double theta;
    private double[][] matrix = new double[2][2];

    public void setTheta(double leftAngle) {
        this.theta = leftAngle;
        this.matrix[0][0] = Math.cos(theta / 2);
        this.matrix[0][1] = -Math.sin(theta / 2);
        this.matrix[1][0] = Math.sin(theta / 2);
        this.matrix[1][1] = Math.cos(theta / 2);
    }

    @Override
    protected JSONObject toJson() {
        JSONObject jso = new JSONObject();
        jso.put("id", this.getId());
        jso.put("name", this.name);
        jso.put("theta", this.theta);
        jso.put("matrix", this.buildMatrix());
        return jso;
    }

    private String buildMatrix() {
        return "{{" + this.matrix[0][0] + "," + this.matrix[0][1] + "},{" + this.matrix[1][0] + "," + this.matrix[1][1] + "}}";
    }
}
