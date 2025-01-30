package edu.uclm.tp3;

import java.io.IOException;

import org.json.JSONObject;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;

import edu.uclm.tp3.http.TextLogger;

@Component
public class Manager {
	private JSONObject configuration;
	
	private Manager() {
		String s;
		try {
			s = Utils.readFileAsString(this, "pythonConf.json.txt");
			JSONObject jso = new JSONObject(s);
			TextLogger.DEBUG = jso.optBoolean("DEBUG");
			String environment = jso.getString("environment");
			for (int i=0; i<jso.getJSONArray("environments").length(); i++) {
				if (jso.getJSONArray("environments").getJSONObject(i).getString("name").equals(environment))
					this.configuration = jso.getJSONArray("environments").getJSONObject(i);
			}
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
	
	public JSONObject getConfiguration() {
		return configuration;
	}
	
	private static class ManagerHolder {
		static Manager singleton=new Manager();
	}
	
	@Bean
	public static Manager get() {
		return ManagerHolder.singleton;
	}
}
