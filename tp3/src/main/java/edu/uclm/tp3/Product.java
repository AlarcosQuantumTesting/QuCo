package edu.uclm.tp3;

public class Product {

	private Complex value;
	private ProductKey key;

	public Product(Complex value, int row, int col) {
		this.value = value;
		this.key = new ProductKey(row, col);
	}
	
	public int getRow() {
		return this.key.getRow();
	}
	
	public int getCol() {
		return this.key.getCol();
	}
	
	public Complex getValue() {
		return value;
	}

	@Override
	public String toString() {
		return this.value + "·u[" + this.getRow() + ", " + this.getCol() + "]";
	}

	public ProductKey getKey() {
		return this.key;
	}
}
