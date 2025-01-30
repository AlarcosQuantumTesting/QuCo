package edu.uclm.tp3.parallel;

import edu.uclm.tp3.http.TextLogger;

public class TaskScheduler {
	
	private String gt;
	private Task originalTask;
	private TaskReceptor taskReceptor;
	private TaskData data;
	private int threadsPerCore = 2;
	
	public TaskScheduler(String gt) {
		this.gt = gt;
	}

	public void setOriginalTask(Task originalTask) {
		this.originalTask = originalTask;
	}
	
	public void setTaskReceptor(TaskReceptor taskReceptor) {
		this.taskReceptor = taskReceptor;
	}
	
	public void setData(TaskData data) {
		this.data = data;
	}
	
	public void setThreadsPerCore(int threadsPerCore) {
		this.threadsPerCore = threadsPerCore;
	}

	public void run() throws Exception {
		int cores = Runtime.getRuntime().availableProcessors();
		TextLogger.write(gt, "\t\t\t\tTaskScheduler::run: cores = " + cores + "\n");
		cores = this.threadsPerCore * cores;
		
		int numberOfTasks = this.data.size();
		if (numberOfTasks<cores)
			cores = numberOfTasks;
		Thread[] tt = new Thread[cores];
		int chunkSize = cores;
		if (chunkSize==0)
			chunkSize=1;
		TextLogger.write(gt, "\t\t\t\tTaskScheduler::run: chunkSize = " + chunkSize + "\n");
		
		int loops = numberOfTasks/chunkSize;
		TextLogger.write(gt, "\t\t\t\tTaskScheduler::run: numberOfTasks = " + numberOfTasks + "\n");
		TextLogger.write(gt, "\t\t\t\tTaskScheduler::run: loops = " + loops + "\n");
		int cont = 0;
		Class<? extends Task> taskClazz = originalTask.getClass();
		for (int i=0; i<loops; i++) {
			for (int j=0; j<chunkSize; j++) {
				Task task = (Task) taskClazz.getConstructors()[0].newInstance();
				TextLogger.write(gt, "\t\t\t\tTaskScheduler::run: creado taskReceptor de tipo " + task.getClass().getSimpleName() + "\n");
				
				TextLogger.write(gt, "\t\t\t\tTaskScheduler::run: originalTask " + originalTask.getClass().getSimpleName() + "\n");
				TextLogger.write(gt, "\t\t\t\tTaskScheduler::run: data " + data.getData().toString() + "\n");
				task.setTarget(this.taskReceptor);
				task.prepare(originalTask, this.data, cont++);
				TextLogger.write(gt, "\t\t\t\tTaskScheduler::run: preparada taskReceptor de tipo " + task.getClass().getSimpleName() + "\n");
				tt[j] = new Thread(task);
				tt[j].start();
			}
			for (int j=0; j<chunkSize; j++)
				tt[j].join();
		}
		
		if (cores==0)
			cores = 1;
		chunkSize = numberOfTasks%cores;
		for (int j=0; j<chunkSize; j++) {
			Task task = (Task) taskClazz.getConstructors()[0].newInstance();
			TextLogger.write(gt, "\t\t\t\tTaskScheduler::run: creado taskReceptor de tipo " + task.getClass().getSimpleName() + "\n");
			task.setTarget(this.taskReceptor);
			
			TextLogger.write(gt, "\t\t\t\tTaskScheduler::run: originalTask " + originalTask.getClass().getSimpleName() + "\n");
			TextLogger.write(gt, "\t\t\t\tTaskScheduler::run: data " + data.getData().toString() + "\n");
			task.prepare(originalTask, this.data, cont++);
			TextLogger.write(gt, "\t\t\t\tTaskScheduler::run: preparada taskReceptor de tipo " + task.getClass().getSimpleName() + "\n");
			tt[j] = new Thread(task);
		}
		for (int j=0; j<chunkSize; j++)
			tt[j].join();
	}
	
}
