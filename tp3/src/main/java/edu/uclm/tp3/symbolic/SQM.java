package edu.uclm.tp3.symbolic;

import java.util.List;

import edu.uclm.tp3.Complex;
import edu.uclm.tp3.classic.QMatrix;
import edu.uclm.tp3.dt.DT;

public class SQM {
	
	private DT<ICoord> dt;
	
	public SQM(int rows, int cols) {
		this.dt = new DT<>();
		for (int i=0; i<rows; i++) {
			for (int j=0; j<cols; j++) {
				this.dt.set(i, j, new Coord(i, j));
			}
		}
	}
	
	public SQM transpose() {
		DT<ICoord> t = this.dt.transpose();
		SQM result = new SQM(t.getNumberOfRows(), t.getNumberOfCols());
		result.dt = t;
		return result;
	}

	@Override
	public String toString() {
		return this.dt.toString();
	}

	public SQM multiply(SQM c) {
		int rows = this.dt.getNumberOfRows();
		int cols = this.dt.getNumberOfCols();
		
		SQM result = new SQM(rows, cols); 
		
		for (int i=0; i<rows; i++) {
			List<ICoord> row = this.dt.getRow(i);
			for (int j=0; j<cols; j++) {
				List<ICoord> col = c.getCol(j);
				CoordSum coordSum = this.multiplyCoords(row, col);
				result.set(i, j, coordSum);
			}
		}
		return result;
	}

	private void set(int row, int col, ICoord coords) {
		this.dt.getRow(row).set(col, coords);
	}

	private CoordSum multiplyCoords(List<ICoord> row, List<ICoord> col) {
		int n = row.size();
		CoordSum result = new CoordSum();
		Coord a, b;
		for (int i=0; i<n; i++) {
			a = (Coord) row.get(i);
			b = (Coord) col.get(i);
			CoordProduct product = new CoordProduct(a, b);
			if (a.getRow()==b.getRow()) {
				if (a.getCol()>b.getCol())
					product = new CoordProduct(b, a);
			} else if (a.getRow()>b.getRow()) {
				product = new CoordProduct(b, a);
			} 
			result.add(product);
		}
		return result;
	}

	public SQM multiply(QMatrix input) {
		int rows = input.getNumberOfRows();
		SQM result = new SQM(rows, rows);
		for (int i=0; i<rows; i++) {
			List<Complex> row = input.getRow(i);
			for (int j=0; j<this.getCols(); j++) {
				List<ICoord> col = this.getCol(j);
				ICoord cell = this.multiply(row, col);
				result.set(i, j, cell);
			}
		}
		return result;
	}

	private ICoord multiply(List<Complex> row, List<ICoord> col) {
		int n = row.size();
		CoordSum result = new CoordSum();
		for (int i=0; i<n; i++) {
			Complex value = row.get(i);
			ICoord coords = col.get(i);
			if (!value.equals(Complex.ZERO)) {
				coords.setFactor(value);
				result.add(coords);
			}
		}
		return result;
	}

	public int getCols() {
		return this.dt.getNumberOfCols();
	}
	
	public int getRows() {
		return this.dt.getNumberOfRows();
	}

	public List<ICoord> getCol(int col) {
		return this.dt.getCol(col);
	}

	public List<ICoord> getRow(int row) {
		return this.dt.getRow(row);
	}
}
