package edu.uclm.tp3.common.deterministic;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import edu.uclm.tp3.common.gates.CRY;
import edu.uclm.tp3.common.gates.H;
import edu.uclm.tp3.common.gates.Identity;
import edu.uclm.tp3.common.gates.RY;
import edu.uclm.tp3.common.gates.X;
import edu.uclm.tp3.common.model.Circuit;
import edu.uclm.tp3.sparse.QMatrix;

public class MatrixSolver extends Solver {

	private int depth;
	
	public MatrixSolver(BinaryTree tree, Circuit circuit) {
		super(tree, circuit);
	}

	@Override
		public Map<String, Object> solve(int shots) throws IOException {
			this.depth = this.tree.getDepth();
			
			MatrixCircuit mc = new MatrixCircuit();
			if (this.depth == 1) {
				QMatrix matrix = this.getRY(0, this.tree.leftAngle);
				mc.add(matrix);
			} else if (this.depth==2) {
				mc.add(this.buildLeaf(this.tree, 0));
			} else {
				mc.add(this.buildGeneral(this.tree, 0));
			}
	
			Map<String, Object> result = new HashMap<>();
			result.put("#QUBITS#", this.circuit.getQubits());
			result.put("#OUTPUT_QUBITS#", this.circuit.getQubits());
			result.put("#SHOTS#", shots);
			
			StringBuilder h = this.getCode("H", this.getInitialize());
			StringBuilder u = this.getCode("U", QMatrix.multiply(mc.getMatrixes()));
			result.put("#INITIALIZE#", h.toString() + "\n" + u.toString() + "\n");
			
			String calculus = "circuit.unitary(H, qreg)\ncircuit.unitary(U, qreg)\n";
			result.put("#CALCULUS#", calculus);
			result.put("#MEASURES#", this.getMeasures(this.circuit.getQubits()));
			result.put("tree", this.tree.toMap());
			return result;
		}
	
	private StringBuilder getCode(String name, QMatrix matrix) {
		StringBuilder code = new StringBuilder(name + " = Operator([");
		code.append(matrix.toStringBuilder(true));
		code.append("])\n");
		return code;
	}

	private QMatrix buildGeneral(BinaryTree node, int startQubit) {
		QMatrix ry = null, x=null, cryLeft = null, cryRight = null;
		
		if (this.depth-startQubit==2)
			return this.buildLeaf(node, startQubit);
		
		if (node.leftAngle!=0) {
			ry = this.getRY(0, node.leftAngle);
			QMatrix id = new Identity().getMatrix();
			x = new X().setQubit(startQubit).getMatrix();
			for (int i=startQubit+1; i<this.depth; i++) {
				ry = ry.tp(id);
				x = x.tp(id);
			}
		}

		if (node.leftChild!=null) {
			cryLeft = this.buildGeneral(node.leftChild, startQubit+1);
			cryLeft = cryLeft.control();
		}
		
		if (node.rightChild!=null) {
			cryRight = this.buildGeneral(node.rightChild, startQubit+1);
			cryRight = cryRight.control();
		}
		
		return QMatrix.multiply(ry, x, cryLeft, x, cryRight);
	}

	private QMatrix buildLeaf(BinaryTree node, int startQubit) {
		QMatrix ry = this.getRY(startQubit, node.leftAngle);
		if (ry!=null)
			ry = ry.tp(new Identity().getMatrix());
		
		QMatrix cryLeft = this.getCRYs(startQubit, node);
		
		return QMatrix.multiply(ry, cryLeft);
	}

	private QMatrix getInitialize() {
		QMatrix matrix = new H().getMatrix();
		for (int i=1; i<this.depth; i++)
			matrix = matrix.tp(new H().getMatrix());
		return matrix;
	}
	
	private QMatrix getCRYs(int startQubit, BinaryTree node) {
		if (node.leftChild==null)
			return null;
		
		QMatrix x = new X().setQubit(startQubit).getMatrix();
		x = x.tp(new Identity().setQubit(startQubit+1).getMatrix());
		
		QMatrix cryLeft = null, cryRight = null;
		
		CRY cryLeftGate = new CRY();
		cryLeftGate.set(0, startQubit).set(1, startQubit+1);
		cryLeftGate.setTheta(node.leftChild.leftAngle);
		cryLeft = cryLeftGate.getMatrix();
		
		if (node.rightChild!=null) {
			CRY cryRightGate = new CRY();
			cryRightGate.set(0, startQubit).set(1, startQubit+1);
			cryRightGate.setTheta(node.rightChild.leftAngle);				
			cryRight = cryRightGate.getMatrix();
		}
		
		if (cryLeft==null)
			return cryRight;
		
		QMatrix m = QMatrix.multiply(x, cryLeft, x, cryRight);
		return m;
	}

	private QMatrix getRY(int qubit, double theta) {
		if (theta==0)
			return null;
		RY ry = new RY();
		ry.setQubit(qubit);
		return ry.getMatrix();
	}
}
