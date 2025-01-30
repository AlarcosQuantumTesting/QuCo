package edu.uclm.tp3.common.services;

import edu.uclm.tp3.common.gates.Gate;

public class GateDescription {

	private Class<? extends Gate> clazz;
	private int affectedQubits;

	public GateDescription(Class<? extends Gate> clazz, int affectedQubits) {
		this.clazz = clazz;
		this.affectedQubits = affectedQubits;
	}

	public String getName() {
		return this.clazz.getSimpleName();
	}

	public Class<? extends Gate> getGateClazz() {
		return clazz;
	}

	public int getAffectedQubits() {
		return affectedQubits;
	}

	public void setAffectedQubits(int affectedQubits) {
		this.affectedQubits = affectedQubits;
	}

	
}
