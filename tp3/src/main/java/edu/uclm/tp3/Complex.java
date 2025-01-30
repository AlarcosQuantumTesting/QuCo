package edu.uclm.tp3;

import java.util.Objects;

public class Complex {
    public static final Complex ONE = new Complex(1.0, 0);
	public static final Complex ZERO = new Complex(0.0, 0);
	public static final Complex mONE = new Complex(-1.0, 0);
	private final double re;   
    private final double im;
	private boolean zero;   

    public Complex(double real, double imag) {
        re = real;
        im = imag;
        if (this.re==0 && this.im==0)
        	this.zero = true;
    }

    public Complex(String token) {
    	token = token.toLowerCase();
    	int posI = token.indexOf('i');
		if (posI==-1) {
			this.re = Double.parseDouble(token);
			this.im = 0;
		} else {
			
			if (posI==0) {
				this.re = 0;
				this.im = 1;
				return;
			}
			
			if (token.charAt(0)=='-' && token.charAt(1)=='i') {
				this.re = 0;
				this.im = -1;
				return;
			}
			
			if (token.charAt(0)!='-') {
				token = '+' + token;
				posI = posI + 1;
			}

			int posSegundoSigno = 1;
			for (int i=posSegundoSigno; i<token.length(); i++) {
				if (token.charAt(i)=='-' || token.charAt(i)=='+') {
					posSegundoSigno = i;
					break;
				}
			}
			
			this.re = Double.parseDouble(token.substring(0, posSegundoSigno));
			if (token.endsWith("i"))
				token = token.substring(0, token.length()-1);
			if (token.endsWith("-") || token.endsWith("+"))
				token = token + 1;
			this.im = Double.parseDouble(token.substring(posSegundoSigno));
		}
		if (this.re==0 && this.im==0)
			this.zero = true;
	}
    
    public boolean isZero() {
		return zero;
	}

    public double abs() {
        return Math.hypot(re, im);
    }

    public double phase() {
        return Math.atan2(im, re);
    }

    public Complex add(Complex b) {
        Complex a = this;             
        double real = a.re + b.re;
        double imag = a.im + b.im;
        return new Complex(real, imag);
    }

    public Complex minus(Complex b) {
        Complex a = this;
        double real = a.re - b.re;
        double imag = a.im - b.im;
        return new Complex(real, imag);
    }

    public Complex multiply(Complex b) {
        Complex a = this;
        double real = a.re * b.re - a.im * b.im;
        double imag = a.re * b.im + a.im * b.re;
        return new Complex(real, imag);
    }
    
    public Complex multiply(double factor) {
        Complex a = this;
        Complex b = new Complex(factor, 0);
        double real = a.re * b.re - a.im * b.im;
        double imag = a.re * b.im + a.im * b.re;
        return new Complex(real, imag);
    }

    public Complex scale(double alpha) {
        return new Complex(alpha * re, alpha * im);
    }

    public Complex conjugate() {
        return new Complex(re, -im);
    }

    public Complex reciprocal() {
        double scale = re*re + im*im;
        return new Complex(re / scale, -im / scale);
    }

    public Complex divides(Complex b) {
        Complex a = this;
        return a.multiply(b.reciprocal());
    }

    public Complex exp() {
        return new Complex(Math.exp(re) * Math.cos(im), Math.exp(re) * Math.sin(im));
    }

    public Complex sin() {
        return new Complex(Math.sin(re) * Math.cosh(im), Math.cos(re) * Math.sinh(im));
    }

    public Complex cos() {
        return new Complex(Math.cos(re) * Math.cosh(im), -Math.sin(re) * Math.sinh(im));
    }

    public Complex tan() {
        return sin().divides(cos());
    }

    public static Complex add(Complex a, Complex b) {
        double real = a.re + b.re;
        double imag = a.im + b.im;
        return new Complex(real, imag);
    }

	public String toMath() {
		if (this.re==0 && this.im==0)
			return "0";
		if (this.re!=0 && this.im==0)
			return "" + this.re;
		if (this.re==0 && this.im!=0)
			return this.im + "i";
		return this.re + (this.im>0 ? "+" : "") + this.im + "i";
	}
    
	public double getRe() {
		return re;
	}

	public double getIm() {
		return im;
	}
	
	@Override
	public int hashCode() {
		return Objects.hash(im, re);
	}

	@Override
	public boolean equals(Object obj) {
		if (this == obj)
			return true;
		if (obj == null)
			return false;
		if (getClass() != obj.getClass())
			return false;
		Complex other = (Complex) obj;
		return Double.doubleToLongBits(im) == Double.doubleToLongBits(other.im)
				&& Double.doubleToLongBits(re) == Double.doubleToLongBits(other.re);
	}

	@Override
	public String toString() {
        if (im == 0) {
        	if (re-Math.round(re)==0)
        		return "" + Math.round(re);
        	return re + "";
        }
        if (re == 0) return im + "i";
        if (im <  0) return re + " - " + (-im) + "i";
        return re + " + " + im + "i";
    }

	public static Double get(char c) {
		return c=='0' ? 0.0 : 1.0;
	}

}