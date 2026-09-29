from flask import Blueprint, request, jsonify
import json
import os
import sys
import shutil
import threading
from datetime import datetime, timezone
import concurrent.futures

from .common import TEMP_SCRIPTS_DIR, next_sequential_dir
from .run_code_endpoint import run_script
from qexec_worker import make_pool, run_one

bp = Blueprint("run_code_async", __name__)

_POOL = None
_POOL_LOCK = threading.Lock()
_DIR_LOCK = threading.Lock()

MODE = os.environ.get("RUN_CODE_ASYNC_MODE", "pool")
WORKERS = int(os.environ.get("RUN_CODE_ASYNC_WORKERS", os.cpu_count() or 1))

def _get_pool():
    global _POOL
    with _POOL_LOCK:
        if _POOL is None:
            _POOL = make_pool(WORKERS)
        return _POOL

def _reset_pool():
    global _POOL
    with _POOL_LOCK:
        if _POOL is not None:
            try:
                _POOL.shutdown(wait=False, cancel_futures=True)
            except Exception:
                pass
            _POOL = None

def _run_batch(batch_dir, codes):
    try:
        results = []
        if MODE == "pool":
            pool = _get_pool()
            futures = []
            for i, code in enumerate(codes):
                fname = f"{i}.py"
                try:
                    fut = pool.submit(run_one, fname, code, batch_dir)
                    futures.append((fname, fut))
                except concurrent.futures.process.BrokenProcessPool:
                    _reset_pool()
                    futures.append((fname, None))

            for fname, fut in futures:
                if fut is None:
                    results.append({
                        "file": fname,
                        "returncode": None,
                        "stdout": "",
                        "stderr": "BrokenProcessPool when submitting task",
                        "duration_sec": 0.0
                    })
                    continue
                try:
                    res = fut.result()
                    results.append(res)
                except Exception as e:
                    if isinstance(e, concurrent.futures.process.BrokenProcessPool):
                        _reset_pool()
                    results.append({
                        "file": fname,
                        "returncode": None,
                        "stdout": "",
                        "stderr": str(e),
                        "duration_sec": 0.0
                    })
        else:
            with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as executor:
                futures = [
                    executor.submit(run_script, f"{i}.py", os.path.join(batch_dir, f"{i}.py"), batch_dir)
                    for i in range(len(codes))
                ]
                for fut in concurrent.futures.as_completed(futures):
                    results.append(fut.result())

        results.sort(key=lambda r: int(os.path.splitext(r["file"])[0]))

        results_data = {
            "workers": WORKERS,
            "mode": MODE,
            "results": results
        }
        res_tmp = os.path.join(batch_dir, "results.json.tmp")
        res_file = os.path.join(batch_dir, "results.json")
        with open(res_tmp, "w", encoding="utf-8") as f:
            json.dump(results_data, f)
        os.replace(res_tmp, res_file)

        status_file = os.path.join(batch_dir, "status.json")
        status_data = {}
        if os.path.exists(status_file):
            try:
                with open(status_file, "r", encoding="utf-8") as f:
                    status_data = json.load(f)
            except Exception:
                pass
        status_data["state"] = "finished"
        status_data["finished_at"] = datetime.now(timezone.utc).isoformat()
        status_tmp = os.path.join(batch_dir, "status.json.tmp")
        with open(status_tmp, "w", encoding="utf-8") as f:
            json.dump(status_data, f)
        os.replace(status_tmp, status_file)

    except Exception as e:
        status_file = os.path.join(batch_dir, "status.json")
        status_data = {
            "state": "error",
            "error": str(e),
            "failed_at": datetime.now(timezone.utc).isoformat()
        }
        try:
            with open(status_file, "w", encoding="utf-8") as f:
                json.dump(status_data, f)
        except Exception:
            pass

@bp.route('/run_code_async', methods=['POST'])
def run_code_async():
    try:
        payload = json.loads(request.data.decode("utf-8"))
    except Exception:
        return jsonify({"error": "El cuerpo debe ser JSON válido con un array de cadenas"}), 400
    if not isinstance(payload, list) or not payload or not all(isinstance(s, str) for s in payload):
        return jsonify({"error": "El cuerpo debe ser un array JSON no vacío de cadenas (código Python)"}), 400

    try:
        with _DIR_LOCK:
            batch_dir = next_sequential_dir(TEMP_SCRIPTS_DIR)
    except Exception as e:
        return jsonify({"error": f"No se pudo crear el directorio secuencial: {e}"}), 500

    batch_id = os.path.basename(batch_dir)

    for i, code in enumerate(payload):
        fname = f"{i}.py"
        fpath = os.path.join(batch_dir, fname)
        try:
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(code)
        except Exception as e:
            return jsonify({"error": f"No se pudo guardar {fname}: {e}", "batch_dir": batch_dir}), 500

    status_data = {
        "state": "running",
        "n": len(payload),
        "mode": MODE,
        "started_at": datetime.now(timezone.utc).isoformat()
    }
    status_file = os.path.join(batch_dir, "status.json")
    try:
        with open(status_file, "w", encoding="utf-8") as f:
            json.dump(status_data, f)
    except Exception as e:
        return jsonify({"error": f"No se pudo guardar status.json: {e}", "batch_dir": batch_dir}), 500

    threading.Thread(target=_run_batch, args=(batch_dir, payload), daemon=True).start()

    return jsonify({"batch_id": batch_id, "n": len(payload)}), 202

@bp.route('/run_code_async/status/<batch_id>', methods=['GET'])
def get_status(batch_id):
    if not batch_id.isdigit():
        return jsonify({"error": "batch_id must be numeric"}), 400

    batch_dir = os.path.join(TEMP_SCRIPTS_DIR, batch_id)
    status_file = os.path.join(batch_dir, "status.json")
    if not os.path.exists(status_file):
        return jsonify({"error": "Batch not found"}), 404

    try:
        with open(status_file, "r", encoding="utf-8") as f:
            status_data = json.load(f)
    except Exception as e:
        return jsonify({"error": f"Could not read status: {e}"}), 500

    return jsonify({
        "batch_id": batch_id,
        "state": status_data.get("state", "unknown"),
        "n": status_data.get("n", 0)
    }), 200

@bp.route('/run_code_async/results/<batch_id>', methods=['GET'])
def get_results(batch_id):
    if not batch_id.isdigit():
        return jsonify({"error": "batch_id must be numeric"}), 400

    batch_dir = os.path.join(TEMP_SCRIPTS_DIR, batch_id)
    status_file = os.path.join(batch_dir, "status.json")
    results_file = os.path.join(batch_dir, "results.json")

    if not os.path.exists(status_file):
        return jsonify({"error": "Batch not found"}), 404

    try:
        with open(status_file, "r", encoding="utf-8") as f:
            status_data = json.load(f)
    except Exception as e:
        return jsonify({"error": f"Could not read status: {e}"}), 500

    state = status_data.get("state")
    if state != "finished":
        return jsonify({"state": state}), 409

    if not os.path.exists(results_file):
        return jsonify({"error": "Results not found"}), 500

    try:
        with open(results_file, "r", encoding="utf-8") as f:
            results_data = json.load(f)
    except Exception as e:
        return jsonify({"error": f"Could not read results: {e}"}), 500

    results_data["batch_id"] = batch_id
    try:
        shutil.rmtree(batch_dir, ignore_errors=True)
    except Exception:
        pass

    return jsonify(results_data), 200
