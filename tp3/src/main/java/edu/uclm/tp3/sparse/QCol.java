package edu.uclm.tp3.sparse;

import java.util.HashMap;
import java.util.Map;

import edu.uclm.tp3.Complex;

public class QCol {
	
	private Map<Integer, Complex> values;
	private QMatrix matrix;

	public QCol(QMatrix matrix) {
		this.matrix = matrix;
		this.values = new HashMap<>();
	}

	public void set(int rowIndex, Complex value) {
		if (value.isZero())
			this.values.remove(rowIndex);
		else
			this.values.put(rowIndex, value);		
	}
	

	Complex get(int rowIndex) {
		if (this.values.containsKey(rowIndex))
			return this.values.get(rowIndex);
		return Complex.ZERO;
	}
	
	@Override
	public String toString() {
		StringBuilder sb = new StringBuilder();
		int rows = this.matrix.getNumberOfRows();
		for (int i=0; i<rows; i++)
			sb.append(this.get(i).toString() + "\n");
		return sb.toString();
	}

}
