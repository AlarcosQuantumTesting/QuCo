from flask import Blueprint, request, jsonify, send_file
import os
import mimetypes
import time
import json
import subprocess
from datetime import datetime
import importlib
import importlib.util
from qiskit_ibm_runtime.fake_provider import FakeBrisbane

from .common import *
from qiskit import QuantumCircuit, transpile
from qiskit_aer import Aer
from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2 as Sampler


bp = Blueprint("run_qiskit_transpiler", __name__)

@bp.route("/qiskit_transpiler", methods=["POST"])
def qiskit_transpiler():
    backend = FakeBrisbane()

    try:
        payload = json.loads(request.data.decode("utf-8"))
    except Exception:
        return jsonify({"error": "El cuerpo debe ser JSON válido con un array de cadenas"}), 400

    if not isinstance(payload, list) or not payload or not all(isinstance(s, str) for s in payload):
        return jsonify({"error": "El cuerpo debe ser un array JSON no vacío de cadenas (código Python)"}), 400

    try:
        batch_dir = next_sequential_dir(TEMP_SCRIPTS_DIR)  # p.ej. temp_scripts/8
    except Exception as e:
        return jsonify({"error": f"No se pudo crear el directorio secuencial: {e}"}), 500

    batch_id = os.path.basename(batch_dir)

    saved_files = []
    for i, code in enumerate(payload, start=1):
        fname = f"p{i}.py"
        fpath = os.path.join(batch_dir, fname)
        try:
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(code)
            saved_files.append(fpath)
            module = load_module_from_path(fpath)
            circuits = module.circuits
            for j in range(len(circuits)):
                circuit = circuits[j]
                t0 = time.time()
                transpiled = transpile(circuit, backend)
                t_transpile = time.time() - t0
                save_transpiled_circuit(transpiled, backend + j, fpath, t_transpile)
        except Exception as e:
            return jsonify({"error": f"No se pudo guardar {fname}: {e}", "batch_dir": batch_dir}), 500


def load_module_from_path(path: str):
    module_name = os.path.splitext(os.path.basename(path))[0]
    spec = importlib.util.spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        raise ImportError(f"No se pudo cargar el modulo desde {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

def save_transpiled_circuit(circuit: QuantumCircuit, backend, path: str, transpilation_time):
    backend_name = backend.name if hasattr(backend, "name") else backend.backend_name
    lines = [
        "# Circuito transpilado automaticamente",
        "# Backend : " + backend_name,
        "# Time: " + str(transpilation_time),
        "from qiskit import QuantumCircuit",
        "",
        "class TranspiledCircuit:",
        "    def __init__(self, qubits=None):"
    ]
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
    lines.append(f"        original_qubits = {physical_qubits}")
    lines.append(f"        self.qubits = range(0, {len(physical_qubits)})  if qubits is None else original_qubits")
    lines.append("")
    lines.append("    def get_circuit(self, targetQubits=None):")
    lines.append(f"        circuit = QuantumCircuit({circuit.num_qubits}, {circuit.num_clbits})")
    lines.append("        if targetQubits is None:")
    lines.append("            targetQubits = self.qubits")
    for instr in circuit.data:
        operation = instr.operation
        params = operation.params
        qargs = [f"targetQubits[{qubit_map[q]}]" for q in instr.qubits]
        cargs = [str(circuit.clbits.index(c)) for c in instr.clbits]
        params_str = ",".join(map(str, params))
        all_args = qargs + cargs
        args_str = ", ".join(all_args)
        if len(params_str) > 0:
            lines.append(f"        circuit.{operation.name}({params_str}, {args_str})")
        else:
            if operation.name == "measure":
                lines.append(f"        #circuit.{operation.name}({args_str})")
            else:
                lines.append(f"        circuit.{operation.name}({args_str})")
    lines.append("        return circuit")
    lines.append("")
    lines.append("if __name__ == \"__main__\":")
    lines.append("    tc = TranspiledCircuit()")
    lines.append("    tc.get_circuit()")
    base, _ = os.path.splitext(path)
    transpiled_path = base + "." + backend_name + ".py"
    with open(transpiled_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(lines))
    return True
