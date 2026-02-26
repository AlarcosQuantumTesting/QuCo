package edu.uclm.tp3;

import jakarta.servlet.ServletContextEvent;
import jakarta.servlet.ServletContextListener;
import jakarta.servlet.annotation.WebListener;

import com.mysql.cj.jdbc.AbandonedConnectionCleanupThread;

@WebListener
public class Listener implements ServletContextListener {

    @Override
    public void contextInitialized(ServletContextEvent sce) {
        System.out.println("TP3 iniciada.");
    }

    @Override
    public void contextDestroyed(ServletContextEvent sce) {
        System.out.println("TP3 detenida, limpiando hilos MySQL...");
        AbandonedConnectionCleanupThread.checkedShutdown();
        System.out.println("Hilos MySQL de TP3 limpiados correctamente.");
    }
}
