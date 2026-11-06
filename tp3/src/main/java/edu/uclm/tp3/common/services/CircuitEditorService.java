package edu.uclm.tp3.common.services;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
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
                if (registration.getQubits() != null) {
                    for (Integer q : registration.getQubits()) {
                        if (q > maxQubitIndex) {
                            maxQubitIndex = q;
                        }
                    }
                }
            }
        }
        if (circuit != null && circuit.getQubits() != null) {
            for (int i = 0; i < circuit.getQubits().size(); i++) {
                EdQubit qubit = circuit.getQubits().get(i);
                if (qubit.getGates() != null) {
                    for (EdGate gate : qubit.getGates()) {
                        if (gate != null && gate.getName() != null && !gate.getName().equals("I") && !gate.getName().equals("0")) {
                            if (i > maxQubitIndex) {
                                maxQubitIndex = i;
                            }
                        }
                    }
                }
            }
        }
        
        int usedQubitsCount = (maxQubitIndex >= 0)
            ? (maxQubitIndex + 1)
            : ((circuit != null && circuit.getQubits() != null && !circuit.getQubits().isEmpty())
                ? Math.min(circuit.getQubits().size(), 4)
                : 4);

        Map<String, String> usedGatesMapping = new LinkedHashMap<>();

        if (circuit != null && circuit.getQubits() != null) {
            for (EdQubit qubit : circuit.getQubits()) {
                if (qubit.getGates() != null) {
                    for (EdGate gate : qubit.getGates()) {
                        String gateName = gate.getName();
                        if (gateName != null && !gateName.equals("I") && !gateName.equals("M") && !gateName.equalsIgnoreCase("Measure") && !gateName.equals("H") && !gateName.equals("X")) {
                            if (gate.getParentQubit() != null && "0".equals(gateName)) {
                                continue;
                            }
                            if (!usedGatesMapping.containsKey(gateName)) {
                                if (payload.getGateCodes() != null && payload.getGateCodes().containsKey(gateName)) {
                                    usedGatesMapping.put(gateName, payload.getGateCodes().get(gateName));
                                } else {
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
        }

        if (gateRegistry != null) {
            for (CircuitGate reg : gateRegistry) {
                String gateName = reg.getName();
                if (gateName != null && !gateName.equals("I") && !gateName.equals("M") && !gateName.equalsIgnoreCase("Measure") && !gateName.equals("H") && !gateName.equals("X")) {
                    if (!usedGatesMapping.containsKey(gateName)) {
                        if (payload.getGateCodes() != null && payload.getGateCodes().containsKey(gateName)) {
                            usedGatesMapping.put(gateName, payload.getGateCodes().get(gateName));
                        } else {
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

        StringBuilder initialize = new StringBuilder();
        Map<String, String> gateToFunctionMap = new HashMap<>();

        for (Map.Entry<String, String> entry : usedGatesMapping.entrySet()) {
            String gateName = entry.getKey();
            String gateCode = entry.getValue();

            if (gateCode != null) {
                initialize.append(gateCode.trim()).append("\n\n\n");
                String funcName = extractFunctionName(gateCode);
                if (funcName != null) {
                    gateToFunctionMap.put(gateName, funcName);
                } else {
                    gateToFunctionMap.put(gateName, "get" + gateName);
                }
            } else {
                initialize.append("# Error loading gate ").append(gateName).append("\n\n");
            }
        }

        class OpItem {
            int column;
            int minQubit;
            String name;
            List<Integer> qubits;
            Map<String, Object> dslParams;

            OpItem(int col, int minQ, String n, List<Integer> qs, Map<String, Object> dslParams) {
                this.column = col;
                this.minQubit = minQ;
                this.name = n;
                this.qubits = qs;
                this.dslParams = dslParams;
            }
        }

        List<OpItem> operations = new ArrayList<>();
        Set<String> processedTransactions = new HashSet<>();

        if (gateRegistry != null) {
            Map<String, OpItem> registryMap = new LinkedHashMap<>();
            List<CircuitGate> sortedRegistry = new ArrayList<>(gateRegistry);
            sortedRegistry.sort((a, b) -> {
                if (a.getColumn() != b.getColumn()) {
                    return Integer.compare(a.getColumn(), b.getColumn());
                }
                return Integer.compare(a.getParentQubit(), b.getParentQubit());
            });

            for (CircuitGate reg : sortedRegistry) {
                String tid = reg.getTransactionId() != null && !reg.getTransactionId().isEmpty()
                        ? reg.getTransactionId()
                        : (reg.getColumn() + "_" + reg.getParentQubit() + "_" + reg.getName());

                if (!registryMap.containsKey(tid)) {
                    int minQ = reg.getParentQubit();
                    if (reg.getQubits() != null && !reg.getQubits().isEmpty()) {
                        minQ = reg.getQubits().stream().min(Integer::compareTo).orElse(minQ);
                    }
                    List<Integer> initialQubits = reg.getQubits() != null ? new ArrayList<>(reg.getQubits()) : new ArrayList<>();
                    registryMap.put(tid, new OpItem(reg.getColumn(), minQ, reg.getName(), initialQubits, reg.getDslParams()));
                } else {
                    OpItem item = registryMap.get(tid);
                    if (reg.getDslParams() != null && item.dslParams == null) {
                        item.dslParams = reg.getDslParams();
                    }
                    if (reg.getQubits() != null) {
                        for (Integer q : reg.getQubits()) {
                            if (!item.qubits.contains(q)) {
                                item.qubits.add(q);
                            }
                        }
                        int minQ = reg.getQubits().stream().min(Integer::compareTo).orElse(item.minQubit);
                        if (minQ < item.minQubit) item.minQubit = minQ;
                    }
                }
            }

            for (Map.Entry<String, OpItem> entry : registryMap.entrySet()) {
                processedTransactions.add(entry.getKey());
                OpItem item = entry.getValue();
                item.qubits.sort(Integer::compareTo);
                operations.add(item);
            }
        }

        if (circuit != null && circuit.getQubits() != null) {
            for (int col = 0; col < circuit.getColumns(); col++) {
                for (int q = 0; q < circuit.getQubits().size(); q++) {
                    EdQubit qubit = circuit.getQubits().get(q);
                    if (qubit.getGates() != null && qubit.getGates().size() > col) {
                        EdGate gate = qubit.getGates().get(col);
                        if (gate == null || gate.getName() == null || gate.getName().equals("I") || (gate.getParentQubit() != null && gate.getName().equals("0"))) {
                            continue;
                        }
                        String tid = (gate.getTransactionId() != null && !gate.getTransactionId().isEmpty()) ? gate.getTransactionId() : null;
                        if (tid == null || !processedTransactions.contains(tid)) {
                            List<Integer> qs = new ArrayList<>();
                            qs.add(q);
                            if (gate.getTargetQubits() != null) {
                                qs.addAll(gate.getTargetQubits());
                            }
                            qs.sort(Integer::compareTo);
                            operations.add(new OpItem(col, q, gate.getName(), qs, gate.getDslParams()));
                            if (tid != null) processedTransactions.add(tid);
                        }
                    }
                }
            }
        }

        operations.sort((a, b) -> {
            if (a.column != b.column) return Integer.compare(a.column, b.column);
            return Integer.compare(a.minQubit, b.minQubit);
        });

        StringBuilder calculus = new StringBuilder();
        StringBuilder measures = new StringBuilder();

        for (OpItem op : operations) {
            String gateName = op.name;
            List<String> qStrs = new ArrayList<>();
            for (Integer q : op.qubits) {
                qStrs.add(q.toString());
            }
            String qubitsList = String.join(", ", qStrs);

            if (gateName.equals("M") || gateName.equalsIgnoreCase("Measure")) {
                for (Integer q : op.qubits) {
                    int targetBit = usedQubitsCount - q - 1;
                    calculus.append("circuit.measure(").append(q).append(", ").append(targetBit).append(")\n");
                    measures.append("circuit.measure(").append(q).append(", ").append(targetBit).append(")\n");
                }
            } else if (gateName.equals("H")) {
                for (Integer q : op.qubits) {
                    calculus.append("circuit.h(").append(q).append(")\n");
                }
            } else if (gateName.equals("X")) {
                for (Integer q : op.qubits) {
                    calculus.append("circuit.x(").append(q).append(")\n");
                }
            } else {
                String displayGateName = findFunctionName(gateToFunctionMap, gateName);
                if (displayGateName == null || displayGateName.equals("0") || displayGateName.equals(gateName)) {
                    displayGateName = gateToFunctionMap.getOrDefault(gateName, "get" + (gateName.equals("0") ? "Subcircuito_0" : gateName.replace(" ", "_")));
                }
                String callArgs = "";
                if (usedGatesMapping != null && usedGatesMapping.containsKey(gateName)) {
                    String gCode = usedGatesMapping.get(gateName);
                    if (gCode != null) {
                        Matcher matcher = Pattern.compile("def\\s+[^\\(\\s]+\\s*\\((.*?)\\)").matcher(gCode);
                        if (matcher.find()) {
                            String paramsStr = matcher.group(1);
                            int nQubits = op.qubits.size();
                            if (paramsStr.contains("m")) {
                                Object mVal = (op.dslParams != null && op.dslParams.get("value") != null) ? op.dslParams.get("value") : null;
                                if (mVal == null && gateName.equals("Oracle")) {
                                    List<OpItem> oracles = new ArrayList<>();
                                    for (OpItem oi : operations) {
                                        if (oi.name.equals("Oracle")) oracles.add(oi);
                                    }
                                    int idx = oracles.indexOf(op);
                                    mVal = (idx % 2 == 0) ? 4 : 9;
                                }
                                if (mVal != null) {
                                    callArgs = nQubits + ", " + mVal;
                                } else {
                                    callArgs = String.valueOf(nQubits);
                                }
                            } else if (paramsStr.contains("n")) {
                                callArgs = String.valueOf(nQubits);
                            }
                        }
                    }
                }
                calculus.append("circuit.append(").append(displayGateName).append("(").append(callArgs).append("), [").append(qubitsList).append("])\n");
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
        Pattern pattern = Pattern.compile("def\\s+([^\\(\\s]+)\\s*\\(");
        Matcher matcher = pattern.matcher(code);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return null;
    }
}
