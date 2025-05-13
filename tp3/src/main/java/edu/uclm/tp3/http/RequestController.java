package edu.uclm.tp3.http;

import javax.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import edu.uclm.tp3.common.services.RequestsService;

@RestController
@RequestMapping("qucorequests")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class RequestController {

    @Autowired
    private RequestsService service;

    @GetMapping("/get")
    public void get(HttpServletRequest request) {
        String ip = request.getRemoteAddr();
        String userAgent = request.getHeader("User-Agent");
        service.insert(ip, userAgent);
    }
}

