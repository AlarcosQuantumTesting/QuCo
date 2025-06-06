package edu.uclm.tp3.qiskit;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;

import edu.uclm.tp3.Manager;
import edu.uclm.tp3.common.model.Circuit;
import edu.uclm.tp3.common.utils.Files;
import edu.uclm.tp3.http.TextLogger;

public class QiskitSimpleRunner implements Runnable {
	
	private String fileName;
	private int outputQubits;
	private QiskitRunner runner;
	private int fileIndex;

	public QiskitSimpleRunner(QiskitRunner runner, String fileName, int fileIndex) throws IOException {
		this.runner = runner;
		this.outputQubits = this.runner.getOutputQubits();
		this.fileName = fileName;
		this.fileIndex = fileIndex;
		TextLogger.write(this.runner.getGt(), 6, "QiskitSimpleRunner(runner, fileName=" + fileName + ", fileIndex="+ fileIndex + ")\n");
	}

	@Override
	public void run() {
		try {
			TextLogger.write(this.runner.getGt(), 6, "run()\n");
			int circuitLength = 0;
			//if (fitnesser!=null && fitnesser.isCircuitLengthRequired()) {
				String circFileName = this.fileName.substring(0, this.fileName.length()-2) + "circ";
				circFileName = this.runner.getProcessDirectory() + circFileName;
				Circuit circuit = Files.readCircuit(circFileName);
				circuitLength = circuit.getGates().size();
			//}
			
			TextLogger.write(this.runner.getGt(), 7, "circFileName=" + circFileName + "\n");
			TextLogger.write(this.runner.getGt(), 7, "circuitLength=" + circuitLength + "\n");
			int returnCode = 0;
			
			JSONObject jsoConf = Manager.get().getConfiguration();
			
			boolean joinLastCommand = jsoConf.optBoolean("joinLastCommand");
			boolean inheritIO = jsoConf.optBoolean("inheritIO");
			
			JSONArray jsaCommands = jsoConf.getJSONArray("commands");
			
			String[] commands;
			if (joinLastCommand)
				commands = new String[jsaCommands.length()];
			else
				commands = new String[jsaCommands.length()+1];
			
			for (int i=0; i<commands.length; i++) 
				commands[i] = jsaCommands.getString(i);
			
			if (joinLastCommand)
				commands[commands.length-1] = commands[commands.length-1] + " \"" + fileName + "\"";
			else
				commands[commands.length] = "\"" + fileName + "\"";
			
			String cLog = "";
			for (int i=0; i<commands.length; i++)
				cLog = cLog + commands[i] + " ";
			TextLogger.write(this.runner.getGt(), 7, "commands=" + cLog + "\n");
			
			ProcessBuilder pb = new ProcessBuilder();
			
			if (inheritIO)
				pb.inheritIO();
			Map<String, String> env = pb.environment();
			env.clear();
			env.put("path", jsoConf.getString("path"));
			env.put("PYTHONPATH", jsoConf.optString("PYTHONPATH"));
			
			TextLogger.write(this.runner.getGt(), 8, "env.path=" + env.get("path") + "\n");
			
			File outputFile = new File(this.runner.getProcessDirectory() + this.fileName + ".output.txt");			
			pb.redirectOutput(outputFile);
			TextLogger.write(this.runner.getGt(), 8, "outputFile=" + outputFile.getAbsolutePath() + "\n");
			
			File errorsFile = new File(this.runner.getProcessDirectory() + this.fileName + ".errors.txt");
			pb.redirectError(errorsFile);
			TextLogger.write(this.runner.getGt(), 8, "errorsFile=" + errorsFile.getAbsolutePath() + "\n");

			pb.directory(new File(this.runner.getProcessDirectory()));
			TextLogger.write(this.runner.getGt(), 8, "processDirectory=" + this.runner.getProcessDirectory() + "\n");
			pb.command(commands);
			
			try {
				TextLogger.write(this.runner.getGt(), 8, "Lo lanzamos " + cLog + "\n");
				Process process = pb.start();
				TextLogger.write(this.runner.getGt(), 8, "Se ha lanzado " + cLog + "\n");
				returnCode=process.waitFor();
			} catch (Exception e) {
				TextLogger.write(this.runner.getGt(), "\t\t\t\t\tHubo excepción comando=" + e.toString() + "\n");
				e.printStackTrace();
				return;
			}
			
			TextLogger.write(this.runner.getGt(), 4, "returnCode=" + returnCode + "\n");
			
			List<Integer> obtainedFrequencies = new ArrayList<>();
			if (returnCode==0) {
				try(FileReader fr=new FileReader(outputFile)) {  
					try(BufferedReader br=new BufferedReader(fr)) {
						int max = (int) Math.pow(2, outputQubits);
						ArrayList<JSONObject> results = new ArrayList<>();
						JSONObject jso;
						for (int i=0; i<max; i++) {
							jso = new JSONObject();
							jso.put("order", i);
							jso.put("frequency", 0);
							results.add(jso);
							obtainedFrequencies.add(0);
						}
						TextLogger.write(this.runner.getGt(), 5, "results=" + results.toString() + "\n");

						String line=br.readLine();
						String[] tokens = line.split(",");
						TextLogger.write(this.runner.getGt(), 5, "line=" + line + ", hay " + tokens.length + " tokens\n");
						for (int i=0; i<tokens.length; i++) 
							TextLogger.write(this.runner.getGt(), 6, "tokens[" + i + "]=" + tokens[i] + "\n");
										
						for (int i=0; i<tokens.length; i++) {
							int posDosPuntos = tokens[i].indexOf(':');
							TextLogger.write(this.runner.getGt(), 6, "posDosPuntos=" + posDosPuntos + "\n");
							String sOrder = tokens[i].substring(1, posDosPuntos);
							//TextLogger.write(this.runner.getGt(), 6, "tokens=" + tokens[0] + ", " + tokens[1] + "\n");
							String sFrequency = tokens[i].substring(posDosPuntos+1, tokens[i].length()-1);
							TextLogger.write(this.runner.getGt(), 6, "sOrder=" + sOrder + ", sFrequency=" + sFrequency + "\n");
							jso = new JSONObject();
							int order = Integer.parseInt(sOrder);
							jso.put("order", order);
							jso.put("frequency", Integer.parseInt(sFrequency));
							results.set(order, jso);
							obtainedFrequencies.set(order, Integer.parseInt(sFrequency));
						}
					}
				} catch (Exception e) {
					System.err.println("Error con el fichero: " + this.fileName);
				} 
			}

		//outputFile.delete();
		//	errorsFile.delete();
			
			QiskitSimpleRunner.this.runner.setResults(fileIndex, obtainedFrequencies, circuitLength);
		} catch (Exception e) {
			e.printStackTrace();
		}
		
	}
}
