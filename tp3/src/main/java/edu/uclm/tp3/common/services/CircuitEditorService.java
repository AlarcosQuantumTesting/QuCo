package edu.uclm.tp3.common.services;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import edu.uclm.tp3.common.model.CircuitEditorPayload;
import edu.uclm.tp3.common.model.CircuitGate;
import edu.uclm.tp3.common.model.CodeTemplate;
import edu.uclm.tp3.common.model.EdCircuit;
import edu.uclm.tp3.common.model.EdGate;
import edu.uclm.tp3.common.model.EdQubit;
import edu.uclm.tp3.common.model.QiskitCode;
import edu.uclm.tp3.common.model.QubitsConfiguration;
import edu.uclm.tp3.dao.QiskitCodeDao;
import edu.uclm.tp3.dao.QubitsConfigurationDao;
import edu.uclm.tp3.dao.TemplateDao;

@Service
public class CircuitEditorService {

    @Autowired
    private TemplateDao templateDao;

    @Autowired
    private QubitsConfigurationDao qubitsConfigurationDao;

    @Autowired
    private QiskitCodeDao qiskitCodeDao;

    public Map<String, Object> generateCode(CircuitEditorPayload payload) throws Exception {
        Optional<CodeTemplate> optTemplateCode = this.templateDao.findById(payload.getTemplateName());
        if (optTemplateCode.isEmpty()) {
            throw new Exception("Template not found: " + payload.getTemplateName());
        }
        String templateCode = optTemplateCode.get().getCode();

        EdCircuit circuit = payload.getCircuit();
        List<CircuitGate> gateRegistry = payload.getGateRegistry();

        int maxQubitIndex = -1;
        if (gateRegistry != null) {
            for (CircuitGate registration : gateRegistry) {
                for (Integer q : registration.getQubits()) {
                    if (q > maxQubitIndex) {
                        maxQubitIndex = q;
                    }
                }
            }
        }
        
        int usedQubitsCount = maxQubitIndex == -1 ? 0 : maxQubitIndex + 1;

        Map<String, String> usedGatesMapping = new HashMap<>();

        if (circuit != null && circuit.getQubits() != null) {
            for (EdQubit qubit : circuit.getQubits()) {
                if (qubit.getGates() != null) {
                    for (EdGate gate : qubit.getGates()) {
                        String gateName = gate.getName();
                        if (gateName != null && !gateName.equals("I") && !gateName.equals("M") && !gateName.equals("0") && !gateName.equals("H")) {
                            if (!usedGatesMapping.containsKey(gateName)) {
                                Optional<QiskitCode> optQiskitCode = this.qiskitCodeDao.findById(gateName);
                                if (optQiskitCode.isPresent()) {
                                    usedGatesMapping.put(gateName, optQiskitCode.get().getCode());
                                } else {
                                    usedGatesMapping.put(gateName, null);
                                }
                            }
                        }
                    }
                }
            }
        }

        StringBuilder initialize = new StringBuilder();
        Map<String, String> gateToFunctionMap = new HashMap<>();

        for (Map.Entry<String, String> entry : usedGatesMapping.entrySet()) {
            String gateName = entry.getKey();
            String gateCode = entry.getValue();

            if (gateCode != null) {
                initialize.append(gateCode).append("\n\n");
                String funcName = extractFunctionName(gateCode);
                if (funcName != null) {
                    gateToFunctionMap.put(gateName, funcName);
                }
            } else {
                initialize.append("# Error loading gate ").append(gateName).append("\n\n");
            }
        }

        StringBuilder measures = new StringBuilder();
        if (circuit != null && circuit.getQubits() != null) {
            for (int i = 0; i < circuit.getColumns(); i++) {
                for (int j = 0; j < circuit.getQubits().size(); j++) {
                    EdQubit qubit = circuit.getQubits().get(j);
                    if (qubit.getGates() != null && qubit.getGates().size() > i) {
                        EdGate gate = qubit.getGates().get(i);
                        if (gate == null || gate.getName() == null || gate.getName().equals("I") || gate.getName().equals("0")) {
                            continue;
                        }
                        if (gate.getName().equals("M")) {
                            measures.append("circuit.measure(").append(j).append(", ").append(usedQubitsCount - j - 1).append(")\n");
                        }
                    }
                }
            }
        }

        StringBuilder calculus = new StringBuilder();
        if (gateRegistry != null) {
            Map<String, Set<Integer>> consolidatedQubitSets = new java.util.LinkedHashMap<>();
            List<CircuitGate> sortedRegistry = new ArrayList<>(gateRegistry);
            sortedRegistry.sort((a, b) -> {
                if (a.getColumn() != b.getColumn()) {
                    return Integer.compare(a.getColumn(), b.getColumn());
                }
                return Integer.compare(a.getParentQubit(), b.getParentQubit());
            });

            for (CircuitGate registration : sortedRegistry) {
                String key = registration.getTransactionId() + "_" + registration.getName();
                consolidatedQubitSets.putIfAbsent(key, new HashSet<>());
                consolidatedQubitSets.get(key).addAll(registration.getQubits());
            }

            for (Map.Entry<String, Set<Integer>> entry : consolidatedQubitSets.entrySet()) {
                String key = entry.getKey();
                String gateName = key.substring(key.indexOf("_") + 1);

                List<Integer> sortedQubits = new ArrayList<>(entry.getValue());
                sortedQubits.sort(Integer::compareTo);

                List<String> qubitsStrList = new ArrayList<>();
                for (Integer q : sortedQubits) {
                    qubitsStrList.add(q.toString());
                }
                String qubitsList = String.join(", ", qubitsStrList);

                if (gateName.equals("M")) {
                    for (Integer q : sortedQubits) {
                        calculus.append("circuit.measure(").append(q).append(", ").append(usedQubitsCount - q - 1).append(")\n");
                    }
                } else if (gateName.equals("H")) {
                    for (Integer q : sortedQubits) {
                        calculus.append("circuit.h(").append(q).append(")\n");
                    }
                } else {
                    String displayGateName = findFunctionName(gateToFunctionMap, gateName);
                    calculus.append("circuit.append(").append(displayGateName).append("(), [").append(qubitsList).append("])\n");
                }
            }
        }

        templateCode = replaceTokens(templateCode, "#QUBITS#", String.valueOf(usedQubitsCount));
        templateCode = replaceTokens(templateCode, "#OUTPUT_QUBITS#", String.valueOf(usedQubitsCount));

        if (payload.getQubitsConfigurationName() != null) {
            Optional<QubitsConfiguration> optConfig = this.qubitsConfigurationDao.findById(payload.getQubitsConfigurationName());
            if (optConfig.isPresent() && optConfig.get().getMatrix() != null) {
                int[] matrix = optConfig.get().getMatrix();
                List<String> layoutList = new ArrayList<>();
                int sliceEnd = Math.min(usedQubitsCount, matrix.length);
                for (int i = 0; i < sliceEnd; i++) {
                    layoutList.add(String.valueOf(matrix[i]));
                }
                String layoutStr = String.join(", ", layoutList);
                templateCode = replaceTokens(templateCode, "#QUBITS_LAYOUT#", layoutStr);
            } else {
                templateCode = replaceTokens(templateCode, ", initial_layout=[#QUBITS_LAYOUT#])", ")");
            }
        } else {
            templateCode = replaceTokens(templateCode, ", initial_layout=[#QUBITS_LAYOUT#])", ")");
        }

        templateCode = replaceTokens(templateCode, "#INITIALIZE#", initialize.toString());
        templateCode = replaceTokens(templateCode, "#CALCULUS#", calculus.toString());
        templateCode = replaceTokens(templateCode, "#MEASURES#", measures.toString());
        templateCode = replaceTokens(templateCode, "#SHOTS#", "1000");

        Map<String, Object> result = new HashMap<>();
        result.put("CODE", templateCode);

        return result;
    }

    private String replaceTokens(String templateCode, String token, String replacement) {
        if (templateCode.contains(token)) {
            return templateCode.replace(token, replacement);
        }
        return templateCode;
    }

    private String findFunctionName(Map<String, String> gateToFunctionMap, String gateName) {
        if (gateToFunctionMap.containsKey(gateName)) {
            return gateToFunctionMap.get(gateName);
        }
        // Case-insensitive and space/underscore flexible lookup
        for (Map.Entry<String, String> entry : gateToFunctionMap.entrySet()) {
            String key = entry.getKey();
            if (key.equalsIgnoreCase(gateName) || 
                key.replace(" ", "_").equalsIgnoreCase(gateName.replace(" ", "_"))) {
                return entry.getValue();
            }
        }
        return gateName;
    }

    private String extractFunctionName(String code) {
        if (code == null) return null;
        // Permissive regex: find 'def', skip spaces, capture everything until '('
        Pattern pattern = Pattern.compile("def\\s+([^\\(]+)\\(");
        Matcher matcher = pattern.matcher(code);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return null;
    }
}
