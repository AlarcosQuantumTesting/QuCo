package edu.uclm.tp3;

import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import edu.uclm.tp3.classic.QMatrix;
import edu.uclm.tp3.symbolic.SQM;

public class SQMTest {
	
	@Test
	void test1() { 	
		QMatrix input = new QMatrix(
			"|000>", "|010>", "|100>", "|110>",
			"|001>", "|011>", "|101>", "|111>"
		);
		System.out.println("input=\n" + input);
		
		SQM u = new SQM(8, 8);
		System.out.println("u=\n" + u);
		
		SQM uT = u.transpose();
		System.out.println("uT=\n" + uT);
				
		QMatrix output = new QMatrix(
				"|000>", "|010>", "|101>", "|111>",
				"|000>", "|010>", "|101>", "|111>"
			);
		System.out.println("output=\n" + output);

		SQM ouT = uT.multiply(output); 
		System.out.println("o·U*=\n" + ouT);
		
		Complex detOutput = output.determinant();
		System.out.println(detOutput);
		
/*		int rows = uu.getRows();
		int cols = uu.getCols();
		for (int i=0; i<rows; i++) {
			for (int j=0; j<cols; j++) {
				List<ICoord> uuRow = uu.getRow(i);
				List<Complex> outRow = output.getRow(i);
				String r = uuRow.get(j).toString().trim() + " = " + outRow.get(j);
				System.out.println(r);
			}
		}*/
	}
	
	@Test
	void testDet() {
		QMatrix m = new QMatrix("12", "34");
		assertTrue(m.determinant().equals(new Complex(-2, 0)));
		
		m = new QMatrix("12", "45");
		assertTrue(m.determinant().equals(new Complex(-3, 0)));
		
		m = new QMatrix("123", "453", "160");
		assertTrue(m.determinant().equals(new Complex(45, 0)));
		
		m = new QMatrix("1231", "4536", "1603", "5921");
		assertTrue(m.determinant().equals(new Complex(-350, 0)));
	}
	
	@Test
	void testMultComplex() {
		Complex a = new Complex(0, 1);
		Complex b = new Complex(0, 1);
		Complex p = a.multiply(b);		
		assertTrue(p.getRe()==-1);
		
		a = new Complex(2, -1);
		b = new Complex(2, 0);
		p = a.multiply(b);
		assertTrue(p.equals(new Complex(4, -2)));
		
		a = new Complex(3, 1);
		b = new Complex(0, -1);
		p = a.multiply(b);
		assertTrue(p.equals(new Complex(1, -3)));
	}
}