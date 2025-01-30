package edu.uclm.tp3.quirk;

import java.util.ArrayList;
import java.util.List;

public class QuirkSolver {

	public static List<List<Object>> guessAllGates(List<List<Integer>> sRows, int inputQubits, int qubits, String domain) {
		List<List<Object>> requiredMatrixes = new ArrayList<>();
		List<Integer> sRow;
		int rows = sRows.size();
		for (int i=0; i<rows; i++) {
			sRow = sRows.get(i);
			if (domain.equals("AMPLITUDE"))
				requiredMatrixes.addAll(guessAmplitudeGates(sRow, inputQubits, qubits));
			else
				requiredMatrixes.addAll(guessPhaseGates(sRow, inputQubits, qubits));
		}
		if (!requiredMatrixes.isEmpty())
			requiredMatrixes.remove(requiredMatrixes.size()-1);
		return requiredMatrixes;
	}
	
	public static List<List<Object>> guessPhaseGates(List<Integer> sRow, int inputQubits, int qubits) {
		List<List<Object>> requiredMatrixes = new ArrayList<>();
		List<Object> column0 = newColumn(qubits);
		List<Object> column1 = newColumn(qubits);
		List<Object> column2 = newColumn(qubits);
		
		Integer value;
		boolean allOnes = true;
		for (int i=0; i<inputQubits; i++) {
			value = sRow.get(i);
			if (value==null || value==1) {
				column0.set(i, 1);
				column1.set(i, 1);
				column2.set(i, 1);
			} else {
				allOnes = false;
				column0.set(i, "H");
				column1.set(i, "Z");
				column2.set(i, "H");
			}
		}
		
		if (!allOnes) {
			for (int i=inputQubits; i<qubits; i++) {
				column0.set(i, 1);
				column1.set(i, 1);
				column2.set(i, 1);
			}
			requiredMatrixes.add(column0);
			requiredMatrixes.add(column1);
			requiredMatrixes.add(column2);
		}
		
		boolean added = false;
		for (int i=inputQubits; i<qubits; i++) {
			value = sRow.get(i);
			List<Object> calculusColumn0 = newColumn(qubits);
			List<Object> calculusColumn1 = newColumn(qubits);
			if (value==1) {
				added = true;
				for (int j=0; j<inputQubits; j++) {
					calculusColumn0.set(j, 1);
					if (sRow.get(j)==null)
						calculusColumn1.set(j, 1);
					else
						calculusColumn1.set(j, "%E2%80%A2"); // •	
				}
				
				calculusColumn0.set(i, "H");
				calculusColumn1.set(i, "Z");
								
				for (int j=inputQubits; j<qubits; j++) {
					if (j!=i) {
						calculusColumn0.set(j, 1);
						calculusColumn1.set(j, 1);
					}
				}
				
				requiredMatrixes.add(calculusColumn0);
				requiredMatrixes.add(calculusColumn1);
				requiredMatrixes.add(calculusColumn0);
			} 
		}
		
		if (!added)
			return new ArrayList<>();
			
		if (!allOnes) {
			requiredMatrixes.add(column2);
			requiredMatrixes.add(column1);
			requiredMatrixes.add(column0);
		}
		
		List<Object> identity = new ArrayList<>();
		for (int i=0; i<qubits; i++)
			identity.add("…");
		requiredMatrixes.add(identity);

		return requiredMatrixes;
	}
	
	public static List<Object> getInit(int qubits) {
		List<Object> init = new ArrayList<>();
		for (int j=0; j<qubits; j++)
			init.add(0);
		return init;
	}

	public static List<List<Object>> guessAmplitudeGates(List<Integer> sRow, int inputQubits, int qubits) {
		List<List<Object>> requiredMatrixes = new ArrayList<>();
		List<Object> column0 = newColumn(qubits);
		
		Integer value;
		boolean allOnes = true;
		for (int i=0; i<inputQubits; i++) {
			value = sRow.get(i);
			if (value==null || value==1) {
				column0.set(i, 1);
			} else {
				allOnes = false;
				column0.set(i, "X");
			}
		}
		
		if (!allOnes) {
			for (int i=inputQubits; i<qubits; i++)
				column0.set(i, 1);
			requiredMatrixes.add(column0);
		}
		
		boolean added = false;
		for (int i=inputQubits; i<qubits; i++) {
			value = sRow.get(i);
			List<Object> calculusColumn = newColumn(qubits);
			if (value==1) {
				added = true;
				for (int j=0; j<inputQubits; j++) 
					if (sRow.get(j)==null)
						calculusColumn.set(j, 1);
					else
						calculusColumn.set(j, "%E2%80%A2"); // •	
				
				calculusColumn.set(i, "X");
								
				for (int j=inputQubits; j<qubits; j++)
					if (j!=i)
						calculusColumn.set(j, 1);
				
				requiredMatrixes.add(calculusColumn);
			} 
		}
		
		if (!added)
			return new ArrayList<>();
			
		if (!allOnes)
			requiredMatrixes.add(column0);
		
		List<Object> identity = new ArrayList<>();
		for (int i=0; i<qubits; i++)
			identity.add("…");
		requiredMatrixes.add(identity);

		return requiredMatrixes;
	}
	
	private static List<Object> newColumn(int qubits) {
		List<Object> column = new ArrayList<>();
		for (int i=0; i<qubits; i++)
			column.add(null);
		return column;
	}
}
