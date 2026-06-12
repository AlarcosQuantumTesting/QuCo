# -*- coding: utf-8 -*-
import sys
import glob
import os
import subprocess
import time
import re

# Import the backend loading logic from run_qiskit
from run_qiskit import load_backends, qpu_name

def parse_cli_args(argv):
    if len(argv) < 5:
        print("Usage: python run_qiskit_annealing.py <pattern> <iterations> <overwrite> <runner> [token] [instance]")
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

    py_paths = sorted(glob.glob(pattern))
    if not py_paths:
        print(f"No files found for pattern: {pattern}", file=sys.stderr)
        sys.exit(1)

    dirs = {os.path.dirname(p) or '.' for p in py_paths}
    out_dir = dirs.pop() if len(dirs) == 1 else '.'

    summary_path = os.path.join(out_dir, 'summary.csv')
    details_path = os.path.join(out_dir, 'all_results.csv')
    
    backends = load_backends(runner)

    import csv
    with open(summary_path, 'a' if append_mode else 'w', newline='', buffering=1) as sf, \
         open(details_path, 'a' if append_mode else 'w', newline='', buffering=1) as df:
        
        sw = csv.writer(sf, delimiter='\t')
        dw = csv.writer(df, delimiter='\t')

        if not append_mode:
            sw.writerow(['QPU', 'Problem', 'Iterations', 'Status_Success_Count', 'Average_FVAL'])
            dw.writerow(['Iteration', 'QPU', 'Problem', 'FVAL', 'Status', 'Variables'])

        stats = {}

        # Wrapper class to bypass Qiskit 1.0+ ISA requirements dynamically for QAOA
        wrapper_code = """
from qiskit_ibm_runtime import SamplerV2
from qiskit import transpile

class TranspiledSamplerV2(SamplerV2):
    def __init__(self, mode, **kwargs):
        super().__init__(mode=mode, **kwargs)
        self._target_backend = mode

    def run(self, pubs, **kwargs):
        transpiled_pubs = []
        for pub in pubs:
            circuit = pub[0] if isinstance(pub, tuple) else pub.circuit
            tc = transpile(circuit, self._target_backend, optimization_level=1)
            if isinstance(pub, tuple):
                transpiled_pubs.append((tc, *pub[1:]))
            else:
                from qiskit.primitives.containers import SamplerPub
                transpiled_pubs.append(SamplerPub(tc, pub.parameter_values, pub.shots))
        return super().run(transpiled_pubs, **kwargs)
"""

        for iteration in range(1, iterations + 1):
            for path in py_paths:
                with open(path, "r", encoding="utf-8") as f:
                    original_code = f.read()

                for backend in backends:
                    qpu = qpu_name(backend)
                    
                    try:
                        print(f"--- Running {os.path.basename(path)} on {qpu} (Iteration {iteration}) ---", flush=True)
                        start_time = time.time()
                        
                        modified_code = original_code
                        
                        if qpu == "aer_simulator":
                            # Default StatevectorSampler works fine for the ideal simulator
                            pass
                        elif "fake" in qpu.lower():
                            remote_runner_dir = os.path.dirname(os.path.abspath(__file__))
                            injection = wrapper_code + f"\nimport sys\nsys.path.append(r'{remote_runner_dir}')\nfrom _fake_backends import backends as fake_backends\nbackend_fake = next(b for b in fake_backends if getattr(b, 'backend_name', getattr(b, 'name', '')) == '{qpu}')\nsampler = TranspiledSamplerV2(mode=backend_fake)\n"
                            modified_code = re.sub(r'sampler\s*=\s*StatevectorSampler\(\)', injection, modified_code)
                        else:
                            injection = wrapper_code + f"\nfrom qiskit_ibm_runtime import QiskitRuntimeService\nservice = QiskitRuntimeService(channel='ibm_cloud', instance='{instance}', token='{token}')\nbackend_real = service.backend('{qpu}')\nsampler = TranspiledSamplerV2(mode=backend_real)\n"
                            modified_code = re.sub(r'sampler\s*=\s*StatevectorSampler\(\)', injection, modified_code)

                        temp_path = path + f".{qpu}.py"
                        with open(temp_path, "w", encoding="utf-8") as f:
                            f.write(modified_code)
                        
                        # Execute the modified script
                        proc = subprocess.run([sys.executable, "-W", "ignore", temp_path], capture_output=True, text=True)
                        
                        duration = time.time() - start_time
                        print(proc.stdout, end="")
                        if proc.stderr:
                            print(proc.stderr, file=sys.stderr, end="")
                        
                        print(f"--- Finished {os.path.basename(path)} on {qpu} in {duration:.4f}s with return code {proc.returncode} ---\n", flush=True)

                        solutions = []
                        for line in proc.stdout.split('\n'):
                            if line.startswith("fval="):
                                fval = ""
                                status = ""
                                variables = ""
                                parts = line.split(", ")
                                for p in parts:
                                    if p.startswith("fval="):
                                        fval = p.split("=")[1]
                                    elif p.startswith("status="):
                                        status = p.split("=")[1]
                                    else:
                                        variables += p + " "
                                solutions.append((fval, status, variables.strip()))
                        
                        unique_solutions = []
                        seen = set()
                        for sol in solutions:
                            if sol not in seen:
                                seen.add(sol)
                                unique_solutions.append(sol)
                        
                        problem = os.path.basename(path)
                        if not unique_solutions:
                            unique_solutions = [("", "", "")]
                        
                        for fval, status, variables in unique_solutions:
                            dw.writerow([iteration, qpu, problem, fval, status, variables])
                        
                        best_fval, best_status, _ = unique_solutions[0]
                        
                        stat_key = f"{qpu}_{problem}"
                        if stat_key not in stats:
                            stats[stat_key] = {'qpu': qpu, 'prob': problem, 'success': 0, 'sum_fval': 0.0, 'total': 0}
                        
                        stats[stat_key]['total'] += 1
                        if best_status == "SUCCESS" or "OptimizationResultStatus.SUCCESS" in best_status:
                            stats[stat_key]['success'] += 1
                        try:
                            stats[stat_key]['sum_fval'] += float(best_fval)
                        except ValueError:
                            pass
                        
                        # Clean up temp file
                        if os.path.exists(temp_path):
                            os.remove(temp_path)

                    except Exception as e:
                        print(f"Error executing {path} on {qpu}: {e}", file=sys.stderr)

        for stat_key, data in stats.items():
            avg_fval = data['sum_fval'] / max(1, data['total'])
            sw.writerow([data['qpu'], data['prob'], data['total'], data['success'], f"{avg_fval:.4f}"])
