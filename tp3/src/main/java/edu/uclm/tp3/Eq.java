package edu.uclm.tp3;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class Eq {

	private List<Product> products;
	private Complex right;
	
	public Eq() {
		this.products = new ArrayList<>();
	}

	public void addProduct(Complex value, int row, int col) {
		Product product = new Product(value, row, col);
		this.products.add(product);
	}

	@Override
	public String toString() {
		StringBuilder sb = new StringBuilder();
		for (int i=0; i<this.products.size(); i++) {
			Product p = this.products.get(i);
			sb.append(p.toString());
			if (i<this.products.size()-1)
				sb.append("+");
		}
		return sb.toString() + "=" + this.right + "\n";
	}

	public boolean isEmpty() {
		return this.products.isEmpty();
	}

	public void setRight(Complex value) {
		this.right = value;
	}
	
	public Complex getRight() {
		return right;
	}

	public int size() {
		return this.products.size();
	}

	public Product getProduct(int index) {
		return this.products.get(index);
	}

	public void replaceVariables(Map<ProductKey, Complex> knownVariables) {
		Product p;
		ProductKey pk;
		Complex value;
		
		for (int i=this.products.size()-1; i>=0; i--) {
			p = this.products.get(i);
			pk = p.getKey();
			value = knownVariables.get(pk);
			if (value!=null) {
				this.products.remove(i);
				this.right = this.right.minus(p.getValue().multiply(value));
			}
		}		
	}
}
