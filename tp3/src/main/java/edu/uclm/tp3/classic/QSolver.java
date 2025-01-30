package edu.uclm.tp3.classic;

import java.util.ArrayList;
import java.util.List;

import edu.uclm.tp3.Complex;
import edu.uclm.tp3.Eq;
import edu.uclm.tp3.EqSystem;

public class QSolver {

	public static QMatrix guessUnitary(QMatrix input, QMatrix output) {
		QMatrix u = new QMatrix();
		List<Complex> inputRow, outputRow;
		
		EqSystem eqs = new EqSystem(u);
		for (int i=0; i<input.getNumberOfRows(); i++) {
			inputRow = input.getRow(i);
			outputRow = output.getRow(i);
			for (int j=0; j<inputRow.size(); j++) {
				Eq eq = multiply(inputRow, j, outputRow);
				if (!eq.isEmpty())
					eqs.add(eq, -1);
			}			
		}
		
		while (!eqs.isEmpty()) {
			eqs.replaceVariables();
		}
		
		return u;
	}

	private static Eq multiply(List<Complex> inputRow, int col, List<Complex> outputRow) {
		Complex value;
		
		Eq eq = new Eq();

		for (int i=0; i<inputRow.size(); i++) {
			value = inputRow.get(i);
			if (value.abs()==0)
				continue;
			
			eq.addProduct(value, i, col);
		}
		
		if (!eq.isEmpty())
			eq.setRight(outputRow.get(col));
		return eq;
	}

	public static List<QMatrix> guessGates(QMatrix input, QMatrix output) {
		List<QMatrix> result = new ArrayList<>();
		
		ArrayList<Integer> ones = new ArrayList<>();
		int rows = output.getNumberOfRows()/2;
		Complex last;
		for (int i=0; i<rows; i++) {
			List<Complex> row = output.getRow(i);
			last = row.get(row.size()-1);
			if (last.equals(Complex.ONE))
				ones.add(i);
		}
		
		List<List<QMatrix>> requiredMatrixes = new ArrayList<>();

		int cols = input.getRow(0).size();
		for (int i=0; i<ones.size(); i++) {
			int rowIndex = ones.get(i);
			List<Complex> row = input.getRow(rowIndex);
			List<QMatrix> columnMatrixes = new ArrayList<>();
			for (int j=0; j<cols-1; j++) {
				Complex value = row.get(j);
				if (value.isZero()) {
					columnMatrixes.add(QGates.x());
				} else {
					columnMatrixes.add(QGates.i());
				}
			}
			columnMatrixes.add(QGates.i());
			requiredMatrixes.add(columnMatrixes);
			requiredMatrixes.add(QGates.asList(QGates.ccx(input.getNumberOfRows())));
			requiredMatrixes.add(requiredMatrixes.get(requiredMatrixes.size()-2));
		}
		
		int requiredMatrixSize = requiredMatrixes.size();
		for (int i=0; i<requiredMatrixSize; i++) {
			List<QMatrix> columnMatrixes = requiredMatrixes.get(i);
			QMatrix newMatrix = columnMatrixes.get(0); 
			for (int j=1; j<columnMatrixes.size(); j++) {
				newMatrix = newMatrix.tp(columnMatrixes.get(j));
			}
			result.add(newMatrix);
		}
		
		return result;
	}

}
