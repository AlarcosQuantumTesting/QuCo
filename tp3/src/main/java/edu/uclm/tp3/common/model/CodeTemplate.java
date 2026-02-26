package edu.uclm.tp3.common.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@JsonIgnoreProperties(ignoreUnknown = true)
public class CodeTemplate {

	@Id
	private String fileName;
	@Column(columnDefinition = "TEXT")
	private String code;
	@Column(length = 5000)
	private String description;

	public void setFileName(String fileName) {
		this.fileName = fileName;
	}

	public void setCode(String code) {
		this.code = code;
	}

	public String getFileName() {
		return fileName;
	}

	public String getCode() {
		return code;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}
}
