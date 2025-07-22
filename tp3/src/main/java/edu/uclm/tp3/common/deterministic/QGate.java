package edu.uclm.tp3.common.deterministic;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public abstract class QGate {

    protected String name;
    protected boolean control;

    public QGate setName(String name) {
        this.name = name;
        this.control = name.equals("•") || name.equals("\u2022");
        return this;
    }

    public String getName() {
        return name;
    }

    public boolean isControlGate() {
        return control;
    }

    public abstract Object getId();

    protected abstract Object toJson();

    public abstract int getQubits();

    @SuppressWarnings("unchecked")
    public static QGate build(Map<String, Object> gateMap) {
        String name = (String) gateMap.get("name");
        boolean control = gateMap.containsKey("control") ? (Boolean) gateMap.get("control") : false;

        // Decidir subclase por campos presentes
        if (gateMap.containsKey("columns")) {
            QCircuitGate g = new QCircuitGate();
            g.setName(name);
            List<Map<String, Object>> cols = (List<Map<String, Object>>) gateMap.get("columns");
            List<QColumn> columnList = new ArrayList<>();
            for (Map<String, Object> colMap : cols) {
                columnList.add(QColumn.build(colMap));
            }
            g.setColumns(columnList);
            return g;
        } else if (gateMap.containsKey("matrix") || gateMap.containsKey("theta")) {
            QMatrixGate g = new QMatrixGate();
            g.setName(name);
            g.setControl(control);
            if (gateMap.containsKey("theta")) {
                g.setTheta(((Number) gateMap.get("theta")).doubleValue());
            }
            if (gateMap.containsKey("matrix")) {
                List<List<Number>> matrixList = (List<List<Number>>) gateMap.get("matrix");
                double[][] matrix = new double[2][2];
                for (int i = 0; i < 2; i++) {
                    List<Number> row = matrixList.get(i);
                    for (int j = 0; j < 2; j++) {
                        matrix[i][j] = row.get(j).doubleValue();
                    }
                }
                g.setMatrix(matrix);
            }
            return g;
        } else {
            QStdGate g = new QStdGate(name);
            return g;
        }
    }


}
