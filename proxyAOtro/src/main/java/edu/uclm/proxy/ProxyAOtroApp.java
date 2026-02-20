package edu.uclm.proxy;

import java.io.IOException;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;

@SpringBootApplication
public class ProxyAOtroApp extends SpringBootServletInitializer {

	public static void main(String[] args) throws IOException {
		SpringApplication app = new SpringApplication(ProxyAOtroApp.class);
		app.run(args);
	}

	@Override
	protected SpringApplicationBuilder configure(SpringApplicationBuilder builder) {
		return builder.sources(ProxyAOtroApp.class);
	}
}
