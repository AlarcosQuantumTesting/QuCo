package edu.uclm.tp3.common.transpilation;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface TranspilationWorkDao extends JpaRepository<TranspilationWork, String> {

    @Query(value = "SELECT id, name, progress, null as code, size, creation_date_time FROM transpilation_work ORDER BY creation_date_time DESC", nativeQuery = true)
    List<TranspilationWork> getListOfTranspilationWorks();

}
