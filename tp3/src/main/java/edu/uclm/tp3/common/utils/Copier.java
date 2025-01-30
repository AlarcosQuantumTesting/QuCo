package edu.uclm.tp3.common.utils;

import java.util.ArrayList;
import java.util.List;

public class Copier {

	public static List<List<Integer>> copy(List<List<Integer>> receivedMatrixes) {
		List<List<Integer>> result = new ArrayList<>();
		for (int i=0; i<receivedMatrixes.size(); i++) 
			result.add(copyRow(receivedMatrixes.get(i)));
		return result;
	}
	
	public static List<Integer> copyRow(List<Integer> row) {
		List<Integer> result = new ArrayList<>();
		for (int i=0; i<row.size(); i++)
			result.add(row.get(i));
		return result;
	}
}
