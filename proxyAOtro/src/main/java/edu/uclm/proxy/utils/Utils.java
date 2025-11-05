package edu.uclm.proxy.utils;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public class Utils {
	
	private static final String home = System.getProperty("user.home").replace('\\', '/');

	public static String readFileAsString(Object o, String fileName) throws IOException {
		ClassLoader classLoader = o.getClass().getClassLoader();
		 try (InputStream fis = classLoader.getResourceAsStream(fileName)) {
			byte[] b = new byte[fis.available()];
			fis.read(b);
			String s = new String(b);
			return s;
		 }
	}
	
	public static boolean createFolder(String db) {
		String workingFolder = home + '/' + db + '/';
		return new File(workingFolder).mkdirs();
	}
	
	public static String getFolder(String folder) {
		File f = new File(folder);
		if (!f.exists())
			f.mkdirs();
		return folder;
	}
	
	public static String getFolder(String db, String collection) {
		String folder = home + '/' + db + '/' + collection + '/';
		return getFolder(folder);
	}
	
	public static File getFile(String folder, String fileName) {
		File f = new File(folder + fileName);
		if (f.exists())
			return f;
		try {
			f.createNewFile();
		} catch (IOException e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, folder + fileName + " could not be created");
		}
		return f;
	}

	public static File getFile(String db, String collection, String fileName) {
		String folder = getFolder(db, collection);
		File f = new File(folder + fileName);
		if (f.exists())
			return f;
		try {
			f.createNewFile();
		} catch (IOException e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, folder + fileName + " could not be created");
		}
		return f;
	}

	public static String getPath(File file) {
		String fileName = file.getAbsolutePath();
		if (fileName.endsWith("/"))
			return fileName;
		return fileName + '/';
	}

	public static String[] getFileNames(String folder, String extension) {
		return new File(folder).list((dir, name) -> name.endsWith(extension));
	}
}
