package edu.uclm.tp3.common.gates;

import edu.uclm.tp3.classic.QMatrix;

@SuppressWarnings("serial")
public class MCX extends NQubitsGate {
	
	@Override
	public String toString() {
		StringBuilder sb = new StringBuilder("mcx([");
		for (int i=0; i<this.qubits.size()-1; i++) 
			sb.append(this.qubits.get(i) + ", ");
		String result = sb.toString().trim();
		result = result.substring(0, result.length()-1) + "], ";
		result = result + this.qubits.get(this.qubits.size()-1) + ")\n";
		return result;
	}
	
	@Override
	public edu.uclm.tp3.sparse.QMatrix getMatrix() {
		// TODO Auto-generated method stub
		return null;
	}

}
