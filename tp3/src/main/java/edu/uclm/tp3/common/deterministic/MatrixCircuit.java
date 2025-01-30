package edu.uclm.tp3.common.deterministic;

import java.util.ArrayList;
import java.util.List;

import edu.uclm.tp3.sparse.QMatrix;

public class MatrixCircuit {
	
	private List<QMatrix> matrixes = new ArrayList<>();

	public void add(QMatrix matrix) {
		if (matrix==null || matrix.isEmpty())
			return;
		this.matrixes.add(matrix);
	}

	public List<QMatrix> getMatrixes() {
		return matrixes;
	}
}
