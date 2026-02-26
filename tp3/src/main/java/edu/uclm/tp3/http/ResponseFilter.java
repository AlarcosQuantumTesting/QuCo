package edu.uclm.tp3.http;

import edu.uclm.tp3.common.model.QucoRequest;
import edu.uclm.tp3.common.services.RequestsService;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.net.InetAddress;

@Component
public class ResponseFilter extends OncePerRequestFilter {

    @Autowired
    private RequestsService service;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // CORS (tu código original)
        if (request.getHeader("origin") != null) {
            response.setHeader("Access-Control-Allow-Origin", request.getHeader("origin"));
            response.setHeader("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,UPDATE,OPTIONS");
            response.setHeader("Access-Control-Allow-Credentials", "true");
            response.setHeader("Access-Control-Allow-Headers", "content-type");
        }

        // Guardado en background
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }

        if (!isPrivateIP(ip)) {
            final String ipFinal = ip;
            final String userAgent = request.getHeader("User-Agent");
            final String uri = request.getRequestURI();

            new Thread(() -> {
                try {
                    HttpClient client = new HttpClient();
                    String responseJson = client.sendGet("http://ip-api.com/json/" + ipFinal, null);
                    JSONObject locationInfo = new JSONObject(responseJson);

                    String country = locationInfo.optString("country", "");
                    String location = locationInfo.toString();

                    QucoRequest requestLog = new QucoRequest();
                    requestLog.setIp(ipFinal);
                    requestLog.setUserAgent(userAgent);
                    requestLog.setUri(uri);
                    requestLog.setInfo(""); // si no tienes Map info, dejamos vacío
                    requestLog.setCountry(country);
                    requestLog.setLocation(location);

                    service.save(requestLog);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }).start();
        }

        // continuar con la request normalmente
        filterChain.doFilter(request, response);
    }

    private static boolean isPrivateIP(String ipAddress) {
        try {
            InetAddress inetAddress = InetAddress.getByName(ipAddress);
            byte[] addr = inetAddress.getAddress();

            int firstByte = Byte.toUnsignedInt(addr[0]);
            int secondByte = Byte.toUnsignedInt(addr[1]);

            if (firstByte == 0 || firstByte == 10) return true;
            if (firstByte == 172 && secondByte >= 16 && secondByte <= 31) return true;
            if (firstByte == 192 && secondByte == 168) return true;
            if (firstByte == 127) return true;
            if (firstByte == 169 && secondByte == 254) return true;

        } catch (Exception e) {
            return false;
        }

        return false;
    }
}
