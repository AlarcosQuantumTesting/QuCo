package edu.uclm.proxy.http;

import java.io.IOException;
import java.util.List;

import org.apache.http.HttpEntity;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.client.methods.HttpPut;
import org.apache.http.client.methods.HttpRequestBase;
import org.apache.http.entity.ByteArrayEntity;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

public class HttpClient {
	
	private static final ObjectMapper MAPPER = new ObjectMapper();
	
	public String resend(String url, Object oPayload) throws JsonProcessingException {
		HttpRequestBase method;
		if (oPayload==null) {
			method = new HttpGet(url);
		} else {
			method = new HttpPost(url);
			String payload = MAPPER.writeValueAsString(oPayload);
			HttpEntity entity = new StringEntity(payload, ContentType.APPLICATION_JSON);
			((HttpPost) method).setEntity(entity);
		}
		
		try(CloseableHttpClient client = HttpClients.createDefault()) {
			CloseableHttpResponse response = client.execute(method);
			int code = response.getStatusLine().getStatusCode();
			if (response.getStatusLine().getStatusCode()>=300) {
				HttpStatus status = HttpStatus.resolve(code);
				String errorMessage = response.getStatusLine().getReasonPhrase();
				throw new ResponseStatusException(status, errorMessage);
			}
			HttpEntity entity = response.getEntity();
			String responseText = EntityUtils.toString(entity);
			return responseText;
		} catch (IOException e1) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e1.getMessage());
		}
	}
	
	public String runQiskit(String url, Object payload) {
		HttpPost post = new HttpPost(url);
		String sPayload = payload.toString();
		HttpEntity entity = new StringEntity(sPayload, "UTF-8");
		post.setEntity(entity);
		post.setHeader("Content-Type", "application/json");

		try(CloseableHttpClient client = HttpClients.createDefault()) {
			CloseableHttpResponse response = client.execute(post);
			int code = response.getStatusLine().getStatusCode();
			if (response.getStatusLine().getStatusCode()>=300) {
				HttpStatus status = HttpStatus.resolve(code);
				String errorMessage = response.getStatusLine().getReasonPhrase();
				throw new ResponseStatusException(status, errorMessage);
			}
			entity = response.getEntity();
			String responseText = EntityUtils.toString(entity);
			return responseText;
		} catch (IOException e1) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e1.getMessage());
		}
	}
	
	public String sendGet(String url) {
		HttpGet get = new HttpGet(url);
		get.setHeader("Content-Type", "application/json");
		
		try(CloseableHttpClient client = HttpClientBuilder.create().build()) {
			try {
				CloseableHttpResponse response = client.execute(get);
				int code = response.getStatusLine().getStatusCode();
				if (response.getStatusLine().getStatusCode()!=200) {
					HttpStatus status = HttpStatus.resolve(code);
					String errorMessage = response.getStatusLine().getReasonPhrase();
					throw new ResponseStatusException(status, errorMessage);
				}
				HttpEntity entity = response.getEntity();
				String responseText = EntityUtils.toString(entity);
				return responseText;
			} catch (Exception e) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
			}
		} catch (IOException e1) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e1.getMessage());
		}
	}
	
	public String sendPost(String url, List<String> headers, Object payload) {
		try(CloseableHttpClient client = HttpClientBuilder.create().build()) {
			HttpPost post = new HttpPost(url);
			try {
				HttpEntity entity = new StringEntity(payload.toString());
				post.setEntity(entity);
				if (headers!=null)
					for (int i=0; i<headers.size(); i++) {
						String headerName = headers.get(i++);
						String headerValue = headers.get(i);
						post.setHeader(headerName, headerValue);
					}
				
				CloseableHttpResponse response = client.execute(post);
				int code = response.getStatusLine().getStatusCode();
				if (response.getStatusLine().getStatusCode()!=200) {
					HttpStatus status = HttpStatus.resolve(code);
					String errorMessage = response.getStatusLine().getReasonPhrase();
					throw new ResponseStatusException(status, errorMessage);
				}
				entity = response.getEntity();
				String responseText = EntityUtils.toString(entity);
				return responseText;
			} catch (Exception e) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
			}
		} catch (IOException e1) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e1.getMessage());
		}
	}
	
	public String sendPut(String url, List<String> headers, byte[] payload) {
		try(CloseableHttpClient client = HttpClientBuilder.create().build()) {
			HttpPut put = new HttpPut(url);
			try {
				HttpEntity entity = new ByteArrayEntity(payload);
				put.setEntity(entity);
				if (headers!=null)
					for (int i=0; i<headers.size(); i++) {
						String headerName = headers.get(i++);
						String headerValue = headers.get(i);
						put.setHeader(headerName, headerValue);
					}
				
				CloseableHttpResponse response = client.execute(put);
				int code = response.getStatusLine().getStatusCode();
				if (response.getStatusLine().getStatusCode()!=200) {
					HttpStatus status = HttpStatus.resolve(code);
					String errorMessage = response.getStatusLine().getReasonPhrase();
					throw new ResponseStatusException(status, errorMessage);
				}
				entity = response.getEntity();
				String responseText = EntityUtils.toString(entity);
				return responseText;
			} catch (Exception e) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
			}
		} catch (IOException e1) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e1.getMessage());
		}
	}
}
