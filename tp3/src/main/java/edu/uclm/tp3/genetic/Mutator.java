package edu.uclm.tp3.genetic;

import edu.uclm.tp3.common.gates.Gate;
import edu.uclm.tp3.common.model.Circuit;
import edu.uclm.tp3.common.model.GateEncoding;
import edu.uclm.tp3.common.model.ProblemConfiguration;
import edu.uclm.tp3.common.services.EvolutionaryService;

public class Mutator {
	
	public static void mutate(ProblemConfiguration pc, Circuit circuit) {
		int column = EvolutionaryService.dado.nextInt(circuit.getGates().size());
		if (EvolutionaryService.dado.nextDouble()<0.1) {
			Gate gate;
			try {
				gate = EvolutionaryService.getGate(pc, circuit);
				circuit.getGates().add(column, gate);
			} catch (Exception e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
			return;
		}
		
		int type = EvolutionaryService.dado.nextInt(2);
		if (type==0 || circuit.getQubits()==1)
			mutateGate(pc, circuit, column);
		else if (type==1)
			mutateQubit(circuit, column);
	}

	private static void mutateGate(ProblemConfiguration pc, Circuit circuit, int column) {
		Gate oldGate = circuit.getGates().get(column);
		GateEncoding encoding = circuit.getGatesEncoding().get(column);
		
		String gateEncoding = encoding.getGateEncoding();
		Class<? extends Gate> newGateClazz;
		int newGateIndex;
		do {
			int bitIndex = EvolutionaryService.dado.nextInt(gateEncoding.length());
			char bit = gateEncoding.charAt(bitIndex);
			bit = bit=='0' ? '1' : '0';
			newGateIndex = EvolutionaryService.dado.nextInt(pc.getTotalGates());
			newGateClazz = pc.loadGate(newGateIndex);
		} while (newGateClazz==null || oldGate.getClass().getSuperclass()!=newGateClazz.getSuperclass());
		try {
			Gate newGate = newGateClazz.getConstructor().newInstance();
			newGate.copyQubits(oldGate);
			if (newGate.getClass()==oldGate.getClass())
				newGate.modifyQubits(circuit.getQubits());
			circuit.getGates().set(column, newGate);
		} catch(Exception e) {
			System.out.println(e);
		}
	}
	
	public static void mutateQubit(Circuit circuit, int column) {
		int qubitIndex;
		int bitIndex;
		String qubitToReplace;
		String newQubit;
		boolean salir;
		Gate oldGate = circuit.getGates().get(column);
		GateEncoding encoding = circuit.getGatesEncoding().get(column);
		
		boolean changed = false;
		do {
			salir = true;
			qubitIndex = EvolutionaryService.dado.nextInt(encoding.getQubitsEncoding().size());
			qubitToReplace = encoding.getQubitsEncoding().get(qubitIndex);
			bitIndex = EvolutionaryService.dado.nextInt(qubitToReplace.length());
			char cbit = qubitToReplace.charAt(bitIndex);
			cbit = cbit=='0' ? '1' : '0';
			newQubit = qubitToReplace.substring(0, bitIndex) + cbit + qubitToReplace.substring(bitIndex+1);
			if (Integer.parseInt(newQubit, 2)>=circuit.getQubits())
				salir = false;
			if (!salir)
				continue;
			for (int i=0; i<encoding.getQubitsEncoding().size(); i++) {
				String existingQubit = encoding.getQubitsEncoding().get(i);
				if (existingQubit.equals(newQubit)) {
					oldGate.setQubit(i, Integer.parseInt(qubitToReplace, 2));
					oldGate.setQubit(qubitIndex, Integer.parseInt(existingQubit, 2));
					changed = true;
					break;
				}
			}
		} while (!salir);
		if (!changed)
			oldGate.setQubit(qubitIndex, Integer.parseInt(newQubit, 2));
	}
}
