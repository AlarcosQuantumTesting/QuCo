package edu.uclm.tp3.common.services;

import java.io.File;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Random;

import org.apache.commons.io.FileUtils;
import org.reflections.Reflections;
import org.springframework.stereotype.Service;

import edu.uclm.tp3.Manager;
import edu.uclm.tp3.common.gates.Gate;
import edu.uclm.tp3.common.gates.NQubitsGate;
import edu.uclm.tp3.common.gates.OneQubitGate;
import edu.uclm.tp3.common.gates.ThreeQubitsGate;
import edu.uclm.tp3.common.gates.TwoQubitsGate;
import edu.uclm.tp3.common.model.Circuit;
import edu.uclm.tp3.common.model.ProblemConfiguration;
import edu.uclm.tp3.common.strategies.Strategy;
import edu.uclm.tp3.common.utils.Files;

@Service
public abstract class EvolutionaryService {
	public static Map<Integer, List<GateDescription>> gatesByNumberOfQubits;
	public static Map<String, GateDescription> gatesByName;
	public static List<GateDescription> gateNames;
	
	public static int requiredBitsForGates;
	protected static String workingFolder;
	public static final Random dado = new Random();
	public static int totalGates;
	
	static {
		String workingFolder = Manager.get().getConfiguration().getString("working directory");
		workingFolder = workingFolder + "genetic/";
		new File(workingFolder).mkdirs();
		EvolutionaryService.workingFolder = workingFolder;
	}
	
	protected EvolutionaryService() {
		if (gatesByNumberOfQubits==null)
			this.loadGates();
	}
	
	protected String[] prepareCodeTemplate(ProblemConfiguration pc, String token) throws Exception {
		int shots = pc.getInputConfiguration().getShots();
		if (shots<=0)
			throw new Exception("Please, update the expected frequencies");

		int targetGeneration = pc.getTargetGeneration();
		if (targetGeneration==0) {
			File f = new File(workingFolder + token);
			if (f.exists())
				FileUtils.deleteDirectory(f);
		}
		
		String template = pc.getCodeTemplate().getCode();
		
		String start = template.substring(0, template.indexOf("#CALCULUS#")) + "#CALCULUS#\n";
		int qubits = pc.getInputConfiguration().getQubits();
		int outputs = pc.getInputConfiguration().getNumberOfOutputs();
		
		start = start.replace("#QUBITS#", "" + qubits);
		start = start.replace("#OUTPUT_QUBITS#", "" + outputs);
		
		String sH = this.getInitialization(pc);
		if (sH.length()>0)
			start = start.replace("#INITIALIZE#", "#INITIALIZE#\n" + sH);
		
		String measures = Circuit.getMeasures(pc.getInputConfiguration().getQubits(), pc.getInputConfiguration().getOutputs());
		String end = template.substring(template.indexOf("#MEASURES#"));
		end = end.replace("#MEASURES#", "\n#MEASURES#\n" + measures);
		end = end.replace("#SHOTS#", "" + pc.getInputConfiguration().getShots());
		
		String[] result = { start, end };
		return result;
	}
	
	public abstract String getInitialization(ProblemConfiguration gc);
	
	//public String[] generatePopulation(String token, ProblemConfiguration pc, int initialLength, HWSession hw) throws Exception {
	public String[] generatePopulation(String token, ProblemConfiguration pc, int initialLength) throws Exception {
		String[] result = this.prepareCodeTemplate(pc, token);

		//this.buildIndividuals(token, pc, result, initialLength, hw);
		this.buildIndividuals(token, pc, result, initialLength);
		
		return result;
	}
	
	// protected abstract void buildIndividuals(String token, ProblemConfiguration pc, String[] startEnd, int initialLength, HWSession hw) throws Exception ;
	protected abstract void buildIndividuals(String token, ProblemConfiguration pc, String[] startEnd, int initialLength) throws Exception ;

	public static Circuit generateRandomCircuit(ProblemConfiguration pc, int initialLength) {
		Circuit circuit = new Circuit();
		circuit.setQubits(pc.getInputConfiguration().getQubits());
		
		int maxColumns = pc.getInputConfiguration().getMaxNumberOfColumns();
		
		if (initialLength!=0)
			maxColumns = initialLength;
		
		for (int i=0; i<maxColumns; i++)
			try {
				addGate(pc, circuit);
			} catch (Exception e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
			
		return circuit;
	}
	
	public static String generationFolder(String token) {
		String result = workingFolder + token + File.separatorChar; 
		new File(result).mkdirs();
		return result;
	}
	
	public static String generationFolder(String token, int generation) {
		String result = workingFolder + token + File.separatorChar + generation + File.separatorChar; 
		new File(result).mkdirs();
		return result;
	}
	
	public static File getFile(String token, int generation) {
		return new File(workingFolder + token + File.separatorChar + generation);
	}
	
	public static void removeGate(ProblemConfiguration pc, Circuit circuit) throws Exception {
		int index = EvolutionaryService.dado.nextInt(circuit.getGates().size());
		circuit.getGates().remove(index);
	}
	
	public static void changeGate(ProblemConfiguration pc, Circuit circuit) throws Exception {
		int index = EvolutionaryService.dado.nextInt(circuit.getGates().size());
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
				newGateIndex = EvolutionaryService.dado.nextInt(end-start) + start;
			} while (newGateIndex==oldGateIndex);
		}
			
		Gate newGate = pc.loadGate(newGateIndex).getConstructor().newInstance();
		try {
			newGate.copyQubits(oldGate);
		}catch (Exception e) {
			System.out.println(e);
		}
		circuit.getGates().set(index, newGate);
	}
	
	public static void addGate(ProblemConfiguration pc, Circuit circuit) throws Exception {
		Gate gate = getGate(pc, circuit);
		circuit.add(gate);
	}
		
	public static Gate getGate(ProblemConfiguration pc, Circuit circuit) throws Exception {
		int numberOfQubits = pc.getNumberOfGateQubits();
		if (numberOfQubits==1 && !pc.getSelected1QubitGates().isEmpty())
			return getGate1(pc, circuit);
		else if (numberOfQubits==2 && !pc.getSelected2QubitGates().isEmpty())
			return getGate2(pc, circuit);
		else if (!pc.getSelected3QubitGates().isEmpty())
			return getGate3(pc, circuit);
		else if (!pc.getSelectedNQubitGates().isEmpty())
			return getGateN(pc, circuit);
		return null;
	}
	
	private static Gate getGate1(ProblemConfiguration pc, Circuit circuit) throws Exception {
		int n = dado.nextInt(pc.getSelected1QubitGates().size());
		int qubit = dado.nextInt(circuit.getQubits());
		OneQubitGate gate = (OneQubitGate) pc.getSelected1QubitGates().get(n).getConstructor().newInstance();
		gate.setIndex(n);
		gate.setQubit(qubit);
		return gate;
	}
	
	private static Gate getGate2(ProblemConfiguration pc, Circuit circuit) throws Exception {
		int n = dado.nextInt(pc.getSelected2QubitGates().size());
		int qubit0 = dado.nextInt(circuit.getQubits());
		int qubit1 = qubit0;
		while (qubit1==qubit0)
			qubit1 = dado.nextInt(circuit.getQubits());
		TwoQubitsGate gate = (TwoQubitsGate) pc.getSelected2QubitGates().get(n).getConstructor().newInstance();
		gate.setIndex(pc.getSelected1QubitGates().size() + n);
		gate.set(0, qubit0);
		gate.set(1, qubit1);
		return gate;
	}
	
	private static Gate getGate3(ProblemConfiguration pc, Circuit circuit) throws Exception {
		int n = dado.nextInt(pc.getSelected3QubitGates().size());
		int qubit0 = dado.nextInt(circuit.getQubits());
		int qubit1 = qubit0;
		
		while (qubit1==qubit0)
			qubit1 = dado.nextInt(circuit.getQubits());
		
		int qubit2 = qubit1;
		while (qubit2==qubit1 || qubit2==qubit0)
			qubit2 = dado.nextInt(circuit.getQubits());
		
		ThreeQubitsGate gate = (ThreeQubitsGate) pc.getSelected3QubitGates().get(n).getConstructor().newInstance();
		gate.setIndex(pc.getSelected1QubitGates().size() + pc.getSelected2QubitGates().size() + n);
		gate.set(0, qubit0);
		gate.set(1, qubit1);
		gate.set(2, qubit2);
		return gate;
	}
	
	private static Gate getGateN(ProblemConfiguration pc, Circuit circuit) throws Exception {
		int n = dado.nextInt(pc.getSelectedNQubitGates().size());
		NQubitsGate gate = (NQubitsGate) pc.getSelectedNQubitGates().get(n).getConstructor().newInstance();
		gate.setIndex(pc.getSelected1QubitGates().size() + pc.getSelected2QubitGates().size() + 
				pc.getSelected3QubitGates().size() + n);
		int qubits = circuit.getQubits();
		int cont = 0;
		do {
			for (int i=0; i<qubits; i++) {
				boolean poner = EvolutionaryService.dado.nextBoolean();
				if (poner) {
					int index = EvolutionaryService.dado.nextInt(qubits);
					if (!gate.getQubits().contains(index)) {
						gate.getQubits().add(index);
						cont++;
					}
				}
			}
		} while (cont==0);
		
		if (gate.getQubits().size()<qubits) {
			cont = 0;
			do {
				int index = EvolutionaryService.dado.nextInt(qubits);
				if (!gate.getQubits().contains(index)) {
					gate.getQubits().add(index);
					cont++;
				}
			} while (cont==0);
		}
		
		return gate;
	}
	
	public static List<String> getStrategies() {
		List<String> strategies = new ArrayList<>();
		Reflections reflections = new Reflections("edu.uclm.tp3.elonging.strategies");
		Iterator<Class<? extends edu.uclm.tp3.common.strategies.Strategy>> classes = reflections.getSubTypesOf(Strategy.class).iterator();
		while (classes.hasNext()) {
			Class<? extends Strategy> clazz = classes.next();
			if (Modifier.isAbstract(clazz.getModifiers()))
				continue;
			strategies.add(clazz.getSimpleName());
		}
		return strategies;
	}

	public void loadGates() {
		Reflections reflections = new Reflections("edu.uclm.tp3.common.gates");
		List<GateDescription> oneQubitGates = new ArrayList<>();
		List<GateDescription> twoQubitGates = new ArrayList<>();
		List<GateDescription> threeQubitGates = new ArrayList<>();
		List<GateDescription> nQubitGates = new ArrayList<>();
		gatesByNumberOfQubits = new HashMap<>();
		gatesByName = new HashMap<>();
		gateNames = new ArrayList<>();
		
		GateDescription gd;
		
		Iterator<Class<? extends OneQubitGate>> classes1 = reflections.getSubTypesOf(OneQubitGate.class).iterator();
		while (classes1.hasNext()) {
			Class<? extends OneQubitGate> class1 = classes1.next();
			if (Modifier.isAbstract(class1.getModifiers()))
				continue;
			gd = new GateDescription(class1, 1);
			oneQubitGates.add(gd);
			gatesByName.put(class1.getSimpleName(), gd);
			gateNames.add(gd);
		}
		gatesByNumberOfQubits.put(1, oneQubitGates);

		Iterator<Class<? extends TwoQubitsGate>> classes2 = reflections.getSubTypesOf(TwoQubitsGate.class).iterator();
		while (classes2.hasNext()) {
			Class<? extends TwoQubitsGate> class2 = classes2.next();
			gd = new GateDescription(class2, 2);
			twoQubitGates.add(gd);
			gatesByName.put(class2.getSimpleName(), gd);
			gateNames.add(gd);
		}
		gatesByNumberOfQubits.put(2, twoQubitGates);
		
		Iterator<Class<? extends ThreeQubitsGate>> classes3 = reflections.getSubTypesOf(ThreeQubitsGate.class).iterator();
		while (classes3.hasNext()) {
			Class<? extends ThreeQubitsGate> class3 = classes3.next();
			gd = new GateDescription(class3, 3);
			threeQubitGates.add(gd);
			gatesByName.put(class3.getSimpleName(), gd);
			gateNames.add(gd);
		}
		gatesByNumberOfQubits.put(3, threeQubitGates);
		
		Iterator<Class<? extends NQubitsGate>> classesN = reflections.getSubTypesOf(NQubitsGate.class).iterator();
		while (classesN.hasNext()) {
			Class<? extends NQubitsGate> classN = classesN.next();
			gd = new GateDescription(classN, 1000);
			nQubitGates.add(gd);
			gatesByName.put(classN.getSimpleName(), gd);
			gateNames.add(gd);
		}
		gatesByNumberOfQubits.put(1000, nQubitGates);
		
		totalGates = oneQubitGates.size() + twoQubitGates.size() + threeQubitGates.size() + nQubitGates.size();
		requiredBitsForGates = (int) (Math.round(Math.log(totalGates)/Math.log(2)));
		requiredBitsForGates++;
	}

	public String getCode(String gt, int generation, int index, String fitnesserName, String templateStart, String templateEnd) throws Exception {
		String fileName = getFile(gt, generation) + "." + index +  "." + fitnesserName + ".selected.circ";
		Circuit circuit = Files.readCircuit(fileName);
		String gatesCode = circuit.getGatesCode();
		StringBuilder sb = new StringBuilder().append(templateStart).append(gatesCode).append(templateEnd);
		return sb.toString();
	}

	public static List<GateDescription> getGateNames() {
		return gateNames;
	}

	public static Class<? extends Gate> findGate(String gateName) {
		return gatesByName.get(gateName).getGateClazz();
	}
}
