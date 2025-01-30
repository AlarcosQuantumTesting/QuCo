package edu.uclm.tp3.dt;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class Row<T> {
	
	private List<T> values;
	
	public Row() {
		this.values = new ArrayList<>();
	}

	public Row(int size) {
		this.values = new ArrayList<>();
		for (int i=0; i<size; i++)
			this.values.add(null);
	}

	public int size() {
		return this.values.size();
	}

	public void addColumns(int columnsToAdd) {
		for (int i=0; i<columnsToAdd; i++)
			this.values.add(null);
	}

	public T set(int col, T value) {
		return this.values.set(col, value);
	}
	
	public T get(int col) {
		return this.values.get(col);
	}

	public void fillNullWith(T value) {
		for (int i=0; i<this.values.size(); i++)
			if (this.values.get(i)==null)
				this.values.set(i, value);
	}
	
	public List<T> toList() {
		return this.values;
	}
	
	public List<T> getValues() {
		return values;
	}
	
	@Override
	public String toString() {
		StringBuilder sb = new StringBuilder("[");
		for (T value : this.values)
			if (value!=null)
				sb.append(value.toString() + ",");
			else
				sb.append("null,");
		String r = sb.toString();
		r = r.substring(0, r.length()-1);
		r = r + "],\n";
		return r;
	}

	@Override
	public int hashCode() {
		return Objects.hash(values);
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
		Row other = (Row) obj;
		return Objects.equals(values, other.values);
	}

		
}
