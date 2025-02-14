package edu.uclm.tp3.http;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import edu.uclm.tp3.classic.QMatrix;

@RestController
@RequestMapping("classicMatrix")
@CrossOrigin("*")
public class ClassicMatrixController {
	
	@GetMapping("/getEmptyMatrix")
	public QMatrix getEmptyMatrix(@RequestParam(required = false) int inputQubits, @RequestParam int outputQubits) {
		if (inputQubits>12)
			throw new ResponseStatusException(HttpStatus.NOT_ACCEPTABLE, "The number of input qubits must be less or equal to 12");
		return new QMatrix(inputQubits, outputQubits);
	}
	
}
