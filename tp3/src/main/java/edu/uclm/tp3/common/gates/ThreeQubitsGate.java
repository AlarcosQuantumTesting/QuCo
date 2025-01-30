package edu.uclm.tp3.common.gates;

import java.util.ArrayList;
import java.util.List;

import edu.uclm.tp3.common.model.Circuit;
import edu.uclm.tp3.common.services.EvolutionaryService;

@SuppressWarnings("serial")
public abstract class ThreeQubitsGate extends Gate {
	protected int qubit0, qubit1, qubit2;
	
	public ThreeQubitsGate set(int index, int qubit) {
		if (index==0)
			this.qubit0 = qubit;
		else if (index==1)
			this.qubit1 = qubit;
		else
			this.qubit2 = qubit;
		return this;
	}

	public ThreeQubitsGate setQubits(String qubits) {
		this.qubit0 = qubits.charAt(0);
		this.qubit1 = qubits.charAt(1);
		this.qubit2 = qubits.charAt(2);
		return this;
	}
	
	@Override
	public void assignRandomQubits(Circuit circuit) {
		int qubits = circuit.getQubits();
		this.qubit0 = EvolutionaryService.dado.nextInt(qubits);
		do {
			this.qubit1 = EvolutionaryService.dado.nextInt(qubits);
		} while (this.qubit0==this.qubit1);
		do {
			this.qubit2 = EvolutionaryService.dado.nextInt(qubits);
		} while (this.qubit2==this.qubit0 || this.qubit2==this.qubit1);
	}
	
	@Override
	public List<String> getQubitsAsStrings(int qubits) {
		List<String> result = new ArrayList<>();
		result.add(Circuit.fill(Integer.toBinaryString(this.qubit0), qubits));
		result.add(Circuit.fill(Integer.toBinaryString(this.qubit1), qubits));
		result.add(Circuit.fill(Integer.toBinaryString(this.qubit2), qubits));
		return result;
	}
	
	@Override
	public void copyQubits(Gate gate) {
		ThreeQubitsGate tcg = (ThreeQubitsGate) gate;
		this.qubit0 = tcg.qubit0;
		this.qubit1 = tcg.qubit1;
		this.qubit2 = tcg.qubit2;
	}
	
	@Override
	public void setQubit(int tirada, int qubit) {
		if (tirada==0)
			this.qubit0 = qubit;
		else if (tirada==1)
			this.qubit1 = qubit;
		else
			this.qubit2 = qubit;
	}
	
	@Override
	public void modifyQubits(int qubits) {
		if (qubits>1) {
			int oldQubit0 = this.qubit0;
			this.qubit0 = this.qubit1;
			this.qubit1 = oldQubit0;
		}		
	}
}
