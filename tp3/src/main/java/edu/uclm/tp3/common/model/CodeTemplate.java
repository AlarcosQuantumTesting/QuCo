package edu.uclm.tp3.common.model;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;

@Entity
public class CodeTemplate {

	@Id
	private String fileName;
	@Column(columnDefinition = "TEXT")
	private String code;
	@Column(length = 2000)
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
