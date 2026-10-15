package edu.uclm.tp3.common.model;

import java.util.List;

public class CircuitEditorPayload {
    private String templateName;
    private String qubitsConfigurationName;
    private EdCircuit circuit;
    private List<CircuitGate> gateRegistry;

    public String getTemplateName() {
        return templateName;
    }

    public void setTemplateName(String templateName) {
        this.templateName = templateName;
    }

    public String getQubitsConfigurationName() {
        return qubitsConfigurationName;
    }

    public void setQubitsConfigurationName(String qubitsConfigurationName) {
        this.qubitsConfigurationName = qubitsConfigurationName;
    }

    public EdCircuit getCircuit() {
        return circuit;
    }

    public void setCircuit(EdCircuit circuit) {
        this.circuit = circuit;
    }

    public List<CircuitGate> getGateRegistry() {
        return gateRegistry;
    }

    public void setGateRegistry(List<CircuitGate> gateRegistry) {
        this.gateRegistry = gateRegistry;
    }
}
