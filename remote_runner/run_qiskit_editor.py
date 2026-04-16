# -*- coding: utf-8 -*-
import sys
import glob
import os
import time
import csv
import importlib
import importlib.util
from qiskit import QuantumCircuit, transpile

# Configuración de Matplotlib para evitar bloqueos y capturar imágenes
plot_count = 0
try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    
    def custom_show(*args, **kwargs):
        global plot_count
        plot_count += 1
        filename = f"plot_{plot_count}.png"
        plt.savefig(filename)
        print(f"Gráfica guardada automáticamente en {filename}")
        plt.close()
        
    plt.show = custom_show
except ImportError:
    pass

from qiskit_aer import Aer
from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2 as Sampler
from concurrent.futures import ProcessPoolExecutor
from _fake_backends import backends as fake_backends
from get_remote_results import get_remote_results

# Reusamos la configuración de IBM si está disponible
IBM_INSTANCE = "crn:v1:bluemix:public:quantum-computing:us-east:a/f36be7dffb684988a853d020195b1761:3896a033-cd37-497c-ad48-c53c7dd17f22::"
IBM_TOKEN = "w5nqrDyPN_89VDZMKT-8NuhoqxAHdsA7SwCmT-tFgYYs"

def load_module_from_path(path: str):
    module_name = os.path.splitext(os.path.basename(path))[0]
    spec = importlib.util.spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        raise ImportError(f"No se pudo cargar el modulo desde {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

def qpu_name(backend) -> str:
    return backend.name if hasattr(backend, "name") else getattr(backend, "backend_name", str(backend))

def compute_metrics(circ, transpiled):
    gates_orig = sum(circ.count_ops().values())
    gates_transp = sum(transpiled.count_ops().values())
    depth_orig = circ.depth()
    depth_transp = transpiled.depth()
    return gates_orig, gates_transp, depth_orig, depth_transp

def execute_on_backend(circuit: QuantumCircuit, backend, shots=1000):
    t0 = time.time()
    transpiled = transpile(circuit, backend)
    t_transpile = time.time() - t0
    
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

def load_backends(choice: str):
    if choice == "1":
        return [Aer.get_backend('aer_simulator')]
    elif choice == "2":
        return fake_backends
    elif choice == "3":
        return [Aer.get_backend('aer_simulator')] + fake_backends
    elif choice == "4":
        return _get_actual_backends()
    elif choice == "5":
        return [Aer.get_backend('aer_simulator')] + fake_backends + _get_actual_backends()
    else:
        return [Aer.get_backend('aer_simulator')]

def _get_actual_backends():
    desired_actual_qpus = ["ibm_brisbane"]
    service = QiskitRuntimeService(channel="ibm_cloud", instance=IBM_INSTANCE, token=IBM_TOKEN)
    operational_backends = service.backends(simulator=False, operational=True)
    return [ob for ob in operational_backends if ob.name in desired_actual_qpus]

def parse_cli_args(argv):
    if len(argv) < 5:
        print("Usage: python run_qiskit_editor.py <pattern> <iterations> <overwrite> <runner> [token] [instance]")
        sys.exit(1)
    
    pattern = argv[1]
    iterations = int(argv[2])
    append_mode = argv[3].lower() == 'y'
    runner = argv[4]
    ibm_token = argv[5] if len(argv) >= 6 else None
    ibm_instance = argv[6] if len(argv) >= 7 else None
    return pattern, iterations, append_mode, runner, ibm_token, ibm_instance

if __name__ == "__main__":
    pattern, iterations, append_mode, runner, token, instance = parse_cli_args(sys.argv)
    if token: IBM_TOKEN = token
    if instance: IBM_INSTANCE = instance

    py_paths = sorted(glob.glob(pattern))
    if not py_paths:
        print(f"No files found for pattern: {pattern}", file=sys.stderr)
        sys.exit(1)

    out_dir = os.path.dirname(py_paths[0]) or '.'
    if not append_mode:
        for f in glob.glob(os.path.join(out_dir, '*.csv')):
            try: os.remove(f)
            except: pass

    backends = load_backends(runner)
    
    summary_path = os.path.join(out_dir, 'summary.csv')
    details_path = os.path.join(out_dir, 'all_results.csv')

    summary_hdr = ['Iteration','Problem','QPU','Qubits','Searched','T_transp','T_exec','T_res','G_orig','G_transp','depth_orig','depth_transp','Job id','Algorithm']
    details_hdr = ['Iter','Problem','QPU','Qubits','Dec','Bin','Obtained']

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
                    # Cargamos el script generado. 
                    # NOTA: Si el script ya tiene ejecución (Sampler.run), se ejecutará al importar.
                    # Pero aquí lo re-ejecutamos en los backends seleccionados.
                    module = load_module_from_path(path)
                    
                    if not hasattr(module, 'circuit'):
                        print(f"File {path} does not have a 'circuit' variable.", file=sys.stderr)
                        continue
                    
                    circuit = module.circuit
                    shots = getattr(module, 'shots', 1000)
                    problem_name = os.path.splitext(os.path.basename(path))[0]
                    
                    for backend in backends:
                        qpu = qpu_name(backend)
                        try:
                            transpiled, counts, (t_t, t_e, t_r), job_id = execute_on_backend(circuit, backend, shots)
                            g_o, g_t, d_o, d_t = compute_metrics(circuit, transpiled)
                            
                            # Registramos detalles
                            for binary_key, count in sorted(counts.items()):
                                decimal_key = int(binary_key, 2)
                                dw.writerow([iteration, problem_name, qpu, circuit.num_qubits, decimal_key, "'" + binary_key, count])
                            
                            # Registramos resumen
                            sw.writerow([iteration, problem_name, qpu, circuit.num_qubits, 0, 
                                         f"{t_t:.4f}".replace('.',','), f"{t_e:.4f}".replace('.',','), f"{t_r:.4f}".replace('.',','),
                                         g_o, g_t, d_o, d_t, job_id, "Editor"])
                        except Exception as e:
                            print(f"Error executing on {qpu}: {e}", file=sys.stderr)
                            
                except Exception as e:
                    print(f"Error loading {path}: {e}", file=sys.stderr)
