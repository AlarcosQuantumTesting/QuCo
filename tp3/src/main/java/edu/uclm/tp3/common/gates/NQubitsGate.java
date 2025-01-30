package edu.uclm.tp3.common.gates;

import java.util.ArrayList;
import java.util.List;

import edu.uclm.tp3.common.model.Circuit;
import edu.uclm.tp3.common.services.EvolutionaryService;

@SuppressWarnings("serial")
public abstract class NQubitsGate extends Gate {
	
	protected List<Integer> qubits;

	protected NQubitsGate() {
		super();
		this.qubits = new ArrayList<>();
	}

	@Override
	public List<String> getQubitsAsStrings(int qubits) {
		List<String> result = new ArrayList<>();
		for (int i=0; i<this.qubits.size(); i++) 
			result.add(Circuit.fill(Integer.toBinaryString(this.qubits.get(i)), qubits));
		return result;
	}

	@Override
	public void copyQubits(Gate gate) {
		NQubitsGate nqg = (NQubitsGate) gate;
		for (int i=0; i<nqg.qubits.size(); i++)
			this.qubits.add(nqg.qubits.get(i));
	}

	@Override
	public void setQubit(int index, int qubit) {
		this.qubits.set(index, qubit);
	}

	@Override
	public void assignRandomQubits(Circuit circuit) {
		int qubits = circuit.getQubits();
		int cont = 0;
		do {
			for (int i=0; i<qubits; i++) {
				boolean poner = EvolutionaryService.dado.nextBoolean();
				if (poner) {
					int index = EvolutionaryService.dado.nextInt(qubits);
					if (!this.qubits.contains(index)) {
						this.qubits.add(index);
						cont++;
					}
				}
			}
		} while (cont==0);
		cont = 0;
		do {
			int index = EvolutionaryService.dado.nextInt(qubits);
			if (!this.qubits.contains(index)) {
				this.qubits.add(index);
				cont++;
			}
		} while (cont==0);
	}

	public List<Integer> getQubits() {
		return this.qubits;
	}

	@Override
	public void modifyQubits(int circuitQubits) {
		if (circuitQubits>1) {
			int a, b;
			do {
				a = EvolutionaryService.dado.nextInt(circuitQubits);
				b = EvolutionaryService.dado.nextInt(circuitQubits);
				while (a==b) {
					a = EvolutionaryService.dado.nextInt(circuitQubits);
					b = EvolutionaryService.dado.nextInt(circuitQubits);
				}
			} while (a>=this.qubits.size() || b>=this.qubits.size());
			int aValue = this.qubits.get(a);
			this.qubits.set(a, this.qubits.get(b));
			this.qubits.set(b, aValue);
		}		
	}
}
