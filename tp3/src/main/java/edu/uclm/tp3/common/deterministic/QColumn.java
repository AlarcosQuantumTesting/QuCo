package edu.uclm.tp3.common.deterministic;

import java.util.ArrayList;
import java.util.List;

import org.json.JSONArray;

public class QColumn {

    private List<Object> gateIds = new ArrayList<>();

    public void addGate(String gateId) {
        if (gateId.equals("1"))
            this.gateIds.add(1);
        else
            this.gateIds.add(gateId);
    }

    public JSONArray toJsonArray() {
        JSONArray jsonArray = new JSONArray();
        for (Object gateId : this.gateIds) {
            jsonArray.put(gateId);
        }
        return jsonArray;
    }

    public List<Object> getGates() {
        return gateIds;
    }
}
