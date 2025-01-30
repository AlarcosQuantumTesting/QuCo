package edu.uclm.tp3.grover;

import java.util.ArrayList;
import java.util.List;

public class GroverSolver {

	public static List<Object> getGate(int qubits, Object gateName) {
		List<Object> init = new ArrayList<>();
		for (int j=0; j<qubits; j++)
			init.add(gateName);
		return init;
	}

	public static List<List<Object>> guessGroverOracle(List<List<Integer>> sRows, int qubits) {
		List<List<Object>> requiredMatrixes = new ArrayList<>();
		List<Integer> sRow;
		int rows = sRows.size();
		for (int i=0; i<rows; i++) {
			sRow = sRows.get(i);
			requiredMatrixes.addAll(guessGates(sRow, qubits));
		}
		return requiredMatrixes;
	}
	
	public static List<List<Object>> guessDifussor(int qubits) {
		List<Object> hh = getGate(qubits, "H");
		List<Object> xx = getGate(qubits, "X");
		List<List<Object>> column2 = getCCZ(qubits);
		
		List<List<Object>> result = new ArrayList<>();
		result.add(hh);
		result.add(xx);
		result.addAll(column2);
		result.add(xx);
		result.add(hh);
		return result;
	}

	private static List<List<Object>> guessGates(List<Integer> sRow, int qubits) {
		List<List<Object>> requiredMatrixes = new ArrayList<>();
		List<Object> column0 = newColumn(qubits);
		Integer value;
		for (int i=0; i<qubits; i++) {
			value = sRow.get(i);
			if (value!=null && value==0)
				column0.set(qubits-i-1, "X");
		}
		requiredMatrixes.add(column0);
		requiredMatrixes.addAll(getCCZ(qubits));
		requiredMatrixes.add(column0);
		return requiredMatrixes;
	}

	private static List<List<Object>> getCCZ(int qubits) {
		List<Object> column0 = newColumn(qubits);
		List<Object> column1 = newColumn(qubits);
		for (int i=0; i<qubits-1; i++) {
			column0.set(i, 1);
			column1.set(i, "%E2%80%A2");
		}
		column0.set(qubits-1, "H");
		column1.set(qubits-1, "X");
		List<List<Object>> ccz = new ArrayList<>();
		ccz.add(column0);
		ccz.add(column1);
		ccz.add(column0);
		return ccz;
	}

	public static List<Object> newColumn(int qubits) {
		List<Object> column = new ArrayList<>();
		for (int i=0; i<qubits; i++)
			column.add(1);
		return column;
	}
}
