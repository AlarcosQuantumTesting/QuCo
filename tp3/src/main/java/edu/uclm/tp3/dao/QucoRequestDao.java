package edu.uclm.tp3.dao;

import org.springframework.data.jpa.repository.JpaRepository;

import edu.uclm.tp3.common.model.QucoRequest;

public interface QucoRequestDao extends JpaRepository<QucoRequest, String> {

}
