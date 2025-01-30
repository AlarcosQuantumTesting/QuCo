package edu.uclm.tp3;

import java.util.Objects;

public class ProductKey {

	private int row;
	private int col;

	public ProductKey(int row, int col) {
		this.row = row;
		this.col = col;
	}
	
	public int getRow() {
		return row;
	}
	
	public int getCol() {
		return col;
	}

	@Override
	public String toString() {
		return this.row + "," + this.col;
	}

	@Override
	public int hashCode() {
		return Objects.hash(col, row);
	}

	@Override
	public boolean equals(Object obj) {
		if (this == obj)
			return true;
		if (obj == null)
			return false;
		if (getClass() != obj.getClass())
			return false;
		ProductKey other = (ProductKey) obj;
		return col == other.col && row == other.row;
	}
	
	
}
