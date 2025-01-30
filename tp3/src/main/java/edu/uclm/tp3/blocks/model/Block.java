package edu.uclm.tp3.blocks.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import edu.uclm.tp3.common.gates.Gate;
import edu.uclm.tp3.common.model.Circuit;
import edu.uclm.tp3.common.services.EvolutionaryService;

@SuppressWarnings("serial")
public class Block implements Serializable {
	private List<BlockColumn> leftColumns;
	private Circuit circuit;
	private List<BlockColumn> rightColumns;
	
	public void setLeftColumns(Object[] receivedColumns) throws Exception {
		this.leftColumns = new ArrayList<>();
		this.setColumns(this.leftColumns, receivedColumns);
	}
	
	public void setRightColumns(Object[] receivedColumns) throws Exception {
		this.rightColumns = new ArrayList<>();
		this.setColumns(this.rightColumns, receivedColumns);
	}

	@SuppressWarnings("unchecked")
	private void setColumns(List<BlockColumn> field, Object[] receivedColumns) throws Exception {
		for (int i=0; i<receivedColumns.length; i++) {
			BlockColumn column = new BlockColumn();
			field.add(column);
			Object receivedColumn = receivedColumns[i];
			if (receivedColumn!=null && Map.class.isAssignableFrom(receivedColumn.getClass())) {
				Map<String, Object> mReceivedColumn = (Map<String, Object>) receivedColumn;
				List<Object> receivedGates = (List<Object>) mReceivedColumn.get("gates");
				this.setGates(column, receivedGates);
			}
		}
	}
	
	@SuppressWarnings("unchecked")
	private void setGates(BlockColumn column, List<Object> receivedGates) throws Exception {
		Object oReceivedGate;
		for (int i=0; i<receivedGates.size(); i++) {
			oReceivedGate = receivedGates.get(i);
			if (Map.class.isAssignableFrom(oReceivedGate.getClass())) {
				Map<String, Object> receivedGate = (Map<String, Object>) oReceivedGate;
				Object oGateClazzName = receivedGate.get("name");
				if (oGateClazzName!=null) {
					String gateClazzName = oGateClazzName.toString();
					Class<? extends Gate> gateClazz = EvolutionaryService.findGate(gateClazzName);
					Gate gate = gateClazz.getConstructor().newInstance();
					gate.setQubit(0, i);
					column.add(gate);
				}
			}
		}		
	}

	public void setBlock(Circuit circuit) {
		this.circuit = circuit;
	}
	
	public Circuit getBlock() {
		return circuit;
	}

	public StringBuilder getCode() {
		StringBuilder sb = new StringBuilder();
		for (int i=0; i<this.leftColumns.size(); i++)
			sb.append(this.leftColumns.get(i).getCode());
		sb.append("\n");
		sb.append(this.circuit.getGatesCode());
		sb.append("\n");
		for (int i=0; i<this.rightColumns.size(); i++)
			sb.append(this.rightColumns.get(i).getCode());
		return sb;
	}
	

}
