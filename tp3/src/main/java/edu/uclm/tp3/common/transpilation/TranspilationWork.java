package edu.uclm.tp3.common.transpilation;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.json.JSONArray;
import org.json.JSONObject;

import edu.uclm.tp3.Manager;

public class TranspilationWork implements Runnable {

    private String code;
    private String name;
    private List<String> backends;
    private String id;
    private String tempFilePath;

    public TranspilationWork(String code, String name, List<String> backends) {
        this.id = UUID.randomUUID().toString();
        this.code = code;
        this.name = name;
        this.backends = backends;

        this.saveCode();
    }

    private void saveCode() {
        ensureTranspileScriptPresent();
        try {
            // Crea archivo temporal con nombre aleatorio que termina en .py
            File tempFile = File.createTempFile("code_" + this.id, ".py");
            try (FileWriter writer = new FileWriter(tempFile)) {
                writer.write(code);
            }
            this.tempFilePath = tempFile.getAbsolutePath(); // Guarda la ruta si la necesitas después
        } catch (IOException e) {
            e.printStackTrace();
            // Podrías lanzar una excepción o manejar el error según tus necesidades
        }
    }

    public String getId() {
        return id;
    }

    @Override
    public void run() {
        JSONObject jsoConf = Manager.get().getConfiguration();
			
        boolean inheritIO = jsoConf.optBoolean("inheritIO");
        
        JSONArray jsaCommands = jsoConf.getJSONArray("commands");
        
        String[] commands = new String[jsaCommands.length()+2];
        
        for (int i=0; i<jsaCommands.length(); i++) 
            commands[i] = jsaCommands.getString(i);

        commands[jsaCommands.length()] = "transpile.py";
        commands[jsaCommands.length()+1] = this.tempFilePath;
        
        String cLog = "";
        for (int i=0; i<commands.length; i++)
            cLog = cLog + commands[i] + " ";
        
        ProcessBuilder pb = new ProcessBuilder();
        
        if (inheritIO)
            pb.inheritIO();
        Map<String, String> env = pb.environment();
        env.clear();
        env.put("path", jsoConf.getString("path"));
        env.put("PYTHONPATH", jsoConf.optString("PYTHONPATH"));
    }

    private void ensureTranspileScriptPresent() {
        try {
            File tmpDir = new File(System.getProperty("java.io.tmpdir"));
            File transpileCopy = new File(tmpDir, "transpile.py");
            
            if (!transpileCopy.exists()) {
                // Ruta al recurso dentro de resources/
                File resourceFile = new File("resources/transpile.py");
                if (!resourceFile.exists()) {
                    throw new IOException("No se encuentra el archivo transpile.py en resources/");
                }

                try (
                    FileWriter writer = new FileWriter(transpileCopy);
                    java.util.Scanner scanner = new java.util.Scanner(resourceFile)
                ) {
                    while (scanner.hasNextLine()) {
                        writer.write(scanner.nextLine() + System.lineSeparator());
                    }
                }
                transpileCopy.setExecutable(true);
            }
        } catch (IOException e) {
            e.printStackTrace();
            throw new RuntimeException("Error al copiar transpile.py al directorio temporal", e);
        }
    }
}
