package edu.uclm.tp3.dao;

import org.springframework.data.jpa.repository.JpaRepository;

import edu.uclm.tp3.transpiler.Backend;

public interface BackendDao extends JpaRepository<Backend, String> {

}
