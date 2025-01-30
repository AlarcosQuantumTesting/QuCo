package edu.uclm.tp3;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import edu.uclm.tp3.classic.QMatrix;

public class EqSystem {
	private QMatrix u;
	private List<Eq> eqs;
	private Map<ProductKey, Complex> knownVariables;
		
	public EqSystem(QMatrix u) {
		this.u = u;
		this.eqs = new ArrayList<>();
		this.knownVariables = new HashMap<>();
	}

	public void add(Eq eq, int index) {
		if (eq.size()==1) {
			Product p = eq.getProduct(0);
			this.u.set(p.getRow(), p.getCol(), eq.getRight());
			this.knownVariables.put(p.getKey(), eq.getRight());
		} else {
			if (index==-1)
				this.eqs.add(eq);
			else
				this.eqs.add(index, eq);
		}
	}

	public void replaceVariables() {
		Eq eq;
		
		for (int i=this.eqs.size()-1; i>=0; i--) {
			eq = this.eqs.get(i);
			if (this.allVariablesAreKnown(eq, knownVariables)) {
				this.eqs.remove(i);
			} else {
				eq.replaceVariables(this.knownVariables);
				this.eqs.remove(i);
				this.add(eq, i);
			}
		}
	}

	private boolean allVariablesAreKnown(Eq eq, Map<ProductKey, Complex> knownVariables) {
		Product p;
		for (int i=0; i<eq.size(); i++) {
			p = eq.getProduct(i);
			if (!knownVariables.containsKey(p.getKey()))
				return false;
		}
		return true;
	}

	@Override
	public String toString() {
		StringBuilder sb = new StringBuilder();
		for (Eq eq : this.eqs)
			sb.append(eq.toString());
		return sb.toString();
	}

	public boolean isEmpty() {
		return this.eqs.isEmpty();
	}
}
