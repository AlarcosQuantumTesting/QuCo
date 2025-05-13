package edu.uclm.tp3.common.deterministic;

public class FilterSolver {
    private FreqTable expectedFrequencies;
    private int qubits;

    public FilterSolver(int qubits, FreqTable expectedFrequencies) {
        this.qubits = qubits;
        this.expectedFrequencies = expectedFrequencies;
    }

    public BinaryTree solve() {
        int numberOfPairs = this.expectedFrequencies.getPairs().size();

        float[] frequencies = new float[qubits];
        float totalFreq = 0;
        for (int i=0; i<numberOfPairs; i++) {
            Pair pair = this.expectedFrequencies.getPairs().get(i);
            int index = pair.getIndex();
            int freq = pair.getFreq();
            totalFreq += freq;
            String binary = Integer.toBinaryString(index);
            while (binary.length() < qubits)
                binary = "0" + binary;
            for (int j=0; j<binary.length(); j++) {
                if (binary.charAt(j) == '0') {
                    frequencies[j] += freq;
                } 
            }
        }
        for (int i=0; i<qubits; i++)
            frequencies[i] = frequencies[i] / totalFreq;
    
        BinaryTree tree = this.buildTree(frequencies);
        return tree;
    }

    private BinaryTree buildTree(float[] frequencies) {
        BinaryTree tree = null;
        int depth = frequencies.length - 1;
        while (frequencies[depth] == 0)
            depth--;

        tree = new BinaryTree();
        tree.depth = depth;
        tree.leftProbability = frequencies[depth];
        tree.rightProbability = 1 - frequencies[depth];
        tree.leftAngle =  (float) (2*Math.acos(Math.sqrt(tree.leftProbability)) - Math.PI/2);

        return tree;
    }
    
}
