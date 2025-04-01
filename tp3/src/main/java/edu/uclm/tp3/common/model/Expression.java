package edu.uclm.tp3.common.model;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;

@Entity
public class Expression {

	@Id
	private String expressionName;
	@Column(columnDefinition = "TEXT")
	private String jsExpression;
	@Column(length = 2000)
	private String description;

	public void setExpressionName(String expressionName) {
		this.expressionName = expressionName;
	}

	public void setJsExpression(String jsExpression) {
		this.jsExpression = jsExpression;
	}

	public String getExpressionName() {
		return expressionName;
	}
	
	public String getJsExpression() {
		return jsExpression;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

}
