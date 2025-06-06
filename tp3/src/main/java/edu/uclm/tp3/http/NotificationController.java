package edu.uclm.tp3.http;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
public class NotificationController {

    @Autowired
    private SseEmitters emitters;

    @GetMapping("/sse")
    public SseEmitter streamGeneticMessages() {
        return emitters.addEmitter();
    }
}
