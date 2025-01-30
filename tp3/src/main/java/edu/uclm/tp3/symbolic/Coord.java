package edu.uclm.tp3.symbolic;

import edu.uclm.tp3.Complex;

public class Coord extends ICoord {
	private int row, col;

	public Coord(int row, int col) {
		super(1.0);
		this.row = row;
		this.col = col;
	}
	
	public int getRow() {
		return row;
	}
	
	public void setRow(int row) {
		this.row = row;
	}
	
	public int getCol() {
		return col;
	}
	
	public void setCol(int col) {
		this.col = col;
	}	
	
	@Override
	public String toString() {
		return (this.factor.equals(Complex.ONE) ? "" : this.factor) + "u[" + this.row + "," + this.col + "]";
	}
}
