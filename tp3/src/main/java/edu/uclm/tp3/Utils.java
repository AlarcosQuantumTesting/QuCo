package edu.uclm.tp3;

import java.io.IOException;
import java.io.InputStream;

public class Utils {

	public static String readFileAsString(Object o, String fileName) throws IOException {
		ClassLoader classLoader = o.getClass().getClassLoader();
		 try (InputStream fis = classLoader.getResourceAsStream(fileName)) {
			byte[] b = new byte[fis.available()];
			fis.read(b);
			String s = new String(b);
			return s;
		 }
	}
}
