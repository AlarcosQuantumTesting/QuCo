package edu.uclm.tp3.common.deterministic;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.json.JSONArray;
import org.json.JSONObject;

import com.fasterxml.jackson.annotation.JsonIgnore;

public class FreqTable {
    private int qubits;
    private int rows;
    private List<Pair> pairs = new ArrayList<>();

    public FreqTable() {}
    
    public FreqTable(JSONObject jso) {
        this();
        this.qubits = jso.getInt("qubits");
        this.rows = jso.getInt("rows");
        JSONArray jsa = jso.getJSONArray("pairs");
        for (int i=0; i<jsa.length(); i++) {
            Pair pair = new Pair();
            JSONObject jsoPair = jsa.getJSONObject(i);
            pair.setFreq(jsoPair.getInt("freq"));
            pair.setIndex(jsoPair.getInt("index"));
            this.pairs.add(pair);
        }
    }

    public void sort() {
        this.pairs.sort((p1, p2) -> {
            if (p1.getIndex() < p2.getIndex())
                return -1;
            else if (p1.getIndex() > p2.getIndex())
                return 1;
            else
                return 0;
        });
    }

    public int getQubits() {
        return qubits;
    }
    
    public void setQubits(int qubits) {
        this.qubits = qubits;
    }
    
    public int getRows() {
        return rows;
    }
    
    public void setRows(int rows) {
        this.rows = rows;
    }
    
    public List<Pair> getPairs() {
        return pairs;
    }
    
    public void setPairs(List<Pair> pairs) {
        this.pairs = pairs;
    }

    public void addPair(Pair pair) {
        this.pairs.add(pair);
    }

    @JsonIgnore
    public int getShots() {
        int r = 0;
        for (Pair p : this.pairs)
            r = r + p.getFreq();
        return r;
    }

    public int getFreq(int index) {
        Pair key = new Pair();
        key.setIndex(index);

        int pos = Collections.binarySearch(this.pairs, key);
        return pos>=0 ? this.pairs.get(pos).getFreq() : 0;
    }

    public void setFreqs(int freq) {
        for (Pair p : this.pairs)
            p.setFreq(freq);
    }
}
