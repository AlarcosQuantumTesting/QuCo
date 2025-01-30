package edu.uclm.tp3.sparse;

import java.util.HashMap;
import java.util.Map;

import edu.uclm.tp3.Complex;

public class QRow {
	private QMatrix matrix;
	private Map<Integer, Complex> values;
	
	public QRow(QMatrix matrix) {
		this.matrix = matrix;
		this.values = new HashMap<>();
	}
	
	public void set(int colIndex, Complex value) {
		if (value.isZero())
			this.values.remove(colIndex);
		else
			this.values.put(colIndex, value);
	}

	public Complex get(int colIndex) {
		Complex value = this.values.get(colIndex);
		if (value==null)
			return Complex.ZERO;
		return value;
	}
	
	public int size() {
		return this.matrix.getNumberOfColumns();
	}
	
	public StringBuilder toStringBuilder(boolean addReturn) {
		StringBuilder sb = new StringBuilder();
		Complex value;
		for (int i=0; i<this.size()-1; i++) {
			value = this.get(i);
			sb.append(value.toString()).append(", ");
		}
		value = this.get(this.size()-1);
		sb.append(value.toString());
		if (addReturn)
			sb.append("\n");
		return sb;
	}
	
	@Override
	public String toString() {
		return this.toStringBuilder(false).toString();
	}

	public Map<Integer, Complex> getValues() {
		return this.values;
	}
}
