import time
import os
import sys
from qiskit import QuantumCircuit, transpile
from qiskit_ibm_runtime.fake_provider import *

def local_transpile(code_path: str, backend, backend_name):
    with open(code_path, 'r', encoding='utf-8') as f:
        code_str = f.read()

    ns: dict = {'QuantumCircuit': QuantumCircuit}
    exec(code_str, ns)

    if 'circuits' not in ns or not isinstance(ns['circuits'], list) or not isinstance(ns['circuits'][0], QuantumCircuit):
        raise ValueError("El código debe definir una lista 'circuits' con al menos un QuantumCircuit.")

    circuit: QuantumCircuit = ns['circuits'][0]

    t0 = time.time()
    transpiled = transpile(circuit, backend)
    t_transpile = time.time() - t0

    base, _ = os.path.splitext(code_path)
    transpiled_path = base + "." + backend_name + ".py"

    name = backend.name if not callable(backend.name) else backend.name()
    with open(transpiled_path, 'w', encoding='utf-8') as f:
        f.write("# Circuito transpilado automáticamente\n")
        f.write(f"# Backend: {name}\n")
        f.write(f"# Tiempo de transpilación: {t_transpile:.4f} segundos\n\n")
        f.write(generate_python_code(transpiled))
        f.write("\n")


def generate_python_code(circuit: QuantumCircuit) -> str:
    """
    Genera código Python equivalente al circuito dado, con una clase TranspiledCircuit,
    una lista self.qubits que puede pasarse al constructor, y un método get_circuit().
    """
    lines = [
        "from qiskit import QuantumCircuit",
        "",
        "class TranspiledCircuit:",
        "    def __init__(self, qubits=None):"
    ]

    # Crear el mapa de cúbits usados
    qubit_map = {}
    index = 0
    for instr in circuit.data:
        for qubit in instr.qubits:
            if qubit not in qubit_map:
                qubit_map[qubit] = index
                index += 1

    num_used_qubits = len(qubit_map)

    # Línea para inicializar self.qubits
    lines.append(f"        self.qubits = qubits if qubits is not None else [{', '.join(['0'] * num_used_qubits)}]")
    lines.append("")

    # Método get_circuit()
    lines.append("    def get_circuit(self):")
    lines.append(f"        circuit = QuantumCircuit({circuit.num_qubits}, {circuit.num_clbits})")

    for instr in circuit.data:
        operation = instr.operation
        qargs = [f"self.qubits[{qubit_map[q]}]" for q in instr.qubits]
        cargs = [str(circuit.clbits.index(c)) for c in instr.clbits]
        all_args = qargs + cargs
        args_str = ", ".join(all_args)
        lines.append(f"        circuit.{operation.name}({args_str})")

    lines.append("        return circuit")

    return "\n".join(lines)




def load_backend(name: str):
    """
    Devuelve una instancia del backend simulado FakeXXX (de qiskit_ibm_runtime.fake_provider).
    """
    if name in globals():
        backend_class = globals()[name]
        return backend_class()
    else:
        raise ValueError(f"Fake backend '{name}' no encontrado en qiskit_ibm_runtime.fake_provider.")


def main():
    if len(sys.argv) != 3:
        print("Uso: python transpile.py <ruta_al_archivo.py> <backend>")
        print("Ejemplo: python transpile.py /tmp/code_abc.py qasm_simulator")
        print("         python transpile.py /tmp/code_abc.py FakeJakarta")
        sys.exit(1)

    code_path = sys.argv[1]
    backend_name = sys.argv[2]

    try:
        backend = load_backend(backend_name)
        local_transpile(code_path, backend, backend_name)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(2)

if __name__ == "__main__":
    main()