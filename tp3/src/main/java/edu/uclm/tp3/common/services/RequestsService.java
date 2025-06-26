package edu.uclm.tp3.common.services;

import edu.uclm.tp3.common.model.QucoRequest;
import edu.uclm.tp3.dao.QucoRequestDao;
import edu.uclm.tp3.http.HttpClient;

import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class RequestsService {

    @Autowired
    private QucoRequestDao qucoRequestDao;

    public void save(QucoRequest request) {
        this.qucoRequestDao.save(request);
    }

    public void insert(String ip, String userAgent) {
        QucoRequest request = new QucoRequest();
        request.setIp(ip);
        request.setUserAgent(userAgent);
        this.qucoRequestDao.save(request);
    }

    public void insert(HttpServletRequest req, Map<String, Object> info) {
        new Thread() {
            @Override
            public void run() {
                try {
                    String ip = req.getRemoteAddr();
                    String userAgent = req.getHeader("User-Agent");
                    String uri = req.getRequestURI();
                    String infoJson = new JSONObject(info).toString();

                    HttpClient client = new HttpClient();
                    String responseJson = client.sendGet("http://ip-api.com/json/" + ip, null);
                    JSONObject locationInfo = new JSONObject(responseJson);

                    String country = locationInfo.optString("country", "");
                    String location = locationInfo.toString();

                    QucoRequest request = new QucoRequest();
                    request.setIp(ip);
                    request.setUserAgent(userAgent);
                    request.setUri(uri);
                    request.setInfo(infoJson);
                    request.setCountry(country);
                    request.setLocation(location);

                    qucoRequestDao.save(request);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }.start();
    }
}
