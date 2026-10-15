# -*- coding: utf-8 -*-
import sys
import glob
import os
import time
import csv
import importlib
import importlib.util
import warnings
warnings.filterwarnings('ignore')

from qiskit import QuantumCircuit, transpile
from qiskit_aer import Aer
from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2 as Sampler
from concurrent.futures import ProcessPoolExecutor
from _fake_backends import backends as fake_backends
from get_remote_results import get_remote_results

IBM_INSTANCE = "crn:v1:bluemix:public:quantum-computing:us-east:a/f36be7dffb684988a853d020195b1761:3896a033-cd37-497c-ad48-c53c7dd17f22::"
IBM_TOKEN = "w5nqrDyPN_89VDZMKT-8NuhoqxAHdsA7SwCmT-tFgYYs"  # se puede sobrescribir con argv[5]

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

def execute_on_backend(circuit: QuantumCircuit, backend, path=None):
    t0 = time.time()
    transpiled = transpile(circuit, backend)
    t_transpile = time.time() - t0
    if path is not None:
        save_transpiled_circuit(transpiled, backend, path, t_transpile)
    t0 = time.time()
    job_id = None
    if not hasattr(backend, "backend_name"):
        sampler = Sampler(backend)
        job = sampler.run([transpiled], shots=shots)
        t_execute = time.time() - t0
        t0 = time.time()
        result = job.result()[0]
        t_result = time.time() - t0
        counts = result.data.c.get_counts()
    elif backend.backend_name.startswith("fake"):
        job = backend.run(transpiled, shots=shots)
        t_execute = time.time() - t0
        t0 = time.time()
        result = job.result()
        t_result = time.time() - t0
        counts = result.get_counts()
    else:
        sampler = Sampler(mode=backend)
        job = sampler.run([transpiled], shots=shots)
        job_id = job.job_id()
        t_execute = time.time() - t0
        with ProcessPoolExecutor(max_workers=1) as exe:
            t0 = time.time()
            future = exe.submit(get_remote_results, job_id, IBM_TOKEN, IBM_INSTANCE)
            counts = future.result()
            t_result = time.time() - t0
    return transpiled, counts, (t_transpile, t_execute, t_result), job_id

def find(decimal_key):
    for i in range(0, len(expected)):
        if expected[i][0] == decimal_key:
            return expected[i][1]
    return 0

def print_parallel_details(iteration, problem, counts, backend_name, details_writer):
    blocks = round(qubits // ORIGINAL_QUBITS)
    block_len = int(ORIGINAL_QUBITS)
    counts = dict(sorted(counts.items()))
    obtained_freqs = {}
    if blocks > 1:
        for full_key in counts.keys():
            obtained_freq = counts[full_key]
            keys = [full_key[j:j + block_len] for j in range(0, len(full_key), block_len)]
            for i in range(0, len(expected)):
                expected_key = expected[i][0]
                obtained_key = keys[i]
                if expected_key == int(obtained_key, 2):
                    obtained_freqs[obtained_key] = obtained_freqs.get(obtained_key, 0) + obtained_freq
    else:
        obtained_freqs = counts
    obtained_freqs = sorted(obtained_freqs.items())
    for obtained_key, obtained_freq in obtained_freqs:
        decimal_key = int(obtained_key, 2)
        binary_key = "'" + obtained_key
        freq = find(decimal_key)
        expected_freq = freq * shots * blocks
        error = abs(expected_freq - obtained_freq)
        line = [iteration, problem, backend_name, f"{ORIGINAL_QUBITS:.0f}", len(expected),
                decimal_key, binary_key, f"{expected_freq:.0f}", f"{obtained_freq:.0f}", f"{error:.0f}"]
        details_writer.writerow(line)
    total_error = 0
    obtained_dict = dict(obtained_freqs)
    for (expected_key, freq_relative) in expected:
        expected_freq = freq_relative * shots * blocks
        bin_key = format(expected_key, f"0{ORIGINAL_QUBITS}b")
        obtained_freq = obtained_dict.get(bin_key, 0)
        total_error += abs(expected_freq - obtained_freq)
    mean_relative_error = total_error / shots / blocks
    return mean_relative_error

def print_matrixes_details(outputQubits, problem, counts, backend_name, details_writer, iteration):
    counts = dict(sorted(counts.items()))
    for key in counts.keys():
        decimal_key = int(key, 2)
        expected_freq = int(find(decimal_key) * shots)
        actualFreq = counts[key]
        line = [iteration, problem, backend_name, f"{ORIGINAL_QUBITS:.0f}", len(expected),
                decimal_key, "'" + key, expected_freq, actualFreq, abs(expected_freq - actualFreq)]
        details_writer.writerow(line)
    total_error = 0
    for i in range(len(expected)):
        expected_key = format(expected[i][0], f"0{outputQubits}b")
        expected_freq = expected[i][1] * shots
        obtained_freq = counts.get(expected_key, 0)
        total_error += abs(obtained_freq - expected_freq)
    mean_relative_error = total_error / shots
    return mean_relative_error

def summarize(data, number_of_circuits):
    keys = {(row[1], row[2], row[3], row[6]) for row in data}
    result = []
    for key in keys:
        rows = [row for row in data if (row[1], row[2], row[3], row[6]) == key]
        new_row = rows[0].copy()
        new_row[10] = 0
        for row in rows[1:]:
            new_row[8] = new_row[8] + row[8]
            new_row[9] = new_row[9] + row[9]
        new_row[10] = abs(new_row[8] - new_row[9])
        del new_row[0]
        result.append(new_row)
    return result

def print_splitted_details(problem, circuit_index, counts, backend_name, iteration, searched_value):
    counts = dict(sorted(counts.items()))
    lines = []
    for key in counts:
        decimal_key = int(key, 2)
        actual_occurrences = counts.get(key, 0.0)
        current_expected_absolute_occurrences = shots if decimal_key == searched_value[0] else 0
        error_absolute = abs(current_expected_absolute_occurrences - actual_occurrences)
        line = [circuit_index, iteration, problem, backend_name, qubits, len(expected),
                decimal_key, "'" + key, current_expected_absolute_occurrences, actual_occurrences, error_absolute]
        lines.append(line)
    return lines

def print_report(problem, qpu, qubits, t_time, e_time, r_time, g_orig, g_transp, depth_orig, depth_transp, error, writer, iteration, job_id):
    writer.writerow([iteration, problem, qpu, qubits, len(expected),
                     f"{t_time:.4f}".replace('.', ','), f"{e_time:.4f}".replace('.', ','), f"{r_time:.4f}".replace('.', ','),
                     g_orig, g_transp, depth_orig, depth_transp, f"{error:.6f}".replace('.', ','), job_id, ALGORITHM])

def load_backends(choice: str):
    if choice == "1":
        return [Aer.get_backend('aer_simulator')]
    elif choice == "2":
        return fake_backends
    elif choice == "3":
        return [Aer.get_backend('aer_simulator')] + fake_backends
    elif choice == "4" or choice == "5":
        if choice == "4":
            return _get_actual_backends()
        else:
            return [Aer.get_backend('aer_simulator')] + fake_backends + _get_actual_backends()
    else:
        raise ValueError(f"Invalid runner: {choice}. Valid values are: 1,2,3,4,5.")

def _get_actual_backends():
    desired_actual_qpus = ["ibm_brisbane"]
    global service
    service = QiskitRuntimeService(channel="ibm_cloud", instance=IBM_INSTANCE, token=IBM_TOKEN)
    operational_backends = service.backends(simulator=False, operational=True)
    backends = []
    for ob in operational_backends:
        if ob.name in desired_actual_qpus:
            backends.append(ob)
    return backends

def compute_metrics(circ, transpiled):
    """
    Devuelve (gates_orig, gates_transp, depth_orig, depth_transp)
    """
    gates_orig = sum(circ.count_ops().values())
    gates_transp = sum(transpiled.count_ops().values())
    depth_orig = circ.depth()
    depth_transp = transpiled.depth()
    return gates_orig, gates_transp, depth_orig, depth_transp


def normalize_counts(counts, output_qubits: int):
    """
    Convierte las claves binarias a ancho fijo 'output_qubits' y devuelve el diccionario ordenado.
    """
    norm = {format(int(k, 2), f'0{output_qubits}b'): v for k, v in counts.items()}
    return dict(sorted(norm.items()))


def module_basename(module) -> str:
    """Nombre base del módulo sin extensión."""
    return os.path.splitext(os.path.basename(module.__file__))[0]


def format_problem(module, idx: int) -> str:
    """
    Devuelve el nombre del problema. Si hay múltiples circuitos, añade .<idx>.
    """
    base = module_basename(module)
    return f"{base}.{idx}" if idx is not None and idx >= 0 else base


def qpu_name(backend) -> str:
    """Nombre legible del backend/QPU."""
    return backend.name if hasattr(backend, "name") else getattr(backend, "backend_name", str(backend))

def run_problem_split(backends, path, module, summary_writer, details_writer, iteration: int):
    global qubits, shots, expected, ORIGINAL_QUBITS, ALGORITHM

    outputQubits = getattr(module, 'outputQubits', qubits)
    circuits = module.circuits
    base = module_basename(module)

    for backend in backends:
        split_lines = []
        total_tanspilation_time = 0.0
        total_execution_time = 0.0
        total_results_time = 0.0
        total_original_gates = 0
        total_transpiled_gates = 0
        total_original_depth = 0
        total_transpiled_depth = 0
        job_ids = ""

        for idx, circ in enumerate(circuits):
            searched_value = expected[idx]
            try:
                transpiled, counts, (t_t, t_e, t_result), job_id = execute_on_backend(circ, backend, path)
                total_tanspilation_time += t_t
                total_execution_time += t_e
                total_results_time += t_result

                g_o, g_t, d_o, d_t = compute_metrics(circ, transpiled)
                total_original_gates += g_o
                total_transpiled_gates += g_t
                total_original_depth += d_o
                total_transpiled_depth += d_t

                if job_id is not None:
                    job_ids = job_ids + " " + str(job_id)

                counts = normalize_counts(counts, outputQubits)

                lines = print_splitted_details(
                    base,
                    idx,
                    counts,
                    qpu_name(backend),
                    iteration,
                    searched_value
                )
                split_lines.extend(lines)

            except Exception as e:
                print(f"Error en backend {qpu_name(backend)}: {e}", file=sys.stderr)

        summary_lines = summarize(split_lines, len(circuits))
        summary_lines.sort(key=lambda x: x[6])

        total_error = 0
        for line in summary_lines:
            details_writer.writerow([line[0], line[1], line[2], line[3], line[4],
                                     line[5], line[6], line[7], line[8], line[9]])
            total_error += line[9]

        total_error = total_error / max(1, len(circuits))

        print_report(
            base,
            qpu_name(backend),
            qubits if ORIGINAL_QUBITS == -1 else round(ORIGINAL_QUBITS),
            total_tanspilation_time,
            total_execution_time,
            total_results_time,
            int(total_original_gates) / max(1, len(circuits)),
            int(total_transpiled_gates / max(1, len(circuits))),
            int(total_original_depth / max(1, len(circuits))),
            int(total_transpiled_depth / max(1, len(circuits))),
            total_error / max(1, shots),
            summary_writer,
            iteration,
            job_ids
        )


def run_problem_nosplit(backends, path, module, summary_writer, details_writer, iteration: int):
    global qubits, shots, expected, ORIGINAL_QUBITS, ALGORITHM

    outputQubits = getattr(module, 'outputQubits', qubits)
    circuits = module.circuits
    base = module_basename(module)

    for backend in backends:
        for idx, circ in enumerate(circuits):
            try:
                problem = format_problem(module, idx if len(circuits) > 1 else -1)

                transpiled, counts, (t_t, t_e, t_result), job_id = execute_on_backend(circ, backend, path)
                qpu = qpu_name(backend)

                counts = normalize_counts(counts, outputQubits)

                if getattr(module, "ALGORITHM", "") == "Matrixes":
                    mean_error = print_matrixes_details(
                        outputQubits, base, counts, qpu, details_writer, iteration
                    )
                else:
                    mean_error = print_parallel_details(
                        iteration, base, counts, qpu, details_writer
                    )

                g_o, g_t, d_o, d_t = compute_metrics(circ, transpiled)

                print_report(
                    problem,
                    qpu,
                    qubits if ORIGINAL_QUBITS == -1 else round(ORIGINAL_QUBITS),
                    t_t, t_e, t_result,
                    g_o, g_t, d_o, d_t,
                    mean_error,
                    summary_writer,
                    iteration,
                    job_id
                )

            except Exception as e:
                print(f"Error en backend {qpu_name(backend)}: {e}", file=sys.stderr)


def run_problem(backends, path, module, summary_writer, details_writer, iteration: int):
    """
    Dispatcher que prepara contexto global y deriva en SPLIT o no SPLIT.
    """
    global qubits, shots, expected, ORIGINAL_QUBITS, ALGORITHM

    qubits = module.qubits
    shots = module.shots
    expected = module.expected
    ORIGINAL_QUBITS = module.ORIGINAL_QUBITS
    SPLIT = module.SPLIT
    ALGORITHM = module.ALGORITHM

    if SPLIT:
        run_problem_split(backends, path, module, summary_writer, details_writer, iteration)
    else:
        run_problem_nosplit(backends, path, module, summary_writer, details_writer, iteration)


def parse_cli_args(argv):
    """
    Valida y devuelve los parámetros de línea de comandos.

    Retorna:
        (pattern, iterations, append_mode, runner, ibm_token, ibm_instance)
    """
    usage = ("Use: python run_qiskit.py <modules_pattern> <iteracions> "
             "<append y|n> <runner 1..5> [<ibm_token>] [<ibm_instance>] ")

    if len(argv) < 5 or len(argv) > 7:
        print(usage)
        sys.exit(1)

    pattern = argv[1]

    try:
        iterations = int(argv[2])
        if iterations < 1:
            raise ValueError()
    except Exception:
        print("The <iterations> parameter must be integer >= 1", file=sys.stderr)
        sys.exit(1)

    append_flag = argv[3].lower()
    if append_flag not in {"y", "n"}:
        print("The <append> parameter must be 'y' or 'n'", file=sys.stderr)
        sys.exit(1)
    append_mode = (append_flag == "y")

    runner = str(argv[4]).strip()
    if runner not in {"1", "2", "3", "4", "5"}:
        print("The <runner> parameter must be 1, 2, 3, 4 o 5", file=sys.stderr)
        sys.exit(1)

    ibm_token = argv[5] if len(argv) >= 6 else None
    ibm_instance = argv[6] if len(argv) >= 7 else None

    return pattern, iterations, append_mode, runner, ibm_token, ibm_instance

def run_preloads(backends) :
    fake_circuit = QuantumCircuit(1, 1)
    fake_circuit.x(0)
    fake_circuit.measure(0, 0)
    for backend in backends:
        name = backend.name if hasattr(backend, "name") else backend.backend_name
        if hasattr(backend, "status"):
            try:
                if not hasattr(backend, "backend_name") or backend.backend_name.startswith("fake"):
                    _ = execute_on_backend(fake_circuit, backend)
            except Exception:
                pass

if __name__ == "__main__":
    # Uso: python run_qiskit.py p*.py <iterations> <overwrite y|n> <runner 1..5> [<ibm_token>]
    pattern, iterations, append_mode, runner, IBM_TOKEN, IBM_INSTANCE = parse_cli_args(sys.argv)

    py_paths = sorted(glob.glob(pattern))
    if not py_paths:
        print(f"No modules found for pattern: {pattern}", file=sys.stderr)
        sys.exit(1)

    dirs = {os.path.dirname(p) or '.' for p in py_paths}
    out_dir = dirs.pop() if len(dirs) == 1 else '.'

    if not append_mode:
        for f in glob.glob(os.path.join(out_dir, '*.csv')):
            try:
                os.remove(f)
            except FileNotFoundError:
                pass

    backends = load_backends(runner)
    run_preloads(backends)

    summary_hdr = ['Iteration','Problem','QPU','Qubits','Searched','T_transp','T_exec','T_res','G_orig','G_transp','depth_orig','depth_transp','Mean_err','Job id','Algorithm']
    details_hdr = ['Iter','Problem','QPU','Qubits','Searched','Dec','Bin','Expected','Obtained','Error']

    summary_path = os.path.join(out_dir, 'summary.csv')
    details_path = os.path.join(out_dir, 'all_results.csv')

    with open(summary_path, 'a' if append_mode else 'w', newline='', buffering=1) as sf, \
         open(details_path, 'a' if append_mode else 'w', newline='', buffering=1) as df:
        sw = csv.writer(sf, delimiter='\t')
        dw = csv.writer(df, delimiter='\t')
        if not append_mode:
            sw.writerow(summary_hdr)
            dw.writerow(details_hdr)
        for iteration in range(1, iterations + 1):
            for path in py_paths:
                try:
                    module = load_module_from_path(path)
                except Exception as e:
                    print(f"The module {path} could not be imported: {e}", file=sys.stderr)
                    continue
                if hasattr(module, "qubits"):
                    run_problem(backends, path, module, sw, dw, iteration)

