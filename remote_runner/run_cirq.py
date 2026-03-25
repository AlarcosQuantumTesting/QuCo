# -*- coding: utf-8 -*-
import sys
import glob
import os
import time
import csv
import importlib.util
from collections import Counter

import cirq


def load_module_from_path(path: str):
    module_name = os.path.splitext(os.path.basename(path))[0]
    spec = importlib.util.spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        raise ImportError(f"No se pudo cargar el modulo desde {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def module_basename(module) -> str:
    return os.path.splitext(os.path.basename(module.__file__))[0]


def format_problem(module, idx: int) -> str:
    base = module_basename(module)
    return f"{base}.{idx}" if idx is not None and idx >= 0 else base


def qpu_name(backend) -> str:
    # Para Cirq, devolvemos un nombre legible del simulador elegido
    return str(backend)


def circuit_depth(c: cirq.AbstractCircuit) -> int:
    # Cirq define "depth" como número de momentos tras optimización mínima.
    # Si no existiera depth() en su versión, caemos a len(c) (nº de momentos).
    try:
        return c.depth()
    except Exception:
        try:
            return len(c)  # momentos
        except Exception:
            return 0


def count_gates(c: cirq.AbstractCircuit) -> int:
    # Número de operaciones (equivalente aproximado al total de puertas en Qiskit)
    return sum(1 for _ in c.all_operations())


def normalize_counts(counts, output_qubits: int):
    """
    Asegura que las claves binarias tengan ancho fijo 'output_qubits' y ordena el dict.
    """
    norm = {format(int(k, 2), f"0{output_qubits}b"): v for k, v in counts.items()}
    return dict(sorted(norm.items()))


def extract_counts_like_qiskit(result: cirq.Result, output_qubits: int):
    """
    Construye un dict counts {bitstring: freq} al estilo Qiskit.

    Soporta dos convenciones típicas:
    - Una sola key 'm' que mide N qubits (array [shots, N]).
    - Keys separadas c0, c1, ..., c{N-1} (una por bit), donde se forma el bitstring como c{N-1}...c0.
    """
    keys = list(result.measurements.keys())

    if not keys:
        raise ValueError("El circuito no tiene medidas (no hay measurement keys).")

    # Caso 1: una medida en bloque key="m"
    if "m" in result.measurements:
        arr = result.measurements["m"]  # shape: (shots, k)
        k = arr.shape[1]
        if output_qubits is None:
            output_qubits = k
        # Qiskit imprime MSB..LSB; aquí asumimos que el orden de columnas ya representa bits en ese orden.
        # Si su pipeline usaba endianess inverso, ajuste aquí (p.ej. invertir arr[:, ::-1]).
        counter = Counter()
        for row in arr:
            bitstring = "".join(str(int(b)) for b in row[:output_qubits])
            counter[bitstring] += 1
        return dict(counter)

    # Caso 2: keys tipo c0..c{N-1}
    # filtramos solo las que cumplan c<int>
    c_keys = []
    for k in keys:
        if k.startswith("c"):
            try:
                idx = int(k[1:])
                c_keys.append((idx, k))
            except Exception:
                pass

    if c_keys:
        c_keys.sort(key=lambda x: x[0])  # c0..cN-1
        # Construcción tipo Qiskit: c{N-1} ... c0
        indices = [idx for idx, _ in c_keys]
        if output_qubits is None:
            output_qubits = max(indices) + 1
        wanted = [(idx, key) for idx, key in c_keys if idx < output_qubits]

        counter = Counter()
        reps = len(result.measurements[wanted[0][1]])
        for r in range(reps):
            bitstring = "".join(
                str(int(result.measurements[key][r][0]))
                for idx, key in sorted(wanted, key=lambda x: x[0], reverse=True)
            )
            counter[bitstring] += 1
        return dict(counter)

    # Caso 3: una única key cualquiera (p. ej. "z")
    if len(keys) == 1:
        k = keys[0]
        arr = result.measurements[k]
        kcols = arr.shape[1]
        if output_qubits is None:
            output_qubits = kcols
        counter = Counter()
        for row in arr:
            bitstring = "".join(str(int(b)) for b in row[:output_qubits])
            counter[bitstring] += 1
        return dict(counter)

    raise ValueError(f"No se pudo inferir la convención de medidas. Keys encontradas: {keys}")


def print_report(problem, qpu, qubits, t_time, e_time, r_time,
                 g_orig, g_transp, depth_orig, depth_transp, error,
                 writer, iteration, job_id, algorithm):
    writer.writerow([
        iteration, problem, qpu, qubits, len(expected),
        f"{t_time:.4f}".replace(".", ","), f"{e_time:.4f}".replace(".", ","), f"{r_time:.4f}".replace(".", ","),
        g_orig, g_transp, depth_orig, depth_transp, f"{error:.6f}".replace(".", ","), job_id, algorithm
    ])


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
        line = [
            iteration, problem, backend_name, f"{ORIGINAL_QUBITS:.0f}", len(expected),
            decimal_key, binary_key, f"{expected_freq:.0f}", f"{obtained_freq:.0f}", f"{error:.0f}"
        ]
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
        line = [
            iteration, problem, backend_name, f"{ORIGINAL_QUBITS:.0f}", len(expected),
            decimal_key, "'" + key, expected_freq, actualFreq, abs(expected_freq - actualFreq)
        ]
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
        line = [
            circuit_index, iteration, problem, backend_name, qubits, len(expected),
            decimal_key, "'" + key, current_expected_absolute_occurrences, actual_occurrences, error_absolute
        ]
        lines.append(line)
    return lines


def execute_on_backend(circuit: cirq.AbstractCircuit, backend_name: str, outputQubits: int):
    """
    Cirq: no transpile al estilo Qiskit; ejecutamos directamente en Simulator.
    Devuelve: (circuit, counts, (t_transpile, t_exec, t_result), job_id)
    """
    sim = cirq.Simulator()

    # "Transpile" time ~ 0
    t_transpile = 0.0

    t0 = time.time()
    result = sim.run(cirq.Circuit(circuit), repetitions=shots)
    t_exec = time.time() - t0

    t0 = time.time()
    counts = extract_counts_like_qiskit(result, outputQubits)
    t_result = time.time() - t0

    return circuit, counts, (t_transpile, t_exec, t_result), None


def load_backends(choice: str):
    """
    Mantiene compatibilidad con runner 1..5 del endpoint.
    En Cirq, por defecto todo ejecuta en cirq.Simulator.
    """
    if choice in {"1", "2", "3", "4", "5"}:
        return ["cirq.Simulator"]
    raise ValueError(f"Invalid runner: {choice}. Valid values are: 1,2,3,4,5.")


def compute_metrics(circ, transpiled):
    g_orig = count_gates(circ)
    g_transp = count_gates(transpiled)
    d_orig = circuit_depth(circ)
    d_transp = circuit_depth(transpiled)
    return g_orig, g_transp, d_orig, d_transp


def run_problem_split(backends, path, module, summary_writer, details_writer, iteration: int):
    global qubits, shots, expected, ORIGINAL_QUBITS, ALGORITHM

    outputQubits = getattr(module, "outputQubits", qubits)
    circuits = module.circuits
    base = module_basename(module)

    for backend in backends:
        split_lines = []
        total_transpilation_time = 0.0
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
                transpiled, counts, (t_t, t_e, t_r), job_id = execute_on_backend(circ, backend, outputQubits)
                total_transpilation_time += t_t
                total_execution_time += t_e
                total_results_time += t_r

                g_o, g_t, d_o, d_t = compute_metrics(circ, transpiled)
                total_original_gates += g_o
                total_transpiled_gates += g_t
                total_original_depth += d_o
                total_transpiled_depth += d_t

                counts = normalize_counts(counts, outputQubits)

                lines = print_splitted_details(base, idx, counts, backend, iteration, searched_value)
                split_lines.extend(lines)

            except Exception as e:
                print(f"Error en backend {backend}: {e}", file=sys.stderr)

        summary_lines = summarize(split_lines, len(circuits))
        summary_lines.sort(key=lambda x: x[6])

        total_error = 0
        for line in summary_lines:
            details_writer.writerow([line[0], line[1], line[2], line[3], line[4],
                                     line[5], line[6], line[7], line[8], line[9]])
            total_error += line[9]

        total_error = total_error / max(1, len(circuits))

        # En SPLIT su run_qiskit imprime qubits como ORIGINAL_QUBITS si aplica
        q_for_report = qubits if ORIGINAL_QUBITS == -1 else round(ORIGINAL_QUBITS)

        print_report(
            base,
            backend,
            q_for_report,
            total_transpilation_time,
            total_execution_time,
            total_results_time,
            int(total_original_gates) / max(1, len(circuits)),
            int(total_transpiled_gates) / max(1, len(circuits)),
            int(total_original_depth) / max(1, len(circuits)),
            int(total_transpiled_depth) / max(1, len(circuits)),
            total_error / max(1, shots),
            summary_writer,
            iteration,
            job_ids,
            ALGORITHM
        )


def run_problem_nosplit(backends, path, module, summary_writer, details_writer, iteration: int):
    global qubits, shots, expected, ORIGINAL_QUBITS, ALGORITHM

    outputQubits = getattr(module, "outputQubits", qubits)
    circuits = module.circuits
    base = module_basename(module)

    for backend in backends:
        for idx, circ in enumerate(circuits):
            try:
                problem = format_problem(module, idx if len(circuits) > 1 else -1)

                transpiled, counts, (t_t, t_e, t_r), job_id = execute_on_backend(circ, backend, outputQubits)
                counts = normalize_counts(counts, outputQubits)

                if getattr(module, "ALGORITHM", "") == "Matrixes":
                    mean_error = print_matrixes_details(outputQubits, base, counts, backend, details_writer, iteration)
                else:
                    mean_error = print_parallel_details(iteration, base, counts, backend, details_writer)

                g_o, g_t, d_o, d_t = compute_metrics(circ, transpiled)

                q_for_report = qubits if ORIGINAL_QUBITS == -1 else round(ORIGINAL_QUBITS)

                print_report(
                    problem,
                    backend,
                    q_for_report,
                    t_t, t_e, t_r,
                    g_o, g_t, d_o, d_t,
                    mean_error,
                    summary_writer,
                    iteration,
                    job_id,
                    ALGORITHM
                )

            except Exception as e:
                print(f"Error en backend {backend}: {e}", file=sys.stderr)


def run_problem(backends, path, module, summary_writer, details_writer, iteration: int):
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
    usage = ("Use: python run_cirq.py <modules_pattern> <iteracions> "
             "<append y|n> <runner 1..5>")

    if len(argv) != 5:
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

    return pattern, iterations, append_mode, runner


if __name__ == "__main__":
    # Uso: python run_cirq.py p*.py <iterations> <overwrite y|n> <runner 1..5>
    pattern, iterations, append_mode, runner = parse_cli_args(sys.argv)

    py_paths = sorted(glob.glob(pattern))
    if not py_paths:
        print(f"No modules found for pattern: {pattern}", file=sys.stderr)
        sys.exit(1)

    dirs = {os.path.dirname(p) or "." for p in py_paths}
    out_dir = dirs.pop() if len(dirs) == 1 else "."

    if not append_mode:
        for f in glob.glob(os.path.join(out_dir, "*.csv")):
            try:
                os.remove(f)
            except FileNotFoundError:
                pass

    backends = load_backends(runner)

    summary_hdr = ['Iteration','Problem','QPU','Qubits','Searched','T_transp','T_exec','T_res',
                   'G_orig','G_transp','depth_orig','depth_transp','Mean_err','Job id','Algorithm']
    details_hdr = ['Iter','Problem','QPU','Qubits','Searched','Dec','Bin','Expected','Obtained','Error']

    summary_path = os.path.join(out_dir, "summary.csv")
    details_path = os.path.join(out_dir, "all_results.csv")

    with open(summary_path, "a" if append_mode else "w", newline="", buffering=1) as sf, \
         open(details_path, "a" if append_mode else "w", newline="", buffering=1) as df:

        sw = csv.writer(sf, delimiter="\t")
        dw = csv.writer(df, delimiter="\t")
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