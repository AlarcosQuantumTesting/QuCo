package edu.uclm.tp3.common.deterministic;

import java.util.ArrayList;
import java.util.List;

import org.json.JSONArray;

public class QColumn {

    private List<String> gateIds = new ArrayList<>();

    public void addGate(String gateId) {
        this.gateIds.add(gateId);
    }

    public JSONArray toJsonArray() {
        JSONArray jsonArray = new JSONArray();
        for (String gateId : this.gateIds) {
            jsonArray.put(gateId);
        }
        return jsonArray;
    }


}
