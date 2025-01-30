package edu.uclm.tp3.dt;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class DT<T> {
	
	private List<Row<T>> rows;
	
	public DT() {
		this.rows = new ArrayList<>();
	}

	public void set(int row, int col, T value) {
		int columnsToAdd, rowsToAdd;
		
		int numberOfPreviousRows = this.rows.size();
		if (this.rows.isEmpty()) 
			columnsToAdd = col + 1;
		else 
			columnsToAdd = col - this.rows.get(0).size() + 1;
		
		rowsToAdd = row - this.rows.size() + 1;
		
		for (int i=0; i<rowsToAdd; i++)
			this.rows.add(new Row<>());
		
		if (columnsToAdd>0) {
			for (int i=0; i<numberOfPreviousRows; i++)
				this.rows.get(i).addColumns(columnsToAdd);
			
			for (int i=numberOfPreviousRows; i<this.rows.size(); i++)
				this.rows.get(i).addColumns(col + 1);
		} else {
			if (this.rows.get(0).size()>columnsToAdd)
				columnsToAdd = this.rows.get(0).size();
			for (int i=numberOfPreviousRows; i<this.rows.size(); i++)
				this.rows.get(i).addColumns(columnsToAdd);
		}
		
		Row<T> selectedRow = this.rows.get(row);
		selectedRow.set(col, value);
	}
	
	public DT<T> transpose() {
		DT<T> result = new DT<>();
		List<T> row;
		T value;
		for (int i=0; i<this.getNumberOfRows(); i++) {
			row = this.getRow(i);
			for (int j=0; j<this.getNumberOfCols(); j++) {
				value = row.get(j);
				result.set(j, i, value);
			}
		}
		return result;
	}
	
	public List<Row<T>> getRows() {
		return rows;
	}

	public void fillNullWith(T value) {
		for (int i=0; i<this.rows.size(); i++)
			this.rows.get(i).fillNullWith(value);
	}

	public int getNumberOfRows() {
		return this.rows.size();
	}
	
	public int getNumberOfCols() {
		return this.rows.get(0).size();
	}
	
	public List<T> getRow(int index) {
		return this.rows.get(index).toList();
	}
	
	public List<T> getCol(int index) {
		List<T> result = new ArrayList<>();
		Row<T> row;
		for (int i=0; i<this.rows.size(); i++) {
			row = this.rows.get(i);
			result.add(row.get(index));
		}
		return result;
	}
	
	@Override
	public String toString() {
		StringBuilder sb = new StringBuilder();
		for (Row<T> row : this.rows)
			sb.append("\t" + row.toString());
		String r = sb.toString();
		if (r.endsWith(",\n"))
			r = r.substring(0, r.length()-2);
		return r;
	}

	@Override
	public int hashCode() {
		return Objects.hash(rows);
	}

	@Override
	public boolean equals(Object obj) {
		if (this == obj)
			return true;
		if (obj == null)
			return false;
		if (getClass() != obj.getClass())
			return false;
		@SuppressWarnings("rawtypes")
		DT other = (DT) obj;
		return Objects.equals(rows, other.rows);
	}
	
}
