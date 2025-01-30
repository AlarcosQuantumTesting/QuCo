package edu.uclm.tp3.parallel;

public interface Task extends Runnable {

	void prepare(Task originalTask, TaskData taskData, int index);

	void setTarget(TaskReceptor target);

}
