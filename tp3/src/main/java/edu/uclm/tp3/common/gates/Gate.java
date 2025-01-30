package edu.uclm.tp3.common.gates;

import java.io.Serializable;
import java.util.List;

import edu.uclm.tp3.classic.QMatrix;
import edu.uclm.tp3.common.model.Circuit;

public abstract class Gate implements Serializable {
		
	private static final long serialVersionUID = 1L;
	protected int index;

	@Override
	public abstract String toString();
		
	public abstract edu.uclm.tp3.sparse.QMatrix getMatrix();

	public String getCode() {
		return "circuit." + this.toString();
	}
	
	public abstract List<String> getQubitsAsStrings(int qubits);

	public abstract void copyQubits(Gate gate);

	public abstract void setQubit(int tirada, int qubit);

	public void setIndex(int index) {
		this.index = index;
	}
	
	public int getIndex() {
		return index;
	}

	public abstract void assignRandomQubits(Circuit circuit);

	public abstract void modifyQubits(int qubits);
}
