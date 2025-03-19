package edu.uclm.tp3.qiskit;

import java.io.IOException;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import edu.uclm.tp3.common.model.CodeTemplate;

@Service
public class NewGroverCoder {

@SuppressWarnings("unchecked")
	public String[] getCode(Map<String, Object> quirk, CodeTemplate template, String functionName) throws IOException {
		StringBuilder sbCalculus = new StringBuilder();
		List<List<Object>> matrixes = (List<List<Object>>) quirk.get("cols");
		for (int i=0; i<matrixes.size(); i++) {
			List<Object> quirkColumn = matrixes.get(i);
			sbCalculus.append(this.getCode(quirkColumn));
		}
		
		int qubits = matrixes.get(0).size();
        String code;
        if (functionName==null)
            code = this.prepareCodeAsAProgram(qubits, sbCalculus, template);
        else
            code = this.prepareCodeAsAFunction(qubits, sbCalculus, functionName);

		return code.split("\n");
	}

    private String prepareCodeAsAFunction(int qubits, StringBuilder sbCalculus, String functionName) {
		StringBuilder function = new StringBuilder("def " + functionName + "() : \n");
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

	private final String prepareCodeAsAProgram(int qubits, StringBuilder sbCalculus, CodeTemplate template) throws IOException {
		String initialize = "#Input qubits initialization:\n";
		for (int i=0; i<qubits; i++) 
			initialize = initialize + "circuit.initialize(ZERO, " + i + ")\n";
		
		String code = template.getCode();
		code = code.replace("#QUBITS#", "" + qubits);
		code = code.replace("#OUTPUT_QUBITS#", "" + qubits);
		code = code.replace("#INITIALIZE#", initialize);
		code = code.replace("#CALCULUS#", sbCalculus.toString());
		code = code.replace("#SHOTS#", "1000");
		
		String measures = "";
		for (int i=0; i<qubits; i++) 
			measures = measures + "circuit.measure(qreg[" + i + "], creg[" + i + "])\n";
		code = code.replace("#MEASURES#", measures);
		return code;
	}

	private StringBuilder getCode(List<Object> quirkColumn) {
		StringBuilder sb = new StringBuilder();
		for (int i=0; i<quirkColumn.size(); i++) {
			Object gateName = quirkColumn.get(i);
			if (gateName.equals("H"))
				sb.append("circuit.h(" + i + ")\n");
			else if (gateName.equals("X"))
				sb.append("circuit.x(" + i + ")\n");
			else if (gateName.equals("%E2%80%A2")) {
				sb.append(getControlledGate(quirkColumn));
				break;
			} else if (gateName.equals("…")) {
				sb.append("circuit.barrier()\n");
				break;
			}
		}
		return sb;
	}

	private StringBuilder getControlledGate(List<Object> quirkColumn) {
		StringBuilder sb = new StringBuilder();
		char last = quirkColumn.get(quirkColumn.size()-1).toString().charAt(0);
		if (last=='z' || last=='Z')
			sb.append("circuit.mcp(pi, [");
		else
			sb.append("circuit.mcx([");
		for (int i=0; i<quirkColumn.size()-2; i++)
			sb.append(i + ", ");
		sb.append((quirkColumn.size()-2) + "], " + (quirkColumn.size()-1) + ")\n");
		return sb;
	}
}
