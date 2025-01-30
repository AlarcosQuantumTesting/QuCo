package edu.uclm.tp3.genetic.fitnessers;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

import org.reflections.Reflections;
import org.springframework.stereotype.Service;

@Service
public class FitnessersService {

	private List<Class<? extends Fitnesser>> fitnesserClasses;
	
	public FitnessersService() {
		this.loadFitnessers();
	}

	private void loadFitnessers() {
		Reflections reflections = new Reflections("edu.uclm.tp3.genetic.fitnessers");
		fitnesserClasses = new ArrayList<>();
		
		Iterator<Class<? extends Fitnesser>> classes = reflections.getSubTypesOf(Fitnesser.class).iterator();
		while (classes.hasNext()) 
			fitnesserClasses.add(classes.next());
	}
	
	public List<Class<? extends Fitnesser>> getFitnesserClasses() {
		return fitnesserClasses;
	}

	public Fitnesser getInstance(String fitnesserName) throws Exception {
		for (int i=0; i<this.fitnesserClasses.size(); i++)
			if (this.fitnesserClasses.get(i).getSimpleName().equals(fitnesserName)) {
				Fitnesser fitnesser = this.fitnesserClasses.get(i).getConstructor().newInstance();
				fitnesser.setIndex(i);
				return fitnesser;
			}
		return null;
	}
}
