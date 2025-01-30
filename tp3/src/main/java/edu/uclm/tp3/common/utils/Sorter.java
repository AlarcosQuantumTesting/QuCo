package edu.uclm.tp3.common.utils;

import java.util.Comparator;
import java.util.List;

public class Sorter {
	int index;

	public void setIndex(int index) {
		this.index = index;
	}
	
	public void sort(List<List<Integer>> receivedMatrixes) {
		receivedMatrixes.sort(new Comparator<List<Integer>>() {

			@Override
			public int compare(List<Integer> o1, List<Integer> o2) {
				return o1.get(index).compareTo(o2.get(index));
			}
		});
	}
}