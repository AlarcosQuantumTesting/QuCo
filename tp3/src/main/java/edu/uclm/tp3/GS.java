package edu.uclm.tp3;

import java.util.Arrays;

public class GS {

	public static double[] project(double[] u, double[] v) {
		double dotProduct = dotProduct(u, v);
		double magnitudeSquared = dotProduct(v, v);
		double scalar = dotProduct / magnitudeSquared;
		return scalarMult(scalar, v);
	}

	public static double[] subtract(double[] u, double[] v) {
		double[] result = new double[u.length];
		for (int i = 0; i < u.length; i++) {
			result[i] = u[i] - v[i];
		}
		return result;
	}

	public static double dotProduct(double[] u, double[] v) {
		double result = 0;
		for (int i = 0; i < u.length; i++) {
			result += u[i] * v[i];
		}
		return result;
	}

	public static double[] scalarMult(double scalar, double[] v) {
		double[] result = new double[v.length];
		for (int i = 0; i < v.length; i++) {
			result[i] = scalar * v[i];
		}
		return result;
	}

	public static double[] normalize(double[] v) {
		double magnitude = Math.sqrt(dotProduct(v, v));
		return scalarMult(1 / magnitude, v);
	}

	public static double[][] gramSchmidt(double[][] vectors) {
		int n = vectors.length;
		double[][] basis = new double[n][n];
		for (int i = 0; i < n; i++) {
			basis[i] = normalize(vectors[i]);
			for (int j = 0; j < i; j++) {
				double[] projection = project(basis[i], basis[j]);
				basis[i] = subtract(basis[i], projection);
			}
		}
		return basis;
	}

	public static void main(String[] args) {
		double[][] vectors = {
				{1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0},
				{0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0},
				{0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0},
				{0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0},
				{0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0},
				{0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0},
				{0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0},
				{0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0},
				{0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0},
				{0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0},
				{0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0},
				{0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0},
				{0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0},
				{0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0},
				{0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0},
				{0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0}
		};
		double[][] basis = gramSchmidt(vectors);
		for (int i = 0; i < basis.length; i++) {
			System.out.println(Arrays.toString(basis[i]));
		}
	}

}
