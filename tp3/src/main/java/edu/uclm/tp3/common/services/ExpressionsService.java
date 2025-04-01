package edu.uclm.tp3.common.services;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import edu.uclm.tp3.common.model.Expression;
import edu.uclm.tp3.dao.ExpressionDao;

@Service
public class ExpressionsService {

    @Autowired
    private ExpressionDao expressionDao;

    public List<Expression> getExpressions() {
        return this.expressionDao.findAll();
    }

    public Expression createExpression(Expression expression) {
        if (expression.getExpressionName() == null || expression.getJsExpression() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Expression name and function are mandatory");
        }

        try {
            return this.expressionDao.save(expression);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error saving the expression", e);
        }
    }

    public void deleteExpression(String id) {
        if (!expressionDao.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Expression not found");
        }
        expressionDao.deleteById(id);
    }
    
	public Expression updateExpression(Expression expression) {
        if (expression == null || expression.getExpressionName() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Expression name is required");
        }
        
        // Verificar si la expresión existe
        if (!expressionDao.existsById(expression.getExpressionName())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Expression not found");
        }
        
        // Guardar los cambios en la base de datos
        return expressionDao.save(expression);
    }

}