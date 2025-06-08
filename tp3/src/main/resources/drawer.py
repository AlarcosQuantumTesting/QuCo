import sys
import importlib.util
from qiskit.visualization import circuit_drawer

def load_transpiled_circuit_class(file_path):
	spec = importlib.util.spec_from_file_location("TranspiledModule", file_path)
	module = importlib.util.module_from_spec(spec)
	spec.loader.exec_module(module)
	return module

def main(file_path):
	module = load_transpiled_circuit_class(file_path)

	if not hasattr(module, "TranspiledCircuit"):
		raise RuntimeError("El archivo no contiene la clase TranspiledCircuit")

	tc = module.TranspiledCircuit()
	circuit = tc.get_circuit()

	# Guardar como SVG
	svg_path = file_path + ".svg"
	circuit_drawer(circuit, output='mpl', filename=svg_path, style={'name': 'iqx'}, justify='left')

	print(f"Circuito dibujado correctamente en: {svg_path}")

if __name__ == "__main__":
	if len(sys.argv) != 2:
		print("Uso: python draw_circuit.py <ruta_al_fichero_py>")
		sys.exit(1)
	main(sys.argv[1])
