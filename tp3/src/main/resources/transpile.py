import time
import os
import sys
from qiskit import QuantumCircuit, transpile
from qiskit_ibm_runtime.fake_provider import *

def local_transpile(code_path: str, backend):
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
    transpiled_path = base + "." + backend.name + ".py"

    name = backend.name if not callable(backend.name) else backend.name()
    with open(transpiled_path, 'w', encoding='utf-8') as f:
        f.write("# Circuito transpileado automáticamente\n")
        f.write(f"# Backend: {name}\n")
        f.write(f"# Tiempo de transpilación: {t_transpile:.4f} segundos\n\n")
        f.write(generate_python_code(transpiled))
        f.write("\n")


def generate_python_code(circuit: QuantumCircuit) -> str:
    """
    Genera código Python equivalente al circuito dado, compatible con Qiskit ≥ 1.2.
    """
    lines = [
        "from qiskit import QuantumCircuit",
        f"qc = QuantumCircuit({circuit.num_qubits}, {circuit.num_clbits})"
    ]

    for instr in circuit.data:
        operation = instr.operation
        qargs = [circuit.qubits.index(q) for q in instr.qubits]
        cargs = [circuit.clbits.index(c) for c in instr.clbits]

        args_str = ", ".join(map(str, qargs + cargs))
        lines.append(f"qc.{operation.name}({args_str})")

    lines.append("return qc")
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
        local_transpile(code_path, backend)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(2)

if __name__ == "__main__":
    main()