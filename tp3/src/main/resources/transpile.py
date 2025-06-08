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
    
    lines = [
        "from qiskit import QuantumCircuit",
        "",
        "class TranspiledCircuit:",
        "\tdef __init__(self, qubits=None):"
    ]

    # Crear el mapa de cúbits usados
    qubit_map = {}
    physical_qubits = []
    index = 0
    for instr in circuit.data:
        for qubit in instr.qubits:
            if qubit not in qubit_map:
                qubit_index = circuit.qubits.index(qubit)
                qubit_map[qubit] = index
                physical_qubits.append(qubit_index)
                index += 1

    # Inicialización de self.qubits con los índices físicos usados
    lines.append(f"\t\tself.qubits = qubits if qubits is not None else {physical_qubits}")
    lines.append("")

    # Método get_circuit()
    lines.append("\tdef get_circuit(self, targetQubits=None):")
    lines.append(f"\t\tcircuit = QuantumCircuit({circuit.num_qubits}, {circuit.num_clbits})")
    lines.append("\t\tif targetQubits is None:")
    lines.append("\t\t\ttargetQubits = self.qubits")

    for instr in circuit.data:
        operation = instr.operation
        params = operation.params
        qargs = [f"targetQubits[{qubit_map[q]}]" for q in instr.qubits]
        cargs = [str(circuit.clbits.index(c)) for c in instr.clbits]
        params_str = ", ".join(map(str, params))
        all_args = qargs + cargs
        args_str = ", ".join(all_args)
        if len(params_str)>0 :
            lines.append(f"\t\tcircuit.{operation.name}({params_str}, {args_str})")
        else :
            lines.append(f"\t\tcircuit.{operation.name}({args_str})")

    lines.append("#\t\tprint(circuit)")
    lines.append("\t\treturn circuit")
    lines.append("\n")
    lines.append("if __name__ == \"__main__\":")
    lines.append("\ttc = TranspiledCircuit()")
    lines.append("\ttc.get_circuit()")
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