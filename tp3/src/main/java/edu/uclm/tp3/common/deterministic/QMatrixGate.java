package edu.uclm.tp3.common.deterministic;

import org.json.JSONObject;

public class QMatrixGate extends QGate {

    private double theta = Math.PI; // Valor por defecto
    private double[][] matrix = new double[2][2];

    public QGate setTheta(double leftAngle) {
        this.theta = leftAngle;
        this.matrix[0][0] = Math.cos(theta / 2);
        this.matrix[0][1] = -Math.sin(theta / 2);
        this.matrix[1][0] = Math.sin(theta / 2);
        this.matrix[1][1] = Math.cos(theta / 2);
        return this;
    }

    @Override
    protected JSONObject toJson() {
        JSONObject jso = new JSONObject();
        jso.put("id", this.getId());
        jso.put("name", this.name);
        //jso.put("theta", this.theta);
        jso.put("matrix", this.getMatrix());
        return jso;
    }

    public String getMatrix() {
        return "{{" + this.matrix[0][0] + "," + this.matrix[0][1] + "},{" + this.matrix[1][0] + "," + this.matrix[1][1] + "}}";
    }
    
    @Override
    public String getId() {
        if (name == null)
            return null;
        return "~" + name;
    }

    @Override
    public int getQubits() {
        return 1;
    }

    public void setControl(boolean control) {
        this.control = control;
    }

    public void setMatrix(double[][] matrix) {
        this.matrix = matrix;
        this.theta = 2 * Math.atan2(matrix[1][0], matrix[0][0]);
    }

    public double getTheta() {
        return theta;
    }

    public void setMatrix(String matrix) {
        matrix = matrix.replace("{", "").replace("}", "");
        String[] tokens = matrix.split(",");
        double[][] values = new double[2][2];
        values[0][0] = Double.parseDouble(tokens[0]);
        values[0][1] = Double.parseDouble(tokens[1]);
        values[1][0] = Double.parseDouble(tokens[2]);
        values[1][1] = Double.parseDouble(tokens[3]);
        this.setMatrix(values);
    }
}