package edu.uclm.tp3.http;

import java.io.IOException;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import edu.uclm.tp3.common.model.Expression;
import edu.uclm.tp3.common.services.ExpressionsService;

@RestController
@RequestMapping("expressions")
@CrossOrigin("*")
public class ExpressionsController {
	
	@Autowired
    private ExpressionsService service;
    
    @GetMapping("/getExpressions")
    public List<Expression> getExpressions() throws IOException {
        return this.service.getExpressions();
    }
    
    @PostMapping("/createExpression") 
    public Expression createExpression(@RequestBody Expression expression) {
        return this.service.createExpression(expression);
    }
    
    @PostMapping("/updateExpression") 
	public Expression updateExpression(@RequestBody Expression expression) {
		return this.service.updateExpression(expression);
	}

	@DeleteMapping("/deleteExpression")
	public void deleteExpression(@RequestParam String id) {
		this.service.deleteExpression(id);
	}
}
