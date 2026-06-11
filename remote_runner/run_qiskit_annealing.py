# -*- coding: utf-8 -*-
import sys
import glob
import os
import subprocess
import time

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

    import csv
    with open(summary_path, 'a' if append_mode else 'w', newline='', buffering=1) as sf, \
         open(details_path, 'a' if append_mode else 'w', newline='', buffering=1) as df:
        
        sw = csv.writer(sf, delimiter='\t')
        dw = csv.writer(df, delimiter='\t')

        if not append_mode:
            sw.writerow(['Problem', 'Iterations', 'Status_Success_Count', 'Average_FVAL'])
            dw.writerow(['Iteration', 'Problem', 'FVAL', 'Status', 'Variables'])

        stats = {}

        # In annealing we just run the script as is since it already contains optimizer.solve(qubo)
        for iteration in range(1, iterations + 1):
            for path in py_paths:
                try:
                    print(f"--- Running {path} (Iteration {iteration}) ---", flush=True)
                    start_time = time.time()
                    
                    # We just run the file using the current python executable, ignoring warnings
                    proc = subprocess.run([sys.executable, "-W", "ignore", path], capture_output=True, text=True)
                    
                    duration = time.time() - start_time
                    print(proc.stdout, end="")
                    if proc.stderr:
                        print(proc.stderr, file=sys.stderr, end="")
                    
                    print(f"--- Finished {path} in {duration:.4f}s with return code {proc.returncode} ---\n", flush=True)

                    fval = ""
                    status = ""
                    variables = ""
                    for line in proc.stdout.split('\n'):
                        if line.startswith("fval="):
                            parts = line.split(", ")
                            for p in parts:
                                if p.startswith("fval="):
                                    fval = p.split("=")[1]
                                elif p.startswith("status="):
                                    status = p.split("=")[1]
                                else:
                                    variables += p + " "
                    
                    problem = os.path.basename(path)
                    dw.writerow([iteration, problem, fval, status, variables.strip()])
                    
                    if problem not in stats:
                        stats[problem] = {'success': 0, 'sum_fval': 0.0, 'total': 0}
                    
                    stats[problem]['total'] += 1
                    if status == "SUCCESS":
                        stats[problem]['success'] += 1
                    try:
                        stats[problem]['sum_fval'] += float(fval)
                    except ValueError:
                        pass
                    
                except Exception as e:
                    print(f"Error executing {path}: {e}", file=sys.stderr)

        for prob, data in stats.items():
            avg_fval = data['sum_fval'] / max(1, data['total'])
            sw.writerow([prob, data['total'], data['success'], f"{avg_fval:.4f}"])
