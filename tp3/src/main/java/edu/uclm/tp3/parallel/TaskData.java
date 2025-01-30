package edu.uclm.tp3.parallel;

public class TaskData {

	private Object data;
	private int size;

	public void setData(Object data) {
		this.data = data;
	}
	
	public Object getData() {
		return this.data;
	}
	
	public void setSize(int size) {
		this.size = size;
	}
	
	public int size() {
		return this.size;
	}
	
}
