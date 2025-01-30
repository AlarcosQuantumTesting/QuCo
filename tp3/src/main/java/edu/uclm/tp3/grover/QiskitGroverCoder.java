package edu.uclm.tp3.grover;

import java.io.IOException;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import edu.uclm.tp3.qiskit.AbstractQiskitCoder;

@Service
public class QiskitGroverCoder extends AbstractQiskitCoder {

	@SuppressWarnings("unchecked")
	public String[] getCode(Map<String, Object> quirk) throws IOException {
		StringBuilder sbCalculus = new StringBuilder();
		List<List<Object>> matrixes = (List<List<Object>>) quirk.get("cols");
		for (int i=0; i<matrixes.size(); i++) {
			List<Object> quirkColumn = matrixes.get(i);
			sbCalculus.append(this.getCode(quirkColumn));
		}
		
		int qubits = matrixes.get(0).size();
		String code = this.prepareCode(qubits, qubits, sbCalculus);
		return code.split("\n");
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
				sb.append(getMCX(quirkColumn));
				break;
			} else if (gateName.equals("…")) {
				sb.append("circuit.barrier()\n");
				break;
			}
		}
		return sb;
	}

	private StringBuilder getMCX(List<Object> quirkColumn) {
		StringBuilder sb = new StringBuilder();
		sb.append("circuit.mcx([");
		for (int i=0; i<quirkColumn.size()-2; i++)
			sb.append(i + ", ");
		sb.append((quirkColumn.size()-2) + "], " + (quirkColumn.size()-1) + ")\n");
		return sb;
	}

}
