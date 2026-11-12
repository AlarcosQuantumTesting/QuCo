package edu.uclm.tp3.common.services;

import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import edu.uclm.tp3.common.model.QiskitCode;
import edu.uclm.tp3.dao.QiskitCodeDao;

@Component
public class GenericGatesInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(GenericGatesInitializer.class);

    @Autowired
    private QiskitCodeDao qiskitCodeDao;

    @Override
    public void run(ApplicationArguments args) {
        log.info("Checking and seeding generic quantum gates in database...");
        seedGateIfNotExists(
            "InitialH",
            "Generic Hadamard layer h(n)",
            4,
            "def getInitialH(n = 4) : \n" +
            "\tU = QuantumCircuit(n, name=\"InitialH\")\n" +
            "\tfor i in range(n): U.h(i)\n" +
            "\treturn U.to_gate()\n"
        );

        seedGateIfNotExists(
            "Oracle",
            "Generic Grover Oracle O(n, [a])",
            4,
            "def getOracle(n = 4, a = [2]) : \n" +
            "\tU = QuantumCircuit(n, name=\"Oracle\")\n" +
            "\ttargets = a if isinstance(a, list) else [a]\n" +
            "\ttarget = n - 1\n" +
            "\tcontrols = [i for i in range(n) if i != target]\n" +
            "\tfor m in targets:\n" +
            "\t\tfor i in range(n):\n" +
            "\t\t\tif ((m >> i) & 1) == 0: U.x(i)\n" +
            "\t\tU.mcp(pi, controls, target)\n" +
            "\t\tfor i in range(n):\n" +
            "\t\t\tif ((m >> i) & 1) == 0: U.x(i)\n" +
            "\treturn U.to_gate()\n"
        );

        seedGateIfNotExists(
            "Diffuser",
            "Generic Grover Diffuser D(n)",
            4,
            "def getDiffuser(n = 4) : \n" +
            "\tU = QuantumCircuit(n, name=\"Diffuser\")\n" +
            "\tfor i in range(n): U.h(i)\n" +
            "\tfor i in range(n): U.x(i)\n" +
            "\ttarget = n - 1\n" +
            "\tcontrols = [i for i in range(n) if i != target]\n" +
            "\tU.mcp(pi, controls, target)\n" +
            "\tfor i in range(n): U.x(i)\n" +
            "\tfor i in range(n): U.h(i)\n" +
            "\treturn U.to_gate()\n"
        );

        seedGateIfNotExists(
            "MCP",
            "Multi-controlled phase gate MCP(n, alpha, target)",
            4,
            "def getMCP(n = 4) : \n" +
            "\tU = QuantumCircuit(n, name=\"MCP\")\n" +
            "\ttarget = n - 1\n" +
            "\tcontrols = [i for i in range(n) if i != target]\n" +
            "\tU.mcp(pi, controls, target)\n" +
            "\treturn U.to_gate()\n"
        );

        seedGateIfNotExists(
            "Measure",
            "Generic measurement layer M(n, order)",
            4,
            "def getMeasure(n = 4) : \n" +
            "\tU = QuantumCircuit(n, name=\"Measure\")\n" +
            "\tfor i in range(n): U.measure(i, i)\n" +
            "\treturn U.to_gate()\n"
        );

        seedGateIfNotExists(
            "Grover",
            "Generic Grover Algorithm h(n) · [O(n, [a]) · D(n)]{k}",
            4,
            "def getGrover(n = 4, a = [2, 7], k = 2) : \n" +
            "\tU = QuantumCircuit(n, name=\"Grover\")\n" +
            "\tfor i in range(n): U.h(i)\n" +
            "\ttargets = a if isinstance(a, list) else [a]\n" +
            "\ttarget = n - 1\n" +
            "\tcontrols = [i for i in range(n) if i != target]\n" +
            "\tfor _ in range(k):\n" +
            "\t\tfor m in targets:\n" +
            "\t\t\tfor i in range(n):\n" +
            "\t\t\t\tif ((m >> i) & 1) == 0: U.x(i)\n" +
            "\t\t\tU.mcp(pi, controls, target)\n" +
            "\t\t\tfor i in range(n):\n" +
            "\t\t\t\tif ((m >> i) & 1) == 0: U.x(i)\n" +
            "\t\tfor i in range(n): U.h(i)\n" +
            "\t\tfor i in range(n): U.x(i)\n" +
            "\t\tU.mcp(pi, controls, target)\n" +
            "\t\tfor i in range(n): U.x(i)\n" +
            "\t\tfor i in range(n): U.h(i)\n" +
            "\treturn U.to_gate()\n"
        );

        seedGateIfNotExists(
            "0",
            "Grover composite subcircuit 0",
            4,
            "def getSubcircuito_0(n = 4) : \n" +
            "\t# Subcircuito 0 de Grover\n" +
            "\tU = QuantumCircuit(n, name=\"Subcircuito_0\")\n" +
            "\treturn U.to_gate()\n"
        );
        log.info("Generic quantum gates successfully verified in database.");
    }

    private void seedGateIfNotExists(String name, String description, int qubits, String code) {
        try {
            Optional<QiskitCode> opt = qiskitCodeDao.findById(name);
            if (opt.isEmpty()) {
                QiskitCode newGate = new QiskitCode();
                newGate.setName(name);
                newGate.setDescription(description);
                newGate.setFunction(true);
                newGate.setGeneric(true);
                newGate.setQubits(qubits);
                newGate.setCode(code);
                qiskitCodeDao.save(newGate);
                log.info("Seeded generic gate '{}' into database.", name);
            } else {
                QiskitCode existing = opt.get();
                boolean changed = false;
                if (!existing.isGeneric()) {
                    existing.setGeneric(true);
                    changed = true;
                }
                if ("Oracle".equals(name) && (existing.getCode() == null || !existing.getCode().contains("a = [2]"))) {
                    existing.setCode(code);
                    existing.setDescription(description);
                    changed = true;
                    log.info("Updated generic gate 'Oracle' in database to multi-target O(n, a = [2]).");
                }
                if (changed) {
                    qiskitCodeDao.save(existing);
                    log.info("Updated generic gate '{}' in database.", name);
                }
            }
        } catch (Exception e) {
            log.warn("Could not seed generic gate '{}': {}", name, e.getMessage());
        }
    }
}
