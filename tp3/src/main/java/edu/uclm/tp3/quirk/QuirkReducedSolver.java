package edu.uclm.tp3.quirk;

import java.util.ArrayList;
import java.util.List;

public class QuirkReducedSolver {

	public static List<List<Object>> guessAllReducedGates(List<List<List<Integer>>> reducedMatrixes, int inputQubits, int qubits, String domain) {
		List<List<Object>> requiredMatrixes = new ArrayList<>();
		for (int i=0; i<reducedMatrixes.size(); i++) {
			List<List<Integer>> reducedMatrix = reducedMatrixes.get(i);
			int outputQubit = inputQubits + i;
			for (int j=0; j<reducedMatrix.size(); j++) {
				List<Integer> sRow = reducedMatrix.get(j);
				List<List<Object>> gates;
				if (domain.equals("AMPLITUDE"))
					gates = guessAmplitudeGates(sRow, inputQubits, qubits, outputQubit);
				else
					gates = guessPhaseGates(sRow, inputQubits, qubits, outputQubit);
				requiredMatrixes.addAll(gates);
			}
		}
		return requiredMatrixes;
	}
	
	public static List<List<Object>> guessPhaseGates(List<Integer> sRow, int inputQubits, int qubits, int outputQubit) {
		List<List<Object>> requiredMatrixes = guessAmplitudeGates(sRow, inputQubits, qubits, outputQubit);
		requiredMatrixes = changeToPhase(requiredMatrixes);		
		return requiredMatrixes;
	}
	
	private static List<List<Object>> changeToPhase(List<List<Object>> requiredMatrixes) {
		List<List<Object>> result = new ArrayList<>();
		for (int i=0; i<requiredMatrixes.size(); i++) {
			List<Object> requiredMatrix = requiredMatrixes.get(i);
			if (requiredMatrix.get(0).equals("…"))
				result.add(requiredMatrix);
			else 
				result.addAll(changeMatrixToPhase(requiredMatrix));
		}
		return result;
	}

	private static List<List<Object>> changeMatrixToPhase(List<Object> requiredMatrix) {
		List<List<Object>> newMatrix = new ArrayList<>();
		int xIndex = findIndex(requiredMatrix, "X");
		if (!hasControlGates(requiredMatrix)) {
			append(newMatrix, "H", xIndex, requiredMatrix.size());
			append(newMatrix, "X", xIndex, requiredMatrix.size());
			append(newMatrix, "H", xIndex, requiredMatrix.size());
		} else {
			append(newMatrix, "H", xIndex, requiredMatrix.size());
			appendCCZ(requiredMatrix, newMatrix, xIndex, requiredMatrix.size());
			append(newMatrix, "H", xIndex, requiredMatrix.size());
		}	
		return newMatrix;
	}

	private static void appendCCZ(List<Object> requiredMatrix, List<List<Object>> newMatrix, int xIndex, int qubits) {
		List<Object> column1 = newColumn(qubits);		
		for (int i=0; i<requiredMatrix.size(); i++)
			column1.set(i, requiredMatrix.get(i));
		column1.set(xIndex, "Z");
		
		newMatrix.add(column1);
	}

	private static void append(List<List<Object>> newMatrix, String gateName, int xIndex, int qubits) {
		List<Object> column0 = newColumn(qubits);
		column0.set(xIndex, gateName);
		newMatrix.add(column0);
	}

	private static int findIndex(List<Object> requiredMatrix, Object gateName) {
		for (int i=0; i<requiredMatrix.size(); i++)
			if (requiredMatrix.get(i).equals(gateName.toString()))
				return i;
		return -1;
	}

	private static boolean hasControlGates(List<Object> requiredMatrix) {
		for (int i=0; i<requiredMatrix.size(); i++)
			if (requiredMatrix.get(i).toString().equals("1"))
				return true;
		return false;
	}

	public static List<List<Object>> guessAmplitudeGates(List<Integer> sRow, int inputQubits, int qubits, int outputQubit) {
		List<List<Object>> requiredMatrixes = new ArrayList<>();
		List<Object> column0 = newColumn(qubits);
		
		Integer value;
		boolean allOnes = true;
		for (int i=0; i<inputQubits; i++) {
			value = sRow.get(i);
			if (value!=null && value==0) {
				allOnes = false;
				column0.set(i, "X");
			}
		}
		
		if (!allOnes)
			requiredMatrixes.add(column0);
		
		value = sRow.get(outputQubit);
		if (value==1) {
			List<Object> calculusColumn = newColumn(qubits);
			for (int j=0; j<inputQubits; j++) 
				if (sRow.get(j)!=null)
					calculusColumn.set(j, "%E2%80%A2"); // •	
			
			calculusColumn.set(outputQubit, "X");
			requiredMatrixes.add(calculusColumn);
		} 
			
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
			column.add(1);
		return column;
	}
}
