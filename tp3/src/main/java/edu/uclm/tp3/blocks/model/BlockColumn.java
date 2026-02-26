package edu.uclm.tp3.blocks.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import edu.uclm.tp3.common.gates.Gate;
import edu.uclm.tp3.common.services.EvolutionaryService;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@SuppressWarnings("serial")
@JsonIgnoreProperties(ignoreUnknown = true)
public class BlockColumn implements Serializable {
	private List<Gate> gates;

	public BlockColumn() {
		this.gates = new ArrayList<>();
	}

	@SuppressWarnings("unchecked")
	public void setGates(Object receivedColumn) throws Exception {
		this.gates = new ArrayList<>();
		if (receivedColumn != null && Map.class.isAssignableFrom(receivedColumn.getClass())) {
			Map<String, Object> mReceivedColumn = (Map<String, Object>) receivedColumn;
			List<Object> lReceivedGates = (List<Object>) mReceivedColumn.get("gates");
			for (int i = 0; i < lReceivedGates.size(); i++) {
				Object oReceivedGate = lReceivedGates.get(i);
				if (Map.class.isAssignableFrom(oReceivedGate.getClass())) {
					Map<String, Object> receivedGate = (Map<String, Object>) oReceivedGate;
					Object oGateClazzName = receivedGate.get("name");
					if (oGateClazzName != null) {
						String gateClazzName = oGateClazzName.toString();
						Class<? extends Gate> gateClazz = EvolutionaryService.findGate(gateClazzName);
						Gate gate = gateClazz.getConstructor().newInstance();
						gate.setQubit(0, i);
						this.gates.add(gate);
					}
				}
			}
		}
	}

	public List<Gate> getGates() {
		return gates;
	}

	public void add(Gate gate) {
		this.gates.add(gate);
	}

	public StringBuilder getCode() {
		StringBuilder sb = new StringBuilder();
		for (int i = 0; i < this.gates.size(); i++)
			sb.append(this.gates.get(i).getCode());
		return sb;
	}
}
