package edu.uclm.tp3.ws;

import java.io.IOException;

import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import edu.uclm.tp3.elonging.strategies.ManagerService;

public class HWSession {

	private String httpSessionId;
	private WebSocketSession session;
	private ManagerService manager;

	public HWSession(ManagerService manager, String httpSessionId, WebSocketSession session) {
		this.manager = manager;
		this.httpSessionId = httpSessionId;
		this.session = session;
	}

	public String getHttpSessionId() {
		return httpSessionId;
	}

	public WebSocketSession getSession() {
		return session;
	}

	public synchronized void send(String msg) {
		TextMessage tm = new TextMessage(msg); 
		try {
			this.session.sendMessage(tm);
		} catch (IOException e) {
			this.manager.remove(this);
		}
	}


}
