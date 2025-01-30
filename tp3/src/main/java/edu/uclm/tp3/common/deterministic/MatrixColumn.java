package edu.uclm.tp3.common.deterministic;

import java.util.ArrayList;
import java.util.List;

import edu.uclm.tp3.sparse.QMatrix;

public class MatrixColumn {
	
	private List<QMatrix> matrixes;
	
	public MatrixColumn() {
		this.matrixes = new ArrayList<>();
	}

	public void add(QMatrix matrix) {
		if (matrix!=null)
			this.matrixes.add(matrix);
	}

	public boolean isEmpty() {
		return this.matrixes.isEmpty();
	}

	public QMatrix tp() {
		QMatrix m = matrixes.get(0);
		for (int i=1; i<matrixes.size(); i++)
			m = m.tp(matrixes.get(i));
		return m;
	}

}
