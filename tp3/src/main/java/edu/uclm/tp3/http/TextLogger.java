package edu.uclm.tp3.http;

import java.io.FileOutputStream;

import edu.uclm.tp3.common.services.EvolutionaryService;

public class TextLogger {
	
	public static boolean DEBUG = false;

	public static void write(String gt, String text) {
		if (!DEBUG)
			return;
		try(FileOutputStream fos = new FileOutputStream(EvolutionaryService.generationFolder(gt) + "log.txt", true)) {
			System.out.print(text);
			fos.write(text.getBytes());
		} catch (Exception e) {
			// TODO: handle exception
		}
	}
	
	public static void write(String gt, int tabs, String text) {
		if (!DEBUG)
			return;
		try(FileOutputStream fos = new FileOutputStream(EvolutionaryService.generationFolder(gt) + "log.txt", true)) {
			StringBuilder sbTabs = new StringBuilder();
			for (int i=0; i<tabs; i++)
				sbTabs = sbTabs.append("\t");
			sbTabs.append(text);
			fos.write(sbTabs.toString().getBytes());
		} catch (Exception e) {
			// TODO: handle exception
		}
	}
}
