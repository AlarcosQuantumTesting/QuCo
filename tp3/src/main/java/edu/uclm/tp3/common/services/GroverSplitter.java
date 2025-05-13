package edu.uclm.tp3.common.services;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;

public class GroverSplitter {

    public static List<Map<String, Object>> split(Map<String, Object> partialCircuit, int qubits, int numberOfPairs, int optimal) {
        JSONArray jsaCircuits = new JSONArray();
        JSONArray hCol = getHCol(qubits);
        for (int i=0; i<numberOfPairs; i++) {
            JSONObject jsoCircuit = new JSONObject();
            addCol(jsoCircuit, hCol);
            for (int j=0; j<optimal; j++) {
                addCol(jsoCircuit, "~oracle_" + i);
                addCol(jsoCircuit, "~difussor");
            }
            addGate(jsoCircuit, "~oracle_" + i, partialCircuit);
            addGate(jsoCircuit, "~difussor", partialCircuit);
            jsaCircuits.put(jsoCircuit);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (int i=0; i<jsaCircuits.length(); i++)
            result.add(jsaCircuits.getJSONObject(i).toMap());
        return result;
    }

    private static void addGate(JSONObject jsoCircuit, String gateId, Map<String, Object> partialCircuit) {
        JSONObject jsoPartialCircuit = new JSONObject(partialCircuit);
        JSONArray jsaGates = jsoPartialCircuit.getJSONArray("gates");
        for (int i=0; i<jsaGates.length(); i++) {
            JSONObject jsoGate = jsaGates.getJSONObject(i);
            if (jsoGate.getString("id").equals(gateId)) {
                addGate(jsoCircuit, jsoGate);
                break;
            }
        }
    }

    private static void addGate(JSONObject jsoCircuit, JSONObject jsoGate) {
        JSONArray jsaGates = jsoCircuit.optJSONArray("gates");
        if (jsaGates==null)
        jsaGates = new JSONArray();
        jsaGates.put(jsoGate);
        jsoCircuit.put("gates", jsaGates);
    }

    private static void addCol(JSONObject jsoCircuit, String gateId) {
        JSONArray jsaCol = new JSONArray();
        jsaCol.put(gateId);
        addCol(jsoCircuit, jsaCol);
    }

    private static void addCol(JSONObject jsoCircuit, JSONArray jsaCol) {
        JSONArray jsaCols = jsoCircuit.optJSONArray("cols");
        if (jsaCols==null)
            jsaCols = new JSONArray();
        jsaCols.put(jsaCol);
        jsoCircuit.put("cols", jsaCols);
    }

    private static JSONArray getHCol(int qubits) {
        JSONArray jsa = new JSONArray();
        for (int i=0; i<qubits; i++)
            jsa.put("H");
        return jsa;
    }

}
