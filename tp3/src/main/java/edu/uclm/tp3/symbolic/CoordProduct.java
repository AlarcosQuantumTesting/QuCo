package edu.uclm.tp3.symbolic;

public class CoordProduct extends ICoord {
	Coord a, b;

	public CoordProduct(Coord a, Coord b) {
		super(1.0);
		this.a = a;
		this.b = b;
	}

	@Override
	public String toString() {
		return this.a.toString() + this.b.toString();
	}
}
