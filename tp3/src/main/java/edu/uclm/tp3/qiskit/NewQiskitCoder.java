package edu.uclm.tp3.qiskit;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import edu.uclm.tp3.common.model.CodeTemplate;
import edu.uclm.tp3.quirk.QuirkReducer;

@Service
public class NewQiskitCoder {

    @SuppressWarnings("unchecked")
    public String[] getCode(Object oReceivedMatrixes, int inputQubits, int qubits, String domain, boolean reduce, CodeTemplate template, String functionName) throws IOException {
        StringBuilder sbCalculus;
        if (reduce) {
            List<List<Integer>> receivedMatrixes = (List<List<Integer>>) oReceivedMatrixes;
            List<List<List<Integer>>> reducedMatrixes = QuirkReducer.reduce(receivedMatrixes, inputQubits, qubits);

            sbCalculus = this.getReducedCalculusCode(reducedMatrixes, inputQubits, domain);
        } else {
            List<List<Integer>> receivedMatrixes = (List<List<Integer>>) oReceivedMatrixes;

            sbCalculus = this.getWholeCalculusCode(receivedMatrixes, inputQubits, domain);
        }

        String code;
        if (functionName==null)
            code = this.prepareCodeAsAProgram(inputQubits, qubits, sbCalculus, template);
        else
            code = this.prepareCodeAsAFunction(qubits, sbCalculus, functionName);
		return code.split("\n");
    }

	private String prepareCodeAsAFunction(int qubits, StringBuilder sbCalculus, String functionName) {
		StringBuilder function = new StringBuilder("def get" + functionName + "() : \n");
		function.append("\tU = QuantumCircuit(" + qubits + ")\n");
		String[] lines = sbCalculus.toString().split("\n");
		for (String line : lines) {
			if (line.equals("circuit.barrier()"))
				continue;
			line = line.replace("circuit.", "U.");
			function.append("\t").append(line).append("\n");
		}

		if (function.length()>0)
			function.setLength(function.length() - 1);
		
		function.append("\n\treturn U.to_gate()\n");        
		return function.toString();
	}

	private final String prepareCodeAsAProgram(int inputQubits, int qubits, StringBuilder sbCalculus, CodeTemplate template) {
		String initialize = "#Input qubits initialization:\n";
		for (int i=0; i<inputQubits; i++) 
			initialize = initialize + "circuit.initialize(ZERO, " + i + ")\n";
		
		initialize = initialize + "#Output qubits MUST BE set to 0\n";
		for (int i=inputQubits; i<qubits; i++)
			initialize = initialize + "circuit.initialize(ZERO, " + i + ")\n";

		String code = template.getCode();
		code = code.replace("#QUBITS#", "" + qubits);
		code = code.replace("#OUTPUT_QUBITS#", "" + (qubits-inputQubits));
		code = code.replace("#INITIALIZE#", initialize);
		code = code.replace("#CALCULUS#", sbCalculus.toString());
		
		String measures = "";
		int contC = qubits-inputQubits-1;
		for (int i=inputQubits; i<qubits; i++) 
			measures = measures + "circuit.measure(qreg[" + i + "], creg[" + contC-- + "])\n";
		code = code.replace("#MEASURES#", measures);
		return code;
	}

    private StringBuilder getWholeCalculusCode(List<List<Integer>> receivedMatrixes, int inputQubits, String domain) {
        int value;

        StringBuilder sbCalculus = new StringBuilder(); 
        for (int i=0; i<receivedMatrixes.size(); i++) {
            List<Integer> row = receivedMatrixes.get(i);
            
            for (int j=inputQubits; j<row.size(); j++) {
                value = row.get(j);
                if (value==1) {
                    sbCalculus.append(buildStatements(row, inputQubits));
                    break;
                }
            }			
        }

		if (domain.equals("PHASE"))
			sbCalculus = this.changeToPhase(sbCalculus);

        return sbCalculus;
    }

    private StringBuilder getReducedCalculusCode(List<List<List<Integer>>> reducedMatrixes, int inputQubits, String domain) {
        StringBuilder sbCalculus = new StringBuilder(); 
		for (int i=0; i<reducedMatrixes.size(); i++) {
			List<List<Integer>> reducedMatrix = reducedMatrixes.get(i);
			int outputQubit = inputQubits + i;
			for (int j=0; j<reducedMatrix.size(); j++) {
				List<Integer> sRow = reducedMatrix.get(j);
				sbCalculus.append(buildStatements(sRow, inputQubits, outputQubit));
			}
		}

		if (domain.equals("PHASE"))
			sbCalculus = this.changeToPhase(sbCalculus);
		
		return sbCalculus;
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

    private StringBuilder buildStatements(List<Integer> row, int inputQubits, int outputQubit) {
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

	private StringBuilder buildStatements(List<Integer> row, int inputQubits) {
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
