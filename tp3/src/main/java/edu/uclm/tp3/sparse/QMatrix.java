package edu.uclm.tp3.sparse;

import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnore;

import edu.uclm.tp3.Complex;

public class QMatrix {
	private Map<Integer, QRow> rows;
	private Map<Integer, QCol> cols;
	private int numberOfColumns;
	private int numberOfRows;
	
	public QMatrix() {
		this.rows = new HashMap<>();
		this.cols = new HashMap<>();
	}
	
	public int getNumberOfColumns() {
		return numberOfColumns;
	}
	
	public int getNumberOfRows() {
		return numberOfRows;
	}
	
	private QRow getRow(int index) {
		return this.rows.get(index);
	}
	
	@JsonIgnore
	public Map<Integer, QCol> getCols() {
		return cols;
	}

	public QMatrix control() {
		QMatrix controlled = QMatrix.i(2*this.numberOfColumns);
		for (int i=0; i<this.numberOfRows; i++) {
			for (int j=0; j<this.numberOfColumns; j++) {
				Complex value = this.getElement(i, j);
				controlled.set(this.numberOfRows+i, this.numberOfColumns+j, value);
			}
		}
		return controlled;
	}
	
	public void setValues(double... values) {
		int n = (int) Math.sqrt(values.length);
		int cont = 0;
		for (int i=0; i<n; i++)
			for (int j=0; j<n; j++) {
				Complex value = new Complex(values[cont++], 0);
				this.set(i, j, value);
			}
	}

	public void set(int rowIndex, int colIndex, QMatrix matrix) {
		for (int i=0; i<matrix.numberOfRows; i++) {
			for (int j=0; j<matrix.numberOfColumns; j++) {
				this.set(rowIndex+i, colIndex+j, matrix.getElement(i, j));
			}
		}
	}
	
	public synchronized void set(int rowIndex, int colIndex, double value) {
		if (rowIndex>=this.numberOfRows)
			this.numberOfRows = rowIndex + 1;
		if (colIndex>=this.numberOfColumns)
			this.numberOfColumns = colIndex + 1;
		
		QRow row = this.rows.get(rowIndex);
		if (row==null) {
			row = new QRow(this);
			this.rows.put(rowIndex, row);
		}
		
		Complex complex = new Complex(value, 0);
		row.set(colIndex, complex);
		QCol col = this.cols.get(colIndex);
		if (col==null) {
			col = new QCol(this);
			this.cols.put(colIndex, col);
		}
		col.set(rowIndex, complex);
	}
	
	public synchronized void set(int rowIndex, int colIndex, Complex value) {
		if (rowIndex>=this.numberOfRows)
			this.numberOfRows = rowIndex + 1;
		if (colIndex>=this.numberOfColumns)
			this.numberOfColumns = colIndex + 1;
		
		QRow row = this.rows.get(rowIndex);
		if (row==null) {
			row = new QRow(this);
			this.rows.put(rowIndex, row);
		}
		row.set(colIndex, value);
		QCol col = this.cols.get(colIndex);
		if (col==null) {
			col = new QCol(this);
			this.cols.put(colIndex, col);
		}
		col.set(rowIndex, value);
	}
	
	public StringBuilder toStringBuilder(boolean addBrackets) {
		StringBuilder sb = new StringBuilder();
		for (int i=0; i<this.numberOfRows; i++) {
			QRow row = this.getRow(i);
			if (addBrackets)
				sb.append("[");
			sb.append(row.toStringBuilder(!addBrackets));
			if (addBrackets)
				sb.append("],\n");
		}
		return sb;
	}
	
	@Override
	public String toString() {
		return this.toStringBuilder(false).toString();
	}

	public static QMatrix x() {
		QMatrix result = new QMatrix();
		result.set(0, 1, Complex.ONE);
		result.set(1, 0, Complex.ONE);
		return result;
	}
	
	public static QMatrix i() {
		QMatrix result = new QMatrix();
		result.set(0, 0, Complex.ONE);
		result.set(1, 1, Complex.ONE);
		return result;
	}
	
	public static QMatrix i(int qubits) {
		QMatrix result = new QMatrix();
		for (int i=0; i<qubits; i++)
			result.set(i, i, Complex.ONE);
		return result;
	}
	
	public static QMatrix ccx(int qubits, int controlledQubit) {
		QMatrix result = new QMatrix();
		for (int i=0; i<Math.pow(2, qubits); i++)
			result.set(i, i, Complex.ONE);
		
		int start = (int) Math.pow(2, controlledQubit+1);
		result.set(start-2, start-2, Complex.ZERO);
		result.set(start-2, start-1, Complex.ONE);
		result.set(start-1, start-1, Complex.ZERO);
		result.set(start-1, start-2, Complex.ONE);
		return result;
	}

	public static QMatrix multiply(List<QMatrix> matrices) {
		QMatrix result = matrices.get(0);
		for (int i=1; i<matrices.size(); i++)
			if (matrices.get(i)!=null)
				result = multiply(result, matrices.get(i));
		return result;
	}
	
	public static QMatrix multiply(QMatrix... matrices) {
		QMatrix result = matrices[0];
		for (int i=1; i<matrices.length; i++)
			if (matrices[i]!=null)
				result = multiply(result, matrices[i]);
		return result;
	}
	
	
	public static QMatrix multiply(QMatrix a, QMatrix b) {
		if (a==null && b==null)
			return null;
		if (a==null)
			return b;
		if (b==null)
			return a;
		QMatrix result = new QMatrix();
		
		Iterator<Integer> rowKeys = a.getRows().keySet().iterator();
		int aRowKey;
		int[] aColCont = { 0 };
		QRow aRow;
		while (rowKeys.hasNext()) {
			aColCont[0] = 0;
			aRowKey = rowKeys.next();
			aRow = a.getRow(aRowKey);
			multiply(result, aRow, aRowKey, b);
		}

		return result;
	}

	private static void multiply(QMatrix result, QRow aRow, int aRowKey, QMatrix b) {
		Iterator<Integer> bColKeys = b.getCols().keySet().iterator();
		int bColKey;
		QCol bCol;
		Complex value;
		
		while (bColKeys.hasNext()) {
			bColKey = bColKeys.next();
			bCol = b.cols.get(bColKey);
			value = multiply(aRow, bCol);
			result.set(aRowKey, bColKey, value);
		}
	}
	
	private static Complex multiply(QRow aRow, QCol bCol) {
		Iterator<Integer> aColKeys = aRow.getValues().keySet().iterator();
		int aColKey;
		Complex valueA, valueB;
		Complex result = Complex.ZERO;
		while (aColKeys.hasNext()) {
			aColKey = aColKeys.next();
			valueA = aRow.get(aColKey);
			valueB = bCol.get(aColKey);
			if (valueA.isZero() || valueB.isZero())
				continue;
			result = result.add(valueA.multiply(valueB));
		}
		return result;
	}	
	
	public static QMatrix tp(List<QMatrix> matrices) {
		QMatrix result = matrices.get(0);
		for (int i=1; i<matrices.size(); i++)
			result = result.tp(matrices.get(i));
		return result;
	}

	public QMatrix tp(QMatrix b) {
		QMatrix result = new QMatrix();
		Iterator<Integer> rowKeys = this.rows.keySet().iterator();
		int rowKey;
		int width = Math.min(this.numberOfColumns, b.numberOfColumns);
		int height = Math.min(this.numberOfRows, b.numberOfRows);
				
		while (rowKeys.hasNext()) {
			rowKey = rowKeys.next();
			QRow row = this.rows.get(rowKey);
			result.tp(rowKey, row, b, width, height);
		}
		return result;
	}

	private void tp(int rowKey, QRow row, QMatrix b, int width, int height) {
		Iterator<Integer> colKeys = row.getValues().keySet().iterator();
		int colKey;
		Complex value;
		while (colKeys.hasNext()) {
			colKey = colKeys.next();
			value = row.get(colKey);
			this.tp(value, rowKey, colKey, b, width, height);
		}
	}

	private void tp(Complex aValue, int aRowKey, int aColKey, QMatrix b, int aWidth, int aHeight) {
		Iterator<Integer> bKeys = b.rows.keySet().iterator();
		int bRowKey;
		while (bKeys.hasNext()) {
			bRowKey = bKeys.next();
			QRow bRow = b.getRow(bRowKey);
			Iterator<Integer> columnKeys = bRow.getValues().keySet().iterator();
			int bColKey;
			while (columnKeys.hasNext()) {
				bColKey = columnKeys.next();
				Complex bValue = bRow.get(bColKey);
				Complex value = aValue.multiply(bValue);
				int destCol = aColKey * aWidth + bColKey;
				int destRow = aRowKey * aHeight + bRowKey;
				this.set(destRow, destCol, value);
			}
		}
	}
	
	public Map<Integer, QRow> getRows() {
		return rows;
	}

	public Complex getElement(int nRow, int nCol) {
		QRow row = this.getRow(nRow);
		return row.get(nCol);
	}

	public boolean isEmpty() {
		return this.numberOfColumns==0;
	}
}
