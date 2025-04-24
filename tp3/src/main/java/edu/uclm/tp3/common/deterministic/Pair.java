package edu.uclm.tp3.common.deterministic;

public class Pair implements Comparable<Pair> {
    private int index;
    private int freq;
    
    public int getIndex() {
        return index;
    }
    public Pair setIndex(int index) {
        this.index = index;
        return this;
    }
    public int getFreq() {
        return freq;
    }
    public void setFreq(int freq) {
        this.freq = freq;
    }

    @Override
    public int compareTo(Pair other) {
        return Integer.compare(this.index, other.index);
    }
}
