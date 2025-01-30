package edu.uclm.tp3.classic;

import java.util.ArrayList;
import java.util.List;

import edu.uclm.tp3.Complex;

public class QGates {
	
	public static QMatrix h() {
		QMatrix h = new QMatrix();
		h.set(0, 0, 1/Math.sqrt(2));
		h.set(0, 1, 1/Math.sqrt(2));
		h.set(1, 0, 1/Math.sqrt(2));
		h.set(1, 1, -1/Math.sqrt(2));
		return h;
	}
	
	public static QMatrix x() {
		QMatrix x = new QMatrix();
		x.set(0, 0, 0.0);
		x.set(0, 1, 1.0);
		x.set(1, 0, 1.0);
		x.set(1, 1, 0.0);
		return x;
	}
	
	public static QMatrix y() {
		QMatrix y = new QMatrix();
		y.set(0, 0, 0.0);
		y.set(0, 1, new Complex(0, -1));
		y.set(1, 0, new Complex(0, 1));
		y.set(1, 1, 0.0);
		return y;
	}
	
	public static QMatrix i() {
		QMatrix i = new QMatrix();
		i.set(0, 0, 1.0);
		i.set(0, 1, 0.0);
		i.set(1, 0, 0.0);
		i.set(1, 1, 1.0);
		return i;
	}

	public static QMatrix ccx() {
		return new QMatrix(
			"10000000", "01000000", "00100000",
			"00010000", "00001000", "00000100",
			"00000001", "00000010"
		);
	}
	
	public static QMatrix ccx(int rows) {
		QMatrix result = new QMatrix();
		for (int i=0; i<rows; i++) {
			for (int j=0; j<rows; j++) {
				result.set(i, j, (i==j ? Complex.ONE : Complex.ZERO));
			}
		}
		result.set(rows-2, rows-2, Complex.ZERO);
		result.set(rows-2, rows-1, Complex.ONE);
		result.set(rows-1, rows-2, Complex.ONE);
		result.set(rows-1, rows-1, Complex.ZERO);
		return result;
	}

	public static List<QMatrix> asList(QMatrix matrix) {
		ArrayList<QMatrix> result = new ArrayList<>();
		result.add(matrix);
		return result;
	}
	
	
}
