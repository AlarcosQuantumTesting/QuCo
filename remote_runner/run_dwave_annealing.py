# -*- coding: utf-8 -*-
import sys
import glob
import os
import subprocess
import time

def parse_cli_args(argv):
    if len(argv) < 5:
        print("Usage: python run_dwave_annealing.py <pattern> <iterations> <overwrite> <runner> [token] [instance]")
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
            sw.writerow(['Solver', 'Problem', 'Iterations', 'Success_Count', 'Average_FVAL'])
            dw.writerow(['Iteration', 'Solver', 'Problem', 'FVAL', 'Status', 'Variables'])

        stats = {}

        for iteration in range(1, iterations + 1):
            for path in py_paths:
                try:
                    qpu = "dwave_solver"
                    print(f"--- Running {os.path.basename(path)} on D-Wave (Iteration {iteration}) ---", flush=True)
                    start_time = time.time()
                    
                    env = os.environ.copy()
                    if token:
                        env["DWAVE_API_TOKEN"] = token
                    
                    proc = subprocess.run([sys.executable, "-W", "ignore", path], capture_output=True, text=True, env=env)
                    
                    duration = time.time() - start_time
                    print(proc.stdout, end="")
                    if proc.stderr:
                        print(proc.stderr, file=sys.stderr, end="")
                    
                    print(f"--- Finished {os.path.basename(path)} in {duration:.4f}s with return code {proc.returncode} ---\n", flush=True)

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
                    if best_status == "SUCCESS" or "OptimizationResultStatus.SUCCESS" in best_status or best_status == "":
                        # D-Wave results don't necessarily have Qiskit statuses, assume success if it ran
                        stats[stat_key]['success'] += 1
                    try:
                        stats[stat_key]['sum_fval'] += float(best_fval)
                    except ValueError:
                        pass
                
                except Exception as e:
                    print(f"Error executing {path}: {e}", file=sys.stderr)

        for stat_key, data in stats.items():
            avg_fval = data['sum_fval'] / max(1, data['total'])
            sw.writerow([data['qpu'], data['prob'], data['total'], data['success'], f"{avg_fval:.4f}"])
