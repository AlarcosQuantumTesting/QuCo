package edu.uclm.tp3.common.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

import jakarta.persistence.Column;
import java.time.LocalDateTime;

@Entity
public class QucoRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;
    
    private String ip;
    private String userAgent;

    @Column(nullable = false, updatable = false)
    private LocalDateTime time;

    @Column(columnDefinition = "TEXT")
    private String info;

    private String uri;

    private String country;  // NUEVO CAMPO

    @Column(columnDefinition = "TEXT")
    private String location; // NUEVO CAMPO

    public QucoRequest() {
         this.time = LocalDateTime.now();
    }

    public int getId() {
        return id;
    }

    public String getIp() {
        return ip;
    }

    public void setIp(String ip) {
        this.ip = ip;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
    }

    public LocalDateTime getTime() {
        return time;
    }

    public void setUri(String uri) {
        this.uri = uri;
    }

    public void setInfo(String info) {
        this.info = info;
    }

    public String getInfo() {
        return info;
    }

    public String getUri() {
        return uri;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getCountry() {  // GETTER
        return country;
    }

    public void setCountry(String country) {  // SETTER
        this.country = country;
    }

    public String getLocation() {  // GETTER
        return location;
    }

    public void setLocation(String location) {  // SETTER
        this.location = location;
    }
}
