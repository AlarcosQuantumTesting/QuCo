package edu.uclm.tp3.ws;

import java.io.IOException;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.fasterxml.jackson.databind.ObjectMapper;

import edu.uclm.tp3.elonging.strategies.ManagerService;

@Component
public class WSTP3 extends TextWebSocketHandler {
	
	private static ManagerService manager;
	
	@Autowired
	public void setGeneticService(ManagerService service) {
		WSTP3.manager = service;
	}

	@Override
	public void afterConnectionEstablished(WebSocketSession session) throws Exception {
		session.setTextMessageSizeLimit(1000*1024*1024);
		String query = session.getUri().getQuery();
		String httpSessionId = query.substring(query.indexOf('=')+1);
		HWSession hwSession = new HWSession(manager, httpSessionId, session);
		manager.put(hwSession);
	}
	
	public static synchronized void send(WebSocketSession session, Object... typesAndValues) {
		JSONObject jso = new JSONObject();
		int i=0;
		while (i<typesAndValues.length) {
			jso.put(typesAndValues[i].toString(), typesAndValues[i+1]);
			i+=2;
		}
		WebSocketMessage<?> wsMessage=new TextMessage(jso.toString());
		try {
			session.sendMessage(wsMessage);
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
	
	public static synchronized void send(WebSocketSession session, JSONObject jso) {
		WebSocketMessage<?> wsMessage=new TextMessage(jso.toString());
		try {
			session.sendMessage(wsMessage);
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
	
	public static synchronized void send(WebSocketSession session, String type, Object o) {
		try {
			JSONObject jso = new JSONObject(new ObjectMapper().writeValueAsString(o));
			jso.put("type", type);
			WebSocketMessage<?> wsMessage=new TextMessage(jso.toString());
			session.sendMessage(wsMessage);
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
	
	public static synchronized void send(WebSocketSession session, String msg) {
		WebSocketMessage<?> wsMessage=new TextMessage(msg);
		try {
			session.sendMessage(wsMessage);
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
	
	@Override
	public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
		manager.remove(session);
	}
}
