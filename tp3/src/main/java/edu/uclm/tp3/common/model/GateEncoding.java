package edu.uclm.tp3.common.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class GateEncoding implements Serializable {

	private static final long serialVersionUID = 1L;
	private String gateEncoding;
	private List<String> qubitsEncoding;
	
	public GateEncoding(String bitsGate) {
		this.gateEncoding = bitsGate;
		this.qubitsEncoding = new ArrayList<>();
	}
	
	public void setQubitsEncoding(List<String> qubitsEncoding) {
		this.qubitsEncoding = qubitsEncoding;
	}
	
	public String getGateEncoding() {
		return gateEncoding;
	}
	
	public List<String> getQubitsEncoding() {
		return qubitsEncoding;
	}

	public StringBuilder toQubitString() {
		StringBuilder sb = new StringBuilder();
		sb.append(this.gateEncoding);
		for (String s : this.qubitsEncoding)
			sb.append(s);
		return sb;
	}
}
