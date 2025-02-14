package edu.uclm.tp3.http;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import edu.uclm.tp3.Utils;
import edu.uclm.tp3.sparse.QMatrix;

@RestController
@RequestMapping("unitaryMatrix")
@CrossOrigin("*")
public class UnitaryMatrixController {
	
	@SuppressWarnings("unchecked")
	@PutMapping("/getMatrix")
	public Map<String, Object> getMatrix(@RequestBody Map<String, Object> info) {
		long time = System.currentTimeMillis();
		
		int inputQubits = (int) info.get("inputQubits");
		int outputQubits;
		
		List<List<Integer>> receivedMatrix = (List<List<Integer>>) info.get("matrix");
		
		try {
			List<Integer> row0 = receivedMatrix.get(0);
			outputQubits = row0.size() - inputQubits;
		} catch (ClassCastException e) {
			receivedMatrix = new ArrayList<>();
			receivedMatrix.add((List<Integer>) info.get("matrix"));
			outputQubits = receivedMatrix.size() - inputQubits;
		}
		
		int value;
		List<QMatrix> matrices = new ArrayList<>();
		QMatrix finalMatrix = new QMatrix();

		for (int i=0; i<receivedMatrix.size(); i++) {
			List<Integer> row = receivedMatrix.get(i);
			
			for (int j=inputQubits; j<row.size(); j++) {
				value = row.get(j);
				if (value==1) {
					matrices.clear();
					List<QMatrix> column0 = this.initialColumn(row, inputQubits);
					QMatrix tp0 = QMatrix.tp(column0);
					matrices.add(tp0);
					List<QMatrix> calculusColumns = this.calculusColumns(row, inputQubits);
					matrices.addAll(calculusColumns);
					matrices.add(tp0);
					
					if (finalMatrix.getNumberOfRows()==0) {
						finalMatrix = QMatrix.multiply(matrices);
					} else {
						QMatrix auxi = QMatrix.multiply(matrices);
						finalMatrix = QMatrix.multiply(finalMatrix, auxi);
					}
					break;
				}
			}
		}
		
		time = (System.currentTimeMillis()-time)/1000;
		Map<String, Object> result = new HashMap<>();
		result.put("matrix", finalMatrix);
		result.put("time", time);
		try {
			String template = Utils.readFileAsString(this, "qiskitTemplate.txt");
			String start = template.substring(0, template.indexOf("#CALCULUS#\n")) + "#MATRIX#\n";
			start = start.replace("#QUBITS#", "" + (inputQubits + outputQubits));
			start = start.replace("#OUTPUT_QUBITS#", "" + outputQubits);
			String end = template.substring(template.indexOf("#MEASURES#"));
			end = end.replace("#MEASURES#\n", "#MEASURES#\n" + getMeasures(inputQubits, outputQubits));
			end = end.replace("#SHOTS#", "1000");
			result.put("start", start);
			result.put("end", end);
		} catch (IOException e) {
			System.out.println(e.toString());
		}
		
		return result;
	}

	private String getMeasures(int inputQubits, int outputQubits) {
		StringBuilder sb = new StringBuilder();
		for (int i=0; i<outputQubits; i++) 
			sb.append("circuit.measure(" + i + ", " + (inputQubits-i-1) + ")\n");
		return sb.toString();
	}

	private List<QMatrix> calculusColumns(List<Integer> row, int inputQubits) {
		int value;
		List<QMatrix> result = new ArrayList<>();
		for (int j=inputQubits; j<row.size(); j++) {
			value = row.get(j);
			if (value==1)
				result.add(QMatrix.ccx(row.size(), j));
		}
		return result;
	}

	private List<QMatrix> initialColumn(List<Integer> row, int inputQubits) {
		int value;
		List<QMatrix> result = new ArrayList<>();
		for (int j=0; j<inputQubits; j++) {
			value = row.get(j);
			if (value==0)
				result.add(QMatrix.x());
			else
				result.add(QMatrix.i());
		}
		for (int j=inputQubits; j<row.size(); j++)
			result.add(QMatrix.i());
		return result;
	}
}
