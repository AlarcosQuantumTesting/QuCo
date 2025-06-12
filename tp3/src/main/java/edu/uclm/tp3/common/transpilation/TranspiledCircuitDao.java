package edu.uclm.tp3.common.transpilation;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TranspiledCircuitDao extends JpaRepository<TranspiledCircuit, String> {

    List<TranspiledCircuit> findByParentWorkId(String id);

    TranspiledCircuit findByParentWorkIdAndBackend(String id, String backend);

}
