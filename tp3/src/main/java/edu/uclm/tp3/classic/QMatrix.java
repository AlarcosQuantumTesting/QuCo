package edu.uclm.tp3.classic;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import org.json.JSONArray;

import edu.uclm.tp3.Complex;
import edu.uclm.tp3.dt.DT;
import edu.uclm.tp3.dt.Row;

public class QMatrix {
	
	private DT<Complex> dt;
	
	public QMatrix() {
		this.dt = new DT<>();
	}

	public QMatrix(int inputQubits, int outputQubits) {
		this();
		int rows = (int) Math.pow(2, inputQubits);
		int cont = 0;
		String binaryString;
		int bsLength, zeros;
		Complex value;
		for (int i=0; i<rows; i++) {
			binaryString = Integer.toBinaryString(cont++);
			bsLength = binaryString.length();
			zeros = inputQubits-bsLength;
			for (int j=0; j<zeros; j++) 
				this.set(i, j, Complex.ZERO);
			
			for (int j=0; j<bsLength; j++) {
				char c = binaryString.charAt(j);
				value = new Complex(Double.parseDouble("" + c), 0.0);
				this.dt.set(i, zeros+j, value);
			}	
		}
		
		for (int i=0; i<rows; i++)
			for (int j=inputQubits; j<inputQubits+outputQubits; j++) 
				this.set(i, j, Complex.ZERO);
	}

	public QMatrix(String... rows) {
		this();
		String row;
		for (int i=0; i<rows.length; i++) {
			row = rows[i];
			if (row.startsWith("|")) {
				row = row.substring(1, row.length()-1);
				QMatrix column = this.buildRegister(row);
				for (int j=0; j<column.getNumberOfCols(); j++)
					this.set(i, j, column.getRow(0).get(j));
			} else if (row.contains(",")) {
				String[] tokens = row.split(",");
				for (int j=0; j<tokens.length; j++)
					this.dt.set(i, j, new Complex(tokens[j]));
			} else {
				for (int j=0; j<row.length(); j++)
					this.dt.set(i, j, new Complex(Double.parseDouble("" + row.charAt(j)), 0));
			}
		}
	}
	
	public void setValues(double... values) {
		int n = (int) Math.sqrt(values.length);
		int cont = 0;
		for (int i=0; i<n; i++)
			for (int j=0; j<n; j++)
				this.set(i, j, values[cont++]);
	}
	
	public QMatrix expects(int... ones) {
		QMatrix result = new QMatrix();
		Complex value;
		int rows = this.getNumberOfRows();
		for (int i=0; i<rows; i++) {
			for (int j=0; j<this.getNumberOfCols()-1; j++) {
				value = this.getRow(i).get(j);
				result.set(i, j, value);
			}
			result.set(i, this.getNumberOfCols()-1, Complex.ZERO);
		}
		int row;
		for (int i=0; i<ones.length; i++) {
			row = ones[i];
			result.set(row, this.getNumberOfCols()-1, Complex.ONE);
			row = row + this.getNumberOfRows()/2;
			if (row<rows)
				result.set(row, this.getNumberOfCols()-1, Complex.ONE);
		}
		return result;
	}

	private QMatrix buildRegister(String row) {
		QMatrix result;
		QMatrix zero = new QMatrix("10");
		QMatrix one = new QMatrix("01");

		char c = row.charAt(0);
		if (c=='0')
			result = new QMatrix("10");
		else 
			result = new QMatrix("01");
		
		for (int i=1; i<row.length(); i++) {
			c = row.charAt(i);
			if (c=='0')
				result = result.tp(zero);
			else 
				result = result.tp(one);
		}
		return result;
	}
	
	public QMatrix tp(QMatrix b) {
		QMatrix result = new QMatrix();
		int rows = this.getNumberOfRows() * b.getNumberOfRows();
		int cols = this.getNumberOfCols() * b.getNumberOfCols();
		for (int i=0; i<rows; i++)
			for (int j=0; j<cols; j++)
				result.set(i, j, 0.0);
		
		Complex value;
		QMatrix cell;
		for (int i=0; i<this.getNumberOfRows(); i++) {
			List<Complex> row = this.getRow(i);
			for (int j=0; j<row.size(); j++) {
				value = row.get(j);
				cell = b.multiply(value);
				result.set(i, j, cell);
			}
		}
		return result;
	}
	
	private void set(int row, int col, QMatrix matrix) {
		int rows = matrix.getNumberOfRows();
		int cols = matrix.getNumberOfCols();
		
		int targetRow = row * rows;
		int targetCol = col * cols;
		
		for (int i=0; i<matrix.getNumberOfRows(); i++) {
			for (int j=0; j<matrix.getNumberOfCols(); j++) {
				this.set(i + targetRow, j + targetCol, matrix.getRow(i).get(j));
			}
		}
	}
	
	public QMatrix multiply(Complex factor) {
		Complex value;
		QMatrix result = new QMatrix();
		for (int i=0; i<this.getNumberOfRows(); i++) {
			for (int j=0; j<this.getNumberOfCols(); j++) {
				value = this.getRow(i).get(j);
				result.set(i, j, factor.multiply(value));
			}
		}
		return result;
	}

	public void set(int row, int col, Double value) {
		Complex complex = new Complex(value, 0);
		this.dt.set(row, col, complex);
	}
	
	public void set(int row, int col, Complex value) {
		this.dt.set(row, col, value);
	}

	public int getNumberOfRows() {
		return this.dt.getNumberOfRows();
	}
	
	public int getNumberOfCols() {
		return this.dt.getNumberOfCols();
	}
	
	public List<Complex> getRow(int row) {
		return this.dt.getRow(row);
	}
	
	public List<Complex> getCol(int col) {
		return this.dt.getCol(col);
	}

	public void fillNullWith(Double value) {
		Complex complex = new Complex(value, 0);
		this.dt.fillNullWith(complex);
	}
	
	public String toQiskitCode(int index) {
		String result = this.toString();
		if (index<0) {
			result = "U=Operator([\n";
		} else {
			result = "U" + index + "=Operator([\n";
		}
		result = result + this.toString();
		return result;
	}
	
	@Override
	public String toString() {
		return this.dt.toString() + "\n])\n";
	}
	
	public QMatrix transpose() {
		QMatrix result = new QMatrix();
		List<Complex> row;
		Complex value;
		for (int i=0; i<this.getNumberOfRows(); i++) {
			row = this.getRow(i);
			for (int j=0; j<this.getNumberOfCols(); j++) {
				value = row.get(j);
				result.set(j, i, value);
			}
		}
		return result;
	}
	
	public QMatrix conjugate() {
		QMatrix result = new QMatrix();
		List<Complex> row;
		Complex value;
		for (int i=0; i<this.getNumberOfRows(); i++) {
			row = this.getRow(i);
			for (int j=0; j<this.getNumberOfCols(); j++) {
				value = row.get(j);
				result.set(i, j, value.conjugate());
			}
		}
		return result;
	}

	public QMatrix multiply(QMatrix b) {
		if (b.getNumberOfRows()<this.getNumberOfRows())
			b = b.transpose();
		QMatrix result = new QMatrix();
		List<Complex> rowA;
		List<Complex> colB;
		Complex value;
		
		for (int i=0; i<this.getNumberOfRows(); i++) {
			rowA = this.dt.getRow(i);
			for (int j=0; j<b.getNumberOfCols(); j++) {
				colB = b.getCol(j);
				value = this.multiply(rowA, colB);
				result.set(i, j, value);
			}
		}
		return result;
	}

	private Complex multiply(List<Complex> row, List<Complex> col) {
		Complex result = new Complex(0, 0);
		for (int i=0; i<row.size(); i++)
			result = result.add(row.get(i).multiply(col.get(i)));
		return result;
	}
	
	public static QMatrix multiply(List<QMatrix> gates) {
		QMatrix result = gates.get(0);
		for (int i=1; i<gates.size(); i++) {
			result = result.multiply(gates.get(i));
		}
		return result;
	}
	
	public Complex determinant() {
		Complex result = new Complex(0, 0);
		if (this.getNumberOfRows()==2 && this.getNumberOfCols()==2) {
			Complex a = this.getRow(0).get(0);
			Complex b = this.getRow(0).get(1);
			Complex c = this.getRow(1).get(0);
			Complex d = this.getRow(1).get(1);
			if (this.areZero(a, b, c, d))
				result = new Complex(0, 0);
			else if (this.areZero(a) || this.areZero(d))
				result = Complex.mONE.multiply(b).multiply(c);
			else if (this.areZero(b) || this.areZero(c))
				result = a.multiply(d);
			else
				result = a.multiply(d).minus(b.multiply(c));
		} else {
			List<Complex> row0 = this.getRow(0);
			Complex signo = new Complex(-1, 0);
			Complex value;
			for (int i=0; i<row0.size(); i++) {
				signo = signo.multiply(-1.0);
				value = signo.multiply(row0.get(i));
				if (value.isZero())
					return Complex.ZERO;
				QMatrix submatrix = this.submatrix(i);
				Complex det = submatrix.determinant();
				result = result.add(det.multiply(value));
			}
		}
		return result;
	}

	private boolean areZero(Complex... values) {
		for (int i=0; i<values.length; i++)
			if (!values[i].isZero())
				return false;
		return true;
	}

	private QMatrix submatrix(int colToRemove) {
		QMatrix result = new QMatrix();
		int rowSize = this.getNumberOfCols();
		Complex value;
		int contCol;
		for (int i=1; i<this.getNumberOfRows(); i++) {
			contCol = 0;
			for (int j=0; j<rowSize; j++) {
				if (j!=colToRemove) {
					value = this.getRow(i).get(j);
					result.set(i-1, contCol, value);
					contCol++;
				}
			}
		}
		return result;
	}

	public QMatrix hadamard() {
		QMatrix result = QGates.h();
		QMatrix h = QGates.h();
		
		int rows = this.getNumberOfRows();
		for (int i=1; i<rows; i++) {
			result = result.tp(h);
		}
		return result;
	}
	
	public List<List<String>> getMatrix() {
		List<List<String>> result = new ArrayList<>();
		List<Row<Complex>> rows = this.dt.getRows();
		
		Complex value;
		for (Row<Complex> row : rows) {
			ArrayList<String> resultRow = new ArrayList<>();
			for (int i=0; i<row.size(); i++) {
				value = row.get(i);
				resultRow.add(value.toMath());
			}
			result.add(resultRow);
		}
		return result;
	}


	@Override
	public int hashCode() {
		return Objects.hash(dt);
	}

	@Override
	public boolean equals(Object obj) {
		if (this == obj)
			return true;
		if (obj == null)
			return false;
		if (getClass() != obj.getClass())
			return false;
		QMatrix other = (QMatrix) obj;
		return Objects.equals(dt, other.dt);
	}

	public JSONArray toQuirk() {
		// TODO Auto-generated method stub
		return null;
	}
}
