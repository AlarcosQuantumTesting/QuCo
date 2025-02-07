package edu.uclm.tp3.qiskit;

import java.io.IOException;

import edu.uclm.tp3.common.model.CodeTemplate;

public abstract class AbstractQiskitCoder {
	
	protected final String prepareCode(int inputQubits, int qubits, StringBuilder sbCalculus, CodeTemplate template) throws IOException {
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
