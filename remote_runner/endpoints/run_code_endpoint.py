from flask import Blueprint, request, jsonify
import json
import time
from datetime import datetime
import subprocess
import concurrent.futures
import os
import sys
import shutil

from .common import *

bp = Blueprint("run_code", __name__)

@bp.route('/run_code', methods=['POST'])
def run_code():
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

    scripts = [] 
    for i in range(len(payload)):
        code = payload[i]
        fname = f"{i}.py"
        fpath = os.path.join(batch_dir, fname)
        try:
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(code)
            scripts.append((fname, fpath))
        except Exception as e:
            return jsonify({"error": f"No se pudo guardar {fname}: {e}", "batch_dir": batch_dir}), 500

    
    max_workers = os.cpu_count() or 1
    results = []
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [
                executor.submit(run_script, fname, fpath, batch_dir)
                for fname, fpath in scripts
            ]
            for fut in concurrent.futures.as_completed(futures):
                results.append(fut.result())
    except Exception as e:
         # Si falla la ejecución, intentamos limpiar igualmente
        try:
            shutil.rmtree(batch_dir, ignore_errors=True)
        except Exception:
            pass
        return jsonify({"error": f"Fallo al ejecutar en paralelo: {e}", "batch_dir": batch_dir}), 500

    # Ordenamos resultados por nombre de archivo (p1.py, p2.py, ...)
    results.sort(key=lambda r: r["file"])

    # Intentar eliminar el directorio tras ejecutar todo
    try:
        shutil.rmtree(batch_dir)
    except Exception as e:
        # Si no se puede eliminar, no abortamos — solo lo notificamos
        warning = f"No se pudo eliminar el directorio temporal {batch_dir}: {e}"
    else:
        warning = None

    # Responder con los resultados
    response = {
        "message": "Código ejecutado correctamente",
        "batch_id": batch_id,
        "workers": max_workers,
        "results": results
    }
    if warning:
        response["warning"] = warning

    return jsonify(response), 200


def run_script(fname, fpath, workdir):
        start = time.time()
        try:
            # Ejecuta con el mismo intérprete que corre Flask
            completed = subprocess.run(
                [sys.executable, fpath],
                cwd=workdir,
                capture_output=True,
                text=True,
                # Si quieres evitar bloqueos por scripts colgados, descomenta:
                # timeout=300,
            )
            duration = time.time() - start
            return {
                "file": fname,
                "returncode": completed.returncode,
                "stdout": completed.stdout,
                "stderr": completed.stderr,
                "duration_sec": round(duration, 6),
            }
        except subprocess.TimeoutExpired as e:
            duration = time.time() - start
            return {
                "file": fname,
                "returncode": None,
                "stdout": e.stdout if e.stdout else "",
                "stderr": (e.stderr if e.stderr else "") + "\nProceso terminado por timeout.",
                "duration_sec": round(duration, 6),
            }
        except Exception as e:
            duration = time.time() - start
            return {
                "file": fname,
                "returncode": None,
                "stdout": "",
                "stderr": f"Error al ejecutar {fname}: {e}",
                "duration_sec": round(duration, 6),
            }