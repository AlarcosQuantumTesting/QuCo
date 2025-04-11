package edu.uclm.tp3.common.gates;

import java.util.ArrayList;
import java.util.List;

import edu.uclm.tp3.common.model.Circuit;
import edu.uclm.tp3.common.services.EvolutionaryService;

@SuppressWarnings("serial")
public abstract class OneQubitGate extends Gate {

	protected int qubit;
	protected double angle;

	protected OneQubitGate() {
		this.angle = Math.PI/2;
	}
	
	public OneQubitGate setQubit(int qubit) {
		this.qubit = qubit;
		return this;
	}

	public int getQubit() {
		return qubit;
	}

	public double getTheta() {
		return angle;
	}
	
	@Override
	public void assignRandomQubits(Circuit circuit) {
		int qubits = circuit.getQubits();
		this.qubit = EvolutionaryService.dado.nextInt(qubits);
	}
	
	@Override
	public List<String> getQubitsAsStrings(int qubits) {
		List<String> result = new ArrayList<>();
		result.add(Circuit.fill(Integer.toBinaryString(this.qubit), qubits));
		return result;
	}
	
	@Override
	public void copyQubits(Gate gate) {
		this.qubit = ((OneQubitGate) gate).qubit;
	}
	
	@Override
	public void setQubit(int tirada, int qubit) {
		this.setQubit(qubit);
	}
	
	@Override
	public void modifyQubits(int qubits) {
		if (qubits>1) {
			int oldQubit = this.qubit;
			do {
				this.qubit = EvolutionaryService.dado.nextInt(qubits);
			} while (this.qubit==oldQubit);
		}
	}
}
