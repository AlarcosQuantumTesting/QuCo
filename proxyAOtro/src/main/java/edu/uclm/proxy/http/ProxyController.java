package edu.uclm.proxy.http;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@CrossOrigin(origins = "*", methods = {org.springframework.web.bind.annotation.RequestMethod.GET, org.springframework.web.bind.annotation.RequestMethod.POST})
@RequestMapping(value = "proxyaotro")
public class ProxyController {

@GetMapping(value="/saludar", produces = MediaType.TEXT_PLAIN_VALUE)

	public ResponseEntity<String> saludar() {
		return ResponseEntity
			.ok()
			.header("X-ProxyController", "saludar")
			.contentType(MediaType.TEXT_PLAIN)
			.body("Hola desde AlarcosJ o wherever");
	}

	@PostMapping("/resend")
	public Object resend(HttpServletRequest request, @RequestBody(required = false) Object payload) {
		try {
			String queryString = request.getQueryString();
			int indexIgual = queryString.indexOf('=');
			String url = queryString.substring(indexIgual + 1);
			HttpClient client = new HttpClient();
			return client.resend(url, payload);
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.toString());
		}
	}

}
