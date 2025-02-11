package edu.uclm.tp3.qiskit;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import edu.uclm.tp3.common.model.CodeTemplate;

@Service
public class QiskitCoder extends AbstractQiskitCoder {
	
	public String[] getCodeReduced(List<List<List<Integer>>> reducedMatrixes, int inputQubits, int qubits, String domain, CodeTemplate template, String type) throws IOException {				
		StringBuilder sbCalculus = new StringBuilder(); 
		for (int i=0; i<reducedMatrixes.size(); i++) {
			List<List<Integer>> reducedMatrix = reducedMatrixes.get(i);
			int outputQubit = inputQubits + i;
			for (int j=0; j<reducedMatrix.size(); j++) {
				List<Integer> sRow = reducedMatrix.get(j);
				sbCalculus.append(buildStatemens(sRow, inputQubits, outputQubit));
			}
		}

		if (domain.equals("PHASE"))
			sbCalculus = this.changeToPhase(sbCalculus);
		
		String code = this.prepareCode(type, inputQubits, qubits, sbCalculus, template);
		return code.split("\n");
	}

	private StringBuilder changeToPhase(StringBuilder sbCalculus) {
		StringBuilder result = new StringBuilder();
		String code = sbCalculus.toString();
		String[] lines = code.split("\n");
		
		for (int i=0; i<lines.length; i++) {
			String oldLine = lines[i];
			ArrayList<String> newLines = null;
			if (oldLine.contains(".mcx"))
				newLines = mcxToPhase(oldLine);
			else if (oldLine.contains(".x"))
				newLines = xToPhase(oldLine);
			else {
				result.append(oldLine);
				result.append("\n");
			}
			
			if (newLines!=null)
				for (String newLine : newLines)
					result.append(newLine);
		}
		return result;
	}
	

	private ArrayList<String> xToPhase(String oldLine) {
		int posLeft = oldLine.indexOf('(');
		int posRight = oldLine.indexOf(')', posLeft);
		
		String qubit = oldLine.substring(posLeft+1, posRight);
		ArrayList<String> newLines = new ArrayList<>();
		newLines.add("circuit.h(" + qubit + ")\n");
		newLines.add("circuit.z(" + qubit + ")\n");
		newLines.add("circuit.h(" + qubit + ")\n");
		return newLines;
	}

	private ArrayList<String> mcxToPhase(String oldLine) {
		int posLeft = oldLine.indexOf('[');
		int posRight = oldLine.indexOf(']', posLeft+1);
		
		String controlQubits = oldLine.substring(posLeft+1, posRight);
		String controlledQubit = oldLine.substring(posRight+3, oldLine.length()-1);
		
		ArrayList<String> newLines = new ArrayList<>();
		newLines.add("circuit.h(" + controlledQubit + ")\n");
		newLines.add("circuit.mcrz(pi, [" + controlQubits + "], " + controlledQubit + ")\n");
		newLines.add("circuit.h(" + controlledQubit + ")\n");
		return newLines;
	}

	@SuppressWarnings("unchecked")
	public String[] getCode(Map<String, Object> info, CodeTemplate template) throws IOException {		
		int inputQubits = (int) info.get("inputQubits");
		int qubits = (int) info.get("qubits");
		
		List<List<Integer>> receivedMatrixes = (List<List<Integer>>) info.get("matrix");
		try {
			@SuppressWarnings("unused")
			List<Integer> row0 = receivedMatrixes.get(0);
		} catch (ClassCastException e) {
			receivedMatrixes = new ArrayList<>();
			receivedMatrixes.add((List<Integer>) info.get("matrix"));
		}
		
		int value;
		
		StringBuilder sbCalculus = new StringBuilder(); 
		for (int i=0; i<receivedMatrixes.size(); i++) {
			List<Integer> row = receivedMatrixes.get(i);
			
			for (int j=inputQubits; j<row.size(); j++) {
				value = row.get(j);
				if (value==1) {
					sbCalculus.append(buildStatemens(row, inputQubits));
					break;
				}
			}			
		}
		
		String type = info.get("type").toString();
		String code = this.prepareCode(type, inputQubits, qubits, sbCalculus, template);
		return code.split("\n");
	}
	
	private StringBuilder buildStatemens(List<Integer> row, int inputQubits) {
		Integer value;
		StringBuilder sbPrepare = new StringBuilder();
		for (int j=0; j<inputQubits; j++) {
			value = row.get(j);
			if (value!=null && value==0)
				sbPrepare.append("circuit.x(" + j + ")\n");
		}
		
		StringBuilder sbMcx = new StringBuilder();
		for (int j=inputQubits; j<row.size(); j++) {
			value = row.get(j);
			if (value==1) {
				String mcx = buildMcx(row, inputQubits, j);
				sbMcx.append(mcx);
			}
		}
		
		StringBuilder sb = new StringBuilder();
		sb.append(sbPrepare).append(sbMcx).append(sbPrepare).append("\ncircuit.barrier()\n");
		return sb;
	}
	
	private StringBuilder buildStatemens(List<Integer> row, int inputQubits, int outputQubit) {
		Integer value;
		StringBuilder sbPrepare = new StringBuilder();
		for (int j=0; j<inputQubits; j++) {
			value = row.get(j);
			if (value!=null && value==0)
				sbPrepare.append("circuit.x(" + j + ")\n");
		}
		
		StringBuilder sbMcx = new StringBuilder();
		value = row.get(outputQubit);
		if (value==1) {
			String mcx = buildMcx(row, inputQubits, outputQubit);
			sbMcx.append(mcx);
		}
		
		StringBuilder sb = new StringBuilder();
		sb.append(sbPrepare).append(sbMcx).append(sbPrepare).append("\ncircuit.barrier()\n");
		return sb;
	}

	private String buildMcx(List<Integer> row, int inputQubits, int rowIndex) {
		StringBuilder sb = new StringBuilder("circuit.mcx([");
		for (int i=0; i<inputQubits; i++) {
			if (row.get(i)!=null)
				sb.append(i + ", ");
		}
		String result = sb.toString().substring(0, sb.length()-2) + "], " + rowIndex + ")\n";
		return result;
	}
}
