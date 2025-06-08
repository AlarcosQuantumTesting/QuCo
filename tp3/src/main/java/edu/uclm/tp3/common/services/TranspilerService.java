package edu.uclm.tp3.common.services;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import edu.uclm.tp3.Manager;
import edu.uclm.tp3.common.transpilation.DtoTranspilationWork;
import edu.uclm.tp3.common.transpilation.TranspilationTask;
import edu.uclm.tp3.common.transpilation.TranspilationWork;
import edu.uclm.tp3.common.transpilation.TranspiledCircuit;
import edu.uclm.tp3.transpiler.Backend;

@Service
public class TranspilerService {

    @Autowired
    private edu.uclm.tp3.dao.BackendDao backendDao;
    @Autowired
    private edu.uclm.tp3.common.transpilation.TranspilationWorkDao transpilationWorkDao;
    @Autowired
    private edu.uclm.tp3.common.transpilation.TranspiledCircuitDao transpiledCircuitDao;

    private Map<String, TranspilationTask> transpilationTasks = new java.util.HashMap<>();

    public List<Backend> getBackends() {
        return this.backendDao.findAll();
    }

    public void addBackend(Backend backend) {
        this.backendDao.save(backend);
    }

    public String transpile(String code, String name, List<String> backends) {
        TranspilationTask tw = new TranspilationTask(this, code, name, backends, this.transpilationWorkDao, this.transpiledCircuitDao);
        this.transpilationTasks.put(tw.getId(), tw);
        Thread t = new Thread(tw);
        t.start();
        return tw.getId();
    }

    public void cancelTranspilation(String id) {
        TranspilationTask tw = this.transpilationTasks.get(id);
        if (tw!=null) {
            tw.stop();
            this.transpilationTasks.remove(id);
        }
        this.transpilationWorkDao.deleteById(id);
    }    

    public TranspilationWork getTranspilationWork(String id) {
        return this.transpilationWorkDao.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Transpilation work not found with id: " + id));
    }

    public List<TranspiledCircuit> getTranspiledCircuits(String id) {
        return this.transpiledCircuitDao.findByParentWorkId(id);
    }

    public List<DtoTranspilationWork> getListOfTranspilationWorks() {
        List<DtoTranspilationWork> result = new java.util.ArrayList<>();
        List<TranspilationWork> ttww = this.transpilationWorkDao.getListOfTranspilationWorks();
        for (TranspilationWork tw : ttww) {
            DtoTranspilationWork dto = new DtoTranspilationWork();
            dto.setId(tw.getId());
            dto.setName(tw.getName());
            dto.setCreationDateTime(tw.getCreationDateTime());
            dto.setProgress(tw.getProgress());
            List<String> backends = tw.getBackends();
            for (String backend : backends) {
                TranspiledCircuit tc = this.transpiledCircuitDao.findByParentWorkIdAndBackend(tw.getId(), backend);
                DtoStatusLine dtoStatusLine = new DtoStatusLine();
                dtoStatusLine.setBackend(backend);
                if (tc!=null) {
                    dtoStatusLine.setId(tc.getId());
                    if (tc.getErrors() != null) {
                        dtoStatusLine.setHasErrors(true);
                    } else {
                        dtoStatusLine.setHasErrors(false);
                    }
                    dtoStatusLine.setTime(tc.getTime());
                    dtoStatusLine.setFinished(true);
                } 
                dto.addStatusLine(dtoStatusLine);
            }
            result.add(dto);
        }
        return result;
    }

    public String getTranspiledCode(String id) {
       return this.transpiledCircuitDao.findById(id).get().getCode();
    }

    public String getErrors(String id) {
       return this.transpiledCircuitDao.findById(id).get().getErrors();
    }

    public void removeTask(String id) {
       this.transpilationTasks.remove(id);
    }

    public byte[] draw(String id) {
       	try {
            JSONObject jsoConf = Manager.get().getConfiguration();
            String outputDirectory = jsoConf.getString("output directory");
            outputDirectory = outputDirectory + File.separator + "transpiled" + File.separator;
            new File(outputDirectory).mkdirs(); // Asegura que el directorio exista
            this.ensureDrawerScriptPresent(outputDirectory);

			Optional<TranspiledCircuit> opt = this.transpiledCircuitDao.findById(id);
			if (!opt.isPresent())
				throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Transpiled circuit not found with id: " + id);

			TranspiledCircuit tc = opt.get();
			// 1. Crear archivo temporal con el código
			File circuitFile = new File(outputDirectory + id + ".py");
			try (FileWriter writer = new FileWriter(circuitFile)) {
				writer.write(tc.getCode());
			}
            File outputFile = new File(outputDirectory + id + ".output.txt");
            File errorsFile = new File(outputDirectory + id + ".errors.txt");
            
			// 2. Ejecutar script Python
            JSONArray jsaCommands = jsoConf.getJSONArray("commands");
            jsaCommands.put("drawer.py"); 

            List<String> commands = new ArrayList<>();
            for (int i = 2; i < jsaCommands.length(); i++) 
                commands.add(jsaCommands.getString(i));
            commands.add(circuitFile.getAbsolutePath());

			ProcessBuilder pb = new ProcessBuilder(commands);
            Map<String, String> env = pb.environment();
            env.clear();
            env.put("path", jsoConf.getString("path"));
            pb.redirectOutput(outputFile);
            pb.redirectError(errorsFile);
			pb.directory(new File(outputDirectory));
			pb.inheritIO();
			Process process = pb.start();
			int exitCode = process.waitFor();
			if (exitCode != 0)
				throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Transpiled circuit not found with id: " + id);

			// 3. Leer la imagen resultante
			File imgFile = new File(circuitFile.getAbsolutePath() + ".svg");
			byte[] imgBytes = Files.readAllBytes(imgFile.toPath());

			return imgBytes;

		} catch (Exception e) {
			e.printStackTrace();
			throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Transpiled circuit not found with id: " + id);
		}
    }

    private void ensureDrawerScriptPresent(String outputDirectory) {
        try {
            File drawer = new File(outputDirectory, "drawer.py");
            
            if (!drawer.exists()) {
                // Ruta al recurso dentro de resources/
                InputStream input = getClass().getClassLoader().getResourceAsStream("drawer.py");
                if (input == null) {
                    throw new IOException("No se encuentra drawer.py en el classpath (resources).");
                }
                Files.copy(input, drawer.toPath(), StandardCopyOption.REPLACE_EXISTING);
                drawer.setExecutable(true);
            }
        } catch (IOException e) {
            e.printStackTrace();
            throw new RuntimeException("Error al copiar drawer.py al directorio temporal", e);
        }
    }
}
