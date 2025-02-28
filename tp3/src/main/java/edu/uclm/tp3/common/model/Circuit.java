package edu.uclm.tp3.common.model;

import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.parsing.Problem;

import edu.uclm.tp3.common.gates.Gate;
import edu.uclm.tp3.common.gates.IRotableGate;
import edu.uclm.tp3.common.gates.OneQubitGate;
import edu.uclm.tp3.common.gates.TwoQubitsGate;
import edu.uclm.tp3.common.services.EvolutionaryService;
import edu.uclm.tp3.genetic.Mutator;
import edu.uclm.tp3.genetic.fitnessers.Fitnesser;

public class Circuit implements Serializable {
	
	private static final long serialVersionUID = 1L;
	private List<Gate> gates;
	private int qubits;
	private List<GateEncoding> gatesEncoding;
	private int qubitsAffectations;
	private List<Integer> accumulatedQubits;
	
	public Circuit() {
		this.gates = new ArrayList<>();
		this.gatesEncoding = new ArrayList<>();
		this.accumulatedQubits = new ArrayList<>();
	}
	
	public String getGatesCode() {
		StringBuilder sb = new StringBuilder();
		for (Gate gate : this.gates)
			sb.append(gate.getCode());
		return sb.toString();
	}

	public static String getMeasures(int qubits, boolean[] outputs) {
		StringBuilder sb = new StringBuilder();
		for (int i=0; i<outputs.length; i++) {
			if (outputs[i])
				sb.append("circuit.measure(" + i + ", " + (qubits-i-1) + ")\n");
		}
		return sb.toString();
	}
	
	public static String getMeasures(int qubits, List<Boolean> outputs) {
		StringBuilder sb = new StringBuilder();
		for (int i=0; i<outputs.size(); i++) {
			if (outputs.get(i).booleanValue())
				sb.append("circuit.measure(" + i + ", " + (qubits-i-1) + ")\n");
		}
		return sb.toString();
	}

	public void setQubits(int qubits) {
		this.qubits = qubits;
	}
	
	public int getQubits() {
		return qubits;
	}

	public void add(Gate gate) {
		this.gates.add(gate);
		
		int gateQubits = (OneQubitGate.class.isAssignableFrom(gate.getClass()) ? 1 : 
			(TwoQubitsGate.class.isAssignableFrom(gate.getClass()) ? 2 : 3));
		
		if (this.accumulatedQubits.isEmpty())
			this.accumulatedQubits.add(gateQubits);
		else {
			this.accumulatedQubits.add(this.accumulatedQubits.get(this.accumulatedQubits.size()-1) + gateQubits);			
		}
		this.qubitsAffectations = this.qubitsAffectations + gateQubits;
	}
	
	public int getQubitsAffectations() {
		return qubitsAffectations;
	}
	
	public List<Integer> getAccumulatedQubits() {
		return accumulatedQubits;
	}

	public String save(ProblemConfiguration pc,	String token, int targetGeneration, int fileIndex, Fitnesser fitnesser) throws FileNotFoundException, IOException {
		this.encode(EvolutionaryService.requiredBitsForGates);
		if (EvolutionaryService.dado.nextDouble()<0.03) 
			Mutator.mutate(pc, this);

		String fileName = EvolutionaryService.generationFolder(token, targetGeneration) + fileIndex;
		if (fitnesser!=null)
			fileName += "." + fitnesser.getClass().getSimpleName();
		fileName += ".circ";
		this.encode(EvolutionaryService.requiredBitsForGates);
		try(ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream(fileName))) {
			oos.writeObject(this);
		}
		return fileName;
	}

	private void encode(int requiredBitsForGates) {
		String bitsGate;
		Gate gate;
		this.gatesEncoding.clear();
		for (int i=0; i<this.gates.size(); i++) {
			gate = this.gates.get(i);
			bitsGate = fill(Integer.toBinaryString(gate.getIndex()), requiredBitsForGates); 
			GateEncoding g = new GateEncoding(bitsGate);
			List<String> bitsQubits = gate.getQubitsAsStrings(this.qubits);
			g.setQubitsEncoding(bitsQubits);
			this.gatesEncoding.add(g);
		}
	}

	public static String fill(String s, int length) {
		int currentLength = s.length();
		for (int i=currentLength; i<length; i++) 
			s = "0" + s;
		return s;
	}
	
	public List<Gate> getGates() {
		return gates;
	}
	
	public List<GateEncoding> getGatesEncoding() {
		return gatesEncoding;
	}

	public String saveCode(String gt, int targetGeneration, int fileIndex, Fitnesser fitnesser, String code) throws Exception {
		String shortFileName;
		if (fitnesser==null)
			shortFileName = fileIndex + ".py";
		else
			shortFileName = fileIndex + "." + fitnesser.getClass().getSimpleName() + ".py";
		String fileName = EvolutionaryService.generationFolder(gt, targetGeneration) + shortFileName;
		try(FileOutputStream fos = new FileOutputStream(fileName)) {
			fos.write(code.getBytes());
			return shortFileName;
		}		
	}

    public IRotableGate getRotableGate() {
    		List<IRotableGate> oqrgs = new ArrayList<>();
			for (Gate gate : this.gates) {
				if (IRotableGate.class.isAssignableFrom(gate.getClass()))
					oqrgs.add((IRotableGate) gate);
			}
			if (oqrgs.isEmpty())
				return null;
			int index = EvolutionaryService.dado.nextInt(oqrgs.size());
			return oqrgs.get(index);
    }

}
