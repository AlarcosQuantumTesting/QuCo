package edu.uclm.tp3.elonging.strategies;

import java.util.List;

import edu.uclm.tp3.common.gates.Gate;
import edu.uclm.tp3.common.gates.OneQubitGate;
import edu.uclm.tp3.common.gates.ThreeQubitsGate;
import edu.uclm.tp3.common.gates.TwoQubitsGate;
import edu.uclm.tp3.common.model.Circuit;
import edu.uclm.tp3.common.model.ProblemConfiguration;
import edu.uclm.tp3.common.services.EvolutionaryService;
import edu.uclm.tp3.genetic.fitnessers.Fitnesser;

public class MassiveMutator {
	
	private String templateStart;
	private String templateEnd;

	public MassiveMutator(String templateStart, String templateEnd) {
		this.templateStart = templateStart;
		this.templateEnd = templateEnd;
	}

	public void generateMutants(Circuit circuit, int[] cont, String gt, ProblemConfiguration pc, Fitnesser fitnesser) {
		int circuitGates = circuit.getGates().size();
		
		double tirada;
		for (int i=0; i<pc.getInputConfiguration().getPopulationSize(); i++) {
			tirada = EvolutionaryService.dado.nextDouble();
			try {
				if (tirada<0.33 && circuitGates<pc.getInputConfiguration().getMaxNumberOfColumns())
					this.addRandomGate(circuit, cont, gt, pc, fitnesser);
				else if (tirada<0.67 && circuitGates>2)
					this.removeRandomGate(circuit, cont, gt, pc, fitnesser);
				else
					this.changeGate(circuit, cont, gt, pc, fitnesser);
			} catch (Exception e) {
				e.printStackTrace();
				i = i-1;
			}
		}
		
		/*try {
			if (circuitGates<pc.getInputConfiguration().getMaxNumberOfColumns())
				this.addAllGates(circuit, cont, gt, pc, fitnesser);
			if (circuitGates>2)
				this.removeOneGate(circuit, cont, gt, pc, fitnesser);
		} catch (Exception e) {
			e.printStackTrace();
		}
		
		Gate gate;
		for (int i=0; i<circuitGates; i++) {
			gate = circuit.getGates().get(i);
			try {
				this.generateGateMutants(circuit, gate, i, cont, gt, pc, fitnesser);
			} catch (Exception e) {
				e.printStackTrace();
			}
		}*/
	}

	private void changeGate(Circuit circuit, int[] cont, String gt, ProblemConfiguration pc, Fitnesser fitnesser) throws Exception {
		int numberOfGates = circuit.getGates().size();
		int index = EvolutionaryService.dado.nextInt(numberOfGates);
		Gate oldGate = circuit.getGates().get(index);
		int oldGateIndex = oldGate.getIndex();
		int start, end;
		Class<? extends Gate> gateClazz = oldGate.getClass();
		if (OneQubitGate.class.isAssignableFrom(gateClazz)) {
			start = 0;
			end = pc.getSelected1QubitGates().size();
		} else if (TwoQubitsGate.class.isAssignableFrom(gateClazz)) {
			start = pc.getSelected1QubitGates().size();
			end = start + pc.getSelected2QubitGates().size();
		} else if (ThreeQubitsGate.class.isAssignableFrom(gateClazz)) {
			start = pc.getSelected1QubitGates().size() + pc.getSelected2QubitGates().size();
			end = start + pc.getSelected3QubitGates().size();
		} else {
			start = pc.getSelected1QubitGates().size() + pc.getSelected2QubitGates().size() + pc.getSelected3QubitGates().size();
			end = start + pc.getSelectedNQubitGates().size();
		}

		int newGateIndex;
		if (end-start<=1) {
			newGateIndex = oldGateIndex;
		} else {
			do {
				newGateIndex = EvolutionaryService.dado.nextInt(end - start) + start;
			} while (newGateIndex==oldGateIndex);
		}
			
		int targetGeneration = pc.getTargetGeneration();
		Gate newGate = pc.loadGate(newGateIndex).getConstructor().newInstance();
		try {
			newGate.copyQubits(oldGate);
		} catch (Exception e) {
			newGate = oldGate;
		}
		if (newGate.getClass()==oldGate.getClass())
			newGate.modifyQubits(circuit.getQubits());
		circuit.getGates().set(index, newGate);
		circuit.save(pc, gt, targetGeneration, cont[0], fitnesser);
		String gatesCode = circuit.getGatesCode();
		StringBuilder sb = new StringBuilder().append(templateStart).append(gatesCode).append(templateEnd);
		circuit.saveCode(gt, targetGeneration, cont[0]++, fitnesser, sb.toString());
		
		circuit.getGates().set(index, oldGate);
	}

	private void removeRandomGate(Circuit circuit, int[] cont, String gt, ProblemConfiguration pc, Fitnesser fitnesser) throws Exception {
		int index = EvolutionaryService.dado.nextInt(circuit.getGates().size()); 
		Gate removedGate = circuit.getGates().remove(index);
		int targetGeneration = pc.getTargetGeneration();
		circuit.save(pc, gt, targetGeneration, cont[0], fitnesser);
		String gatesCode = circuit.getGatesCode();
		StringBuilder sb = new StringBuilder().append(templateStart).append(gatesCode).append(templateEnd);
		circuit.saveCode(gt, targetGeneration, cont[0]++, fitnesser, sb.toString());
		circuit.getGates().add(index, removedGate);
	}

	private void addRandomGate(Circuit circuit, int[] cont, String gt, ProblemConfiguration pc, Fitnesser fitnesser) throws Exception {
		EvolutionaryService.addGate(pc, circuit);
		int targetGeneration = pc.getTargetGeneration();
		circuit.save(pc, gt, targetGeneration, cont[0], fitnesser);
		String gatesCode = circuit.getGatesCode();
		StringBuilder sb = new StringBuilder().append(templateStart).append(gatesCode).append(templateEnd);
		circuit.saveCode(gt, targetGeneration, cont[0]++, fitnesser, sb.toString());
		circuit.getGates().remove(circuit.getGates().size()-1);
	}

	private void addAllGates(Circuit circuit, int[] cont, String gt, ProblemConfiguration pc, Fitnesser fitnesser, List<Class<? extends Gate>> gateClazzs) throws Exception {
		Gate gate;
		Class<? extends Gate> gateClazz;
		int targetGeneration = pc.getTargetGeneration();
		for (int i=0; i<gateClazzs.size(); i++) {
			gateClazz = pc.loadGate(i);
			gate = (Gate) gateClazz.getConstructors()[0].newInstance();
			gate.assignRandomQubits(circuit);
			circuit.add(gate);
			circuit.save(pc, gt, targetGeneration, cont[0], fitnesser);
			String gatesCode = circuit.getGatesCode();
			StringBuilder sb = new StringBuilder().append(templateStart).append(gatesCode).append(templateEnd);
			circuit.saveCode(gt, targetGeneration, cont[0]++, fitnesser, sb.toString());
			circuit.getGates().remove(circuit.getGates().size()-1);
		}
	}

}
