package edu.uclm.tp3.elonging.strategies;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;
import org.springframework.web.socket.WebSocketSession;

import edu.uclm.tp3.common.model.Pair;
import edu.uclm.tp3.ws.HWSession;
import jakarta.servlet.http.HttpSession;

@Service
public class ManagerService {
	
	private List<Pair> bestIndividuals = new ArrayList<>();

	private Map<String, HWSession> hwSessionsByHttpSessionId = new ConcurrentHashMap<>();
	private Map<String, HWSession> hwSessionsByWSSessionId = new ConcurrentHashMap<>();
	
	public void put(HWSession hwSession) {
		this.hwSessionsByHttpSessionId.put(hwSession.getHttpSessionId(), hwSession);
		this.hwSessionsByWSSessionId.put(hwSession.getSession().getId(), hwSession);
	}
	
	public synchronized HWSession get(String httpSessionId) {
		return this.hwSessionsByHttpSessionId.get(httpSessionId);
	}

	public void remove(HWSession hwSession) {
		this.hwSessionsByHttpSessionId.remove(hwSession.getHttpSessionId());
		this.hwSessionsByWSSessionId.remove(hwSession.getSession().getId());
	}
	
	public void remove(WebSocketSession wsSession) {
		HWSession hwSession = this.hwSessionsByWSSessionId.remove(wsSession.getId());
		this.hwSessionsByHttpSessionId.remove(hwSession.getHttpSessionId());
	}
	
	public HWSession get(HttpSession session) {
		return this.get(session.getId());
	}
	
	public List<Pair> getBestIndividuals() {
		return bestIndividuals;
	}
	
	public void add(Pair individual) {
		this.bestIndividuals.add(individual);
	}
	
	public void sort() {
		Collections.sort(this.bestIndividuals);
	}
}
