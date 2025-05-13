package edu.uclm.tp3.common.services;

import edu.uclm.tp3.common.gates.T;
import edu.uclm.tp3.common.model.QucoRequest;
import edu.uclm.tp3.dao.QucoRequestDao;

import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class RequestsService {

    @Autowired
    private QucoRequestDao qucoRequestDao;

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
                String ip = req.getRemoteAddr();
                String userAgent = req.getHeader("User-Agent");
                QucoRequest request = new QucoRequest();
                request.setIp(ip);
                request.setUserAgent(userAgent);
                request.setUri(req.getRequestURI());
                request.setInfo(new JSONObject(info).toString());
                qucoRequestDao.save(request);
            }
        }.start();

    }

}
