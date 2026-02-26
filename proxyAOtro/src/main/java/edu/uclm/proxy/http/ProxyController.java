package edu.uclm.proxy.http;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping(value = "proxyaotro")
@CrossOrigin(origins = "*", methods = { RequestMethod.GET, RequestMethod.POST }, allowedHeaders = "*", allowCredentials = "false")
public class ProxyController {

	@GetMapping("/saludar")
	public String saludar() {
		return "Hola desde AlarcosJ o wherever";
	}

	@PostMapping("/resend")
	public Object resend(HttpServletRequest request, @RequestBody(required = false) Object payload) {
		try {
			String queryString = request.getQueryString();
			// url=http://172.20.48.130:8080/run_qiskit?iterations=1&overwrite=n&runner=1
			int indexIgual = queryString.indexOf('=');
			String url = queryString.substring(indexIgual + 1);
			HttpClient client = new HttpClient();
			return client.resend(url, payload);
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.toString());
		}
	}

}
