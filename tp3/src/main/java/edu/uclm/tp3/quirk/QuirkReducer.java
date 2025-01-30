package edu.uclm.tp3.quirk;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import edu.uclm.tp3.common.utils.Copier;
import edu.uclm.tp3.common.utils.Sorter;

public class QuirkReducer {

	public static List<List<List<Integer>>> reduce(List<List<Integer>> receivedMatrixes, int inputQubits, int qubits) {
		List<List<List<Integer>>> result = new ArrayList<>();

		Sorter sorter = new Sorter();
		for (int i=inputQubits; i<qubits; i++) {
			List<List<Integer>> matrixes = Copier.copy(receivedMatrixes);
			
			sorter.setIndex(i);
			sorter.sort(matrixes);
			final int cont = i; 
			
			List<List<Integer>> one = matrixes.stream().filter(row -> row.get(cont)==1).collect(Collectors.toList());			
			List<List<Integer>> reducedMatrix = reduce(one, inputQubits);
			result.add(reducedMatrix);
		}
		return result;
	}

	public static List<List<Integer>> reduce(List<List<Integer>> matrix, int inputQubits ) {
		boolean hayReduccion;
		do {
			hayReduccion = false;
			for (int i=0; i<matrix.size(); i++) {
				List<Integer> rowA = matrix.get(i);
				for (int j=i+1; j<matrix.size(); j++) {
					List<Integer> rowB = matrix.get(j);
					int reducibleColumn = hD(rowA, rowB, inputQubits);
					if (reducibleColumn>=0) {
						rowA.set(reducibleColumn, null);
						matrix.remove(j--);
						hayReduccion=true;
					} 
				}
			}
		} while (hayReduccion);
		return matrix;
	}

	private static int hD(List<Integer> rowA, List<Integer> rowB, int inputQubits) {
		int contDistintas = 0;
		int reducibleColumn = -1;
		Integer aValue, bValue;
		for (int i=0; i<inputQubits; i++) {
			aValue = rowA.get(i);
			bValue = rowB.get(i);
			
			if (aValue==null && bValue==null)
				continue;
			
			if (aValue==null || bValue==null) {
				reducibleColumn = -1;
				break;
			}
			
			if (rowA.get(i).intValue()!=rowB.get(i).intValue()) {
				contDistintas++;
				reducibleColumn = i;
			} 
			
			if (contDistintas>1) {
				reducibleColumn = -1;
				break;
			}
		}
		
		return reducibleColumn;
	}
}


