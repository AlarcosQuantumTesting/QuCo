package edu.uclm.tp3.qiskit;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import edu.uclm.tp3.common.deterministic.QCircuit;
import edu.uclm.tp3.common.deterministic.QCircuitGate;
import edu.uclm.tp3.common.deterministic.QColumn;
import edu.uclm.tp3.common.deterministic.QGate;
import edu.uclm.tp3.common.model.CodeTemplate;

@Service
public class NewGroverCoder {

    public String getCode(QCircuitGate difussor) {
        StringBuilder code = new StringBuilder();
		List<QColumn> columns = difussor.getColumns();
		for (QColumn column : columns)
			code.append(this.getCode(column));
		return code.toString();
    }

	/*public String getCode(QGroverOracle oracle) {
		QColumn encoding0 = oracle.getEncoding0();
		QColumn h0 = oracle.getH0();
		QColumn mcx = oracle.getMcXOrZ();
		QColumn h1 = oracle.getH1();
		QColumn encoding1 = oracle.getEncoding1();

		StringBuilder code = this.getCode(encoding0);
		if (h0!= null)
			code.append(this.getCode(h0));
		code.append(this.getCode(mcx));
		if (h1 != null)
			code.append(this.getCode(h1));
		code.append(this.getCode(encoding1));
		return code.toString();
	}*/

    public String getCode(QCircuit circuit, int qubits) {
        StringBuilder sbCalculus = new StringBuilder();
		List<QColumn> columns = circuit.getColumns();

		for (int i=0; i<columns.size(); i++) {
			QColumn column = columns.get(i);
			sbCalculus.append(this.getCode(column));
		}
		return sbCalculus.toString();
    }

	private StringBuilder getCode(QColumn column) {
		StringBuilder sb = new StringBuilder();
		List<QGate> gates = column.getGates();
		for (int i=0; i<gates.size(); i++) {
			/*Object gateName = gateIds.get(i);
			if (gateName.equals("H"))
				sb.append("\tU.h(" + i + ")\n");
			else if (gateName.equals("X"))
				sb.append("\tU.x(" + i + ")\n");
			else if (gateName.equals("%E2%80%A2") || gateName.equals("•")) {
				sb.append(getControlledGate(i, column));
				break;
			} else if (gateName.equals("…")) {
				sb.append("\tU.barrier()\n");
				break;
			}*/
		}
		return sb;
	}

	/*private Object getControlledGate(int start, QColumn column) {
		StringBuilder sb = new StringBuilder();
		char last = column.get(column.size()-1).toString().charAt(0);
		if (last=='z' || last=='Z')
			sb.append("\tU.mcp(pi, [");
		else
			sb.append("\tU.mcx([");
		for (int i=start; i<column.size()-2; i++)
			sb.append(i + ", ");
		sb.append((column.size()-2) + "], " + (column.size()-1) + ")\n");
		return sb;
	}*/

	@SuppressWarnings("unchecked")
	public String[] getCode(Map<String, Object> quirk, CodeTemplate template, String functionName) {
		StringBuilder sbCalculus = new StringBuilder();
		List<List<Object>> matrixes = (List<List<Object>>) quirk.get("cols");

		int qubits = matrixes.get(0).size();
		for (int i=0; i<matrixes.size(); i++) {
			List<Object> quirkColumn = matrixes.get(i);
			sbCalculus.append(this.getCode(quirkColumn));
		}
		
        String code;
        if (functionName==null)
            code = this.prepareCodeAsAProgram(qubits, sbCalculus, template);
        else
            code = this.prepareCodeAsAFunction(qubits, sbCalculus, functionName);

		List<Double> expected = (List<Double>) quirk.get("expected");
		StringBuilder sbExpected = new StringBuilder("expected = [");
		for (int i=0; i<expected.size(); i=i+2) {
			sbExpected.append("(" + expected.get(i).intValue() + ", " + expected.get(i+1) + ")");
			if (i<expected.size()-2)
				sbExpected.append(", ");
		}
		sbExpected.append("]");

		code = code.replace("#EXPECTED#", sbExpected.toString());

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

	private final String prepareCodeAsAProgram(int qubits, StringBuilder sbCalculus, CodeTemplate template) {
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
			else if (gateName.equals("%E2%80%A2") || gateName.equals("•")) {
				sb.append(getControlledGate(i, quirkColumn));
				break;
			} else if (gateName.equals("…")) {
				sb.append("circuit.barrier()\n");
				break;
			}
		}
		return sb;
	}

	private StringBuilder getControlledGate(int start, List<Object> quirkColumn) {
		StringBuilder sb = new StringBuilder();
		char last = quirkColumn.get(quirkColumn.size()-1).toString().charAt(0);
		if (last=='z' || last=='Z')
			sb.append("circuit.mcp(pi, [");
		else
			sb.append("circuit.mcx([");
		for (int i=start; i<quirkColumn.size()-2; i++)
			sb.append(i + ", ");
		sb.append((quirkColumn.size()-2) + "], " + (quirkColumn.size()-1) + ")\n");
		return sb;
	}
}
