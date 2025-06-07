package edu.uclm.tp3.common.transpilation;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.json.JSONArray;
import org.json.JSONObject;

import edu.uclm.tp3.Manager;

public class TranspilationTask implements Runnable {

    private String code;
    private String name;
    private List<String> backends;
    private String id;
    private String outputDirectory;
    private JSONObject jsoConf;
    private File sourceFile;
    private File outputFile;
    private File errorsFile;
    private TranspilationWork work;
    private TranspilationWorkDao transpilationWorkDao;
    private TranspiledCircuitDao transpiledCircuitDao;

    public TranspilationTask(String code, String name, List<String> backends, TranspilationWorkDao transpilationWorkDao, TranspiledCircuitDao transpiledCircuitDao) {
        this.id = UUID.randomUUID().toString();
        this.code = code;
        this.name = name;
        this.backends = backends;
        this.jsoConf = Manager.get().getConfiguration();

        this.outputDirectory = jsoConf.getString("output directory");
        this.outputDirectory = this.outputDirectory + File.separator + "transpiled" + File.separator;
        new File(this.outputDirectory).mkdirs(); // Asegura que el directorio exista
        this.saveCode();
        this.work = new TranspilationWork(this.id, this.name, this.code, this.backends);
        this.transpilationWorkDao = transpilationWorkDao;
        this.transpilationWorkDao.save(this.work);
        this.transpiledCircuitDao = transpiledCircuitDao;
    }

    @Override
    public void run() {
        JSONObject jsoConf = Manager.get().getConfiguration();
        boolean inheritIO = jsoConf.optBoolean("inheritIO");
        JSONArray jsaCommands = jsoConf.getJSONArray("commands");

        File transpileScript = new File(outputDirectory + "transpile.py");

        List<String> baseCommand = new ArrayList<>();
        for (int i = 2; i < jsaCommands.length(); i++) 
            baseCommand.add(jsaCommands.getString(i));
        
        baseCommand.add(transpileScript.getAbsolutePath());
        baseCommand.add(this.sourceFile.getAbsolutePath());

        for (String backend : this.backends) {
            List<String> fullCommand = new ArrayList<>(baseCommand);
            fullCommand.add(backend);

            ProcessBuilder pb = new ProcessBuilder(fullCommand);
            if (inheritIO) 
                pb.inheritIO(); // útil para depuración directa

            Map<String, String> env = pb.environment();
            env.clear();
            env.put("path", jsoConf.getString("path"));
			pb.redirectOutput(this.outputFile);
			pb.redirectError(this.errorsFile);

			pb.directory(new File(this.outputDirectory));
			pb.command(fullCommand);
			
            long time = System.currentTimeMillis();
            String errors = null;
			try {
				Process process = pb.start();
				process.waitFor();
                int returnCode = process.exitValue();
                if (returnCode != 0) {
                    errors = new String(Files.readAllBytes(this.errorsFile.toPath())) + "\n" +
                        new String(Files.readAllBytes(this.outputFile.toPath()));
                }
			} catch (Exception e) {
				e.printStackTrace();
				return;
			}
            
            TranspiledCircuit tp = new TranspiledCircuit();
            tp.setTranspilationWork(this.work);
            tp.setBackend(backend);
            tp.setTranspilationTime(System.currentTimeMillis() - time);
            String transpiledCode = this.read(backend);
            tp.setCode(transpiledCode);
            if (errors!=null)
                tp.setErrors(errors.trim());
            this.transpiledCircuitDao.save(tp);
            this.work.setProgress(this.work.getProgress() + 1);
            this.transpilationWorkDao.save(this.work);
            File transpiledFile = new File(this.outputDirectory + this.id + "." + backend + ".py");
            if (transpiledFile.exists()) 
                transpiledFile.delete(); // Eliminar el archivo transpileado después de procesar
        }
        this.errorsFile.delete(); // Limpiar el archivo de errores después de procesar
        this.outputFile.delete(); // Limpiar el archivo de salida después de procesar  
        this.sourceFile.delete(); // Limpiar el archivo fuente después de procesar
    }
    private String read(String backend) {
        try {
            String filePath = this.outputDirectory + this.id + "." + backend + ".py";
            if (!new File(filePath).exists()) 
                return null; 
            return new String(Files.readAllBytes(new File(filePath).toPath()));
        } catch (IOException e) {
            e.printStackTrace();
            return null; // O maneja el error de otra manera según tus necesidades
        }
    }

    private void ensureTranspileScriptPresent() {
        try {
            File transpileCopy = new File(this.outputDirectory, "transpile.py");
            
            if (!transpileCopy.exists()) {
                // Ruta al recurso dentro de resources/
                InputStream input = getClass().getClassLoader().getResourceAsStream("transpile.py");
                if (input == null) {
                    throw new IOException("No se encuentra transpile.py en el classpath (resources).");
                }
                Files.copy(input, transpileCopy.toPath(), StandardCopyOption.REPLACE_EXISTING);
                transpileCopy.setExecutable(true);
            }
        } catch (IOException e) {
            e.printStackTrace();
            throw new RuntimeException("Error al copiar transpile.py al directorio temporal", e);
        }
    }

    private void saveCode() {
        ensureTranspileScriptPresent();
        try {
            this.sourceFile = new File(this.outputDirectory + this.id + ".py");
            this.outputFile = new File(this.outputDirectory + this.id + ".output.txt");
            this.errorsFile = new File(this.outputDirectory + this.id + ".errors.txt");
            try (FileWriter writer = new FileWriter(this.sourceFile)) {
                writer.write(code);
            }
        } catch (IOException e) {
            e.printStackTrace();
            // Podrías lanzar una excepción o manejar el error según tus necesidades
        }
    }

    public String getId() {
        return id;
    }
}
