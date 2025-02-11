package edu.uclm.tp3.qiskit;

import java.io.IOException;

import edu.uclm.tp3.common.model.CodeTemplate;

public abstract class AbstractQiskitCoder {

	protected final String prepareCode(String type, int inputQubits, int qubits, StringBuilder sbCalculus, CodeTemplate template) throws IOException {
		if (type.equalsIgnoreCase("program"))
			return this.prepareCodeAsAProgram(inputQubits, qubits, sbCalculus, template);
		return this.prepareCodeAsAFunction(qubits, sbCalculus);
	}
	
	private String prepareCodeAsAFunction(int qubits, StringBuilder sbCalculus) {
		StringBuilder function = new StringBuilder("def getSubcircuit() : \n");
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

	private final String prepareCodeAsAProgram(int inputQubits, int qubits, StringBuilder sbCalculus, CodeTemplate template) throws IOException {
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
}
