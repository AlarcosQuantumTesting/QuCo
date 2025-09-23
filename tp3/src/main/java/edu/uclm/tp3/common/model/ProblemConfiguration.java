package edu.uclm.tp3.common.model;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;

import com.fasterxml.jackson.annotation.JsonIgnore;

import edu.uclm.tp3.common.gates.Gate;
import edu.uclm.tp3.common.gates.OneQubitGate;
import edu.uclm.tp3.common.gates.ThreeQubitsGate;
import edu.uclm.tp3.common.gates.TwoQubitsGate;
import edu.uclm.tp3.common.services.EvolutionaryService;
import edu.uclm.tp3.common.strategies.Strategy;
import edu.uclm.tp3.genetic.fitnessers.Fitnesser;
import edu.uclm.tp3.genetic.fitnessers.SimpleFitnesser;

public class ProblemConfiguration {
	
	private int iterationIndex;
	private int sourceGeneration;
	private int targetGeneration;
	
	private SimpleFitnesser fitnesser;

	private int probOf1QubitGates;
	private int probOf2QubitGates;
	private int probOf3QubitGates;
	private int probOfNQubitGates;
	
	private ProblemInputConfiguration inputConfiguration;
	private MassiveMutationPolicy massiveMutationPolicy;
	private Map<String, History> history;
	private Map<String, ExecutionResults> lastExecutionResults;
	
	private Strategy nextStrategy;
	private int generationToExecute;
	
	private List<Class<? extends Gate>> selected1QubitGates;
	private List<Class<? extends Gate>> selected2QubitGates;
	private List<Class<? extends Gate>> selected3QubitGates;
	private List<Class<? extends Gate>> selectedNQubitGates;
	private int totalGates;

	private CodeTemplate codeTemplate;
	
	protected ProblemConfiguration() {
		this.selected1QubitGates = new ArrayList<>();
		this.selected2QubitGates = new ArrayList<>();
		this.selected3QubitGates = new ArrayList<>();
		this.selectedNQubitGates = new ArrayList<>();
	}
		
	public int getIterationIndex() {
		return iterationIndex;
	}

	public void setIterationIndex(int iterationIndex) {
		this.iterationIndex = iterationIndex;
	}
	
	public int getSourceGeneration() {
		return sourceGeneration;
	}

	public void setSourceGeneration(int sourceGeneration) {
		this.sourceGeneration = sourceGeneration;
	}

	public int getTargetGeneration() {
		return targetGeneration;
	}

	public void setTargetGeneration(int targetGeneration) {
		this.targetGeneration = targetGeneration;
	}

	public int getProbOf1QubitGates() {
		return probOf1QubitGates;
	}

	public void setProbOf1QubitGates(int probOf1QubitGates) {
		this.probOf1QubitGates = probOf1QubitGates;
	}

	public int getProbOf2QubitGates() {
		return probOf2QubitGates;
	}

	public void setProbOf2QubitGates(int probOf2QubitGates) {
		this.probOf2QubitGates = probOf2QubitGates;
	}

	public int getProbOf3QubitGates() {
		return probOf3QubitGates;
	}

	public void setProbOf3QubitGates(int probOf3QubitGates) {
		this.probOf3QubitGates = probOf3QubitGates;
	}
	
	public int getProbOfNQubitGates() {
		return probOfNQubitGates;
	}
	
	public void setProbOfNQubitGates(int probOfNQubitGates) {
		this.probOfNQubitGates = probOfNQubitGates;
	}
	
	public int getTotalProbs() {
		int total = 0;
		if (!this.selected1QubitGates.isEmpty())
			total = total + this.probOf1QubitGates;
		if (!this.selected2QubitGates.isEmpty())
			total = total + this.probOf2QubitGates;
		if (!this.selected3QubitGates.isEmpty())
			total = total + this.probOf3QubitGates;
		if (!this.selectedNQubitGates.isEmpty())
			total = total + this.probOfNQubitGates;
		return total;
	}
	
	public int getNumberOfGateQubits() {
		int[] probs = { this.probOf1QubitGates, 
				this.probOf1QubitGates + this.probOf2QubitGates, 
				this.probOf1QubitGates + this.probOf2QubitGates + this.probOf3QubitGates,
				this.probOf1QubitGates + this.probOf2QubitGates + this.probOf3QubitGates + this.probOfNQubitGates };
		int dado = EvolutionaryService.dado.nextInt(this.getTotalProbs());
		if (dado<probs[0])
			return 1;
		if (dado<probs[1])
			return 2;
		if (dado<probs[2])
			return 3;
		return 4;
	}

	public ProblemInputConfiguration getInputConfiguration() {
		return this.inputConfiguration;
	}
	
	public void setInputConfiguration(ProblemInputConfiguration inputConfiguration) {
		this.inputConfiguration = inputConfiguration;
	}
	
	public MassiveMutationPolicy getMassiveMutationPolicy() {
		return massiveMutationPolicy;
	}

	public void setMassiveMutationPolicy(MassiveMutationPolicy massiveMutationPolicy) {
		this.massiveMutationPolicy = massiveMutationPolicy;
	}
	
	public Map<String, History> getHistory() {
		return history;
	}
	
	public void setHistory(Map<String, History> history) {
		this.history = history;
	}
	
	public Map<String, ExecutionResults> getLastExecutionResults() {
		return lastExecutionResults;
	}
	
	public void setLastExecutionResults(Map<String, ExecutionResults> lastExecutionResults) {
		this.lastExecutionResults = lastExecutionResults;
	}
	
	public void addLastExecutionResults(String fitnesserName, ExecutionResults lastExecutionResults) {
		this.lastExecutionResults.put(fitnesserName, lastExecutionResults);
	}

	public void increaseIterationIndex() {
		this.iterationIndex++;
	}
	
	public void increaseSourceGeneration() {
		this.sourceGeneration++;
	}
	
	public void increaseTargetGeneration() {
		this.targetGeneration++;
	}

	public History getHistory(String fitnesserName) {
		return this.history.get(fitnesserName);
	}
	
	/*@JsonIgnore
	public void setRemoteFitnessers(Fitnesser[] fitnessers) {
		this.fitnessers = fitnessers;
	}*/

	@JsonIgnore
	public void setSimpleFitnesser(SimpleFitnesser fitnesser) {
		this.fitnesser = fitnesser;
	}
	
	/*public Fitnesser[] getRemoteFitnessers() {
		return fitnessers;
	}*/

	public void setJSONHistory(JSONArray jsaHistories) {
		JSONArray jsaHistory;
		String fitnesserName;
		JSONObject jsoHistory;
		for (int i=0; i<jsaHistories.length(); i++) {
			jsaHistory = jsaHistories.getJSONArray(i);
			fitnesserName = jsaHistory.getString(0);
			jsoHistory = jsaHistory.getJSONObject(1);
			this.history.put(fitnesserName, new History(jsoHistory));
		}
	}

	@JsonIgnore
	public void setNextStrategy(Strategy strategy) {
		this.nextStrategy = strategy;
	}
	
	@JsonIgnore
	public Strategy getNextStrategy() {
		return nextStrategy;
	}

	@JsonIgnore
	public int getGenerationToExecute() {
		return this.generationToExecute;
	}
	
	@JsonIgnore
	public void setGenerationToExecute(int generationToExecute) {
		this.generationToExecute = generationToExecute;
	}

	public void increaseGenerationToExecute() {
		this.generationToExecute++;
	}
	
	public void setGateNames(String[] gateNames) {
		for (int i=0; i<gateNames.length; i++) {
			Class<? extends Gate> clazz = EvolutionaryService.findGate(gateNames[i]);
			if (OneQubitGate.class.isAssignableFrom(clazz))
				this.selected1QubitGates.add(clazz);
			else if (TwoQubitsGate.class.isAssignableFrom(clazz))
				this.selected2QubitGates.add(clazz);
			else if (ThreeQubitsGate.class.isAssignableFrom(clazz))
				this.selected3QubitGates.add(clazz);
			else
				this.selectedNQubitGates.add(clazz);
		}
		this.totalGates = this.selected1QubitGates.size() + this.selected2QubitGates.size() + 
				this.selected3QubitGates.size() + this.selectedNQubitGates.size();
	}
	
	public List<Class<? extends Gate>> getSelected1QubitGates() {
		return selected1QubitGates;
	}
	
	public List<Class<? extends Gate>> getSelected2QubitGates() {
		return selected2QubitGates;
	}
	
	public List<Class<? extends Gate>> getSelected3QubitGates() {
		return selected3QubitGates;
	}
	
	public List<Class<? extends Gate>> getSelectedNQubitGates() {
		return selectedNQubitGates;
	}

	public Class<? extends Gate> loadGate(int index) {
		if (index<this.selected1QubitGates.size())
			return this.selected1QubitGates.get(index);
		if (index<this.selected1QubitGates.size()+this.selected2QubitGates.size())
			return this.selected2QubitGates.get(index-this.selected1QubitGates.size());
		if (index<this.selected1QubitGates.size()+this.selected2QubitGates.size()+this.selected3QubitGates.size())
			return this.selected3QubitGates.get(index-this.selected1QubitGates.size()-this.selected2QubitGates.size());
		return this.selectedNQubitGates.get(index-this.selected1QubitGates.size()-this.selected2QubitGates.size()-this.selected3QubitGates.size());
	}

	public int getTotalGates() {
		return totalGates;
	}

	public void setCodeTemplate(CodeTemplate codeTemplate) {
		this.codeTemplate = codeTemplate;
	}

	public CodeTemplate getCodeTemplate() {
		return codeTemplate;
	}
}
