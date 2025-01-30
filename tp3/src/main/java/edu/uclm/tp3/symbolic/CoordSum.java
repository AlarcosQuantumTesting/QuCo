package edu.uclm.tp3.symbolic;

import java.util.ArrayList;
import java.util.List;

import edu.uclm.tp3.Complex;

public class CoordSum extends ICoord {

	private List<ICoord> products;
	
	public CoordSum() {
		super(1.0);
		this.products = new ArrayList<>();
	}

	public void add(ICoord coord) {
		this.products.add(coord);
	}
	
	@Override
	public void setFactor(Complex factor) {
		for (ICoord product : this.products)
			product.setFactor(factor.multiply(product.getFactor()));
	}
	
	@Override
	public String toString() {
		StringBuilder sb = new StringBuilder();
		for (int i=0; i<products.size()-1; i++)
			sb.append(products.get(i).toString() + "+");
		sb.append(products.get(products.size()-1).toString());
		return sb.toString();
	}
}
