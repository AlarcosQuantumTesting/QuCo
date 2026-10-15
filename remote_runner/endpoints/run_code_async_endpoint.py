from flask import Blueprint, request, jsonify
import json
import os
import sys
import shutil
import threading
from datetime import datetime, timezone
import concurrent.futures

from .common import TEMP_SCRIPTS_DIR
from .run_code_endpoint import run_script
from qexec_worker import make_pool, run_one

bp = Blueprint("run_code_async", __name__)

_POOL = None
_POOL_LOCK = threading.Lock()
_DIR_LOCK = threading.Lock()
_LAST_ID = 0
_BATCHES = {}
_BATCHES_LOCK = threading.Lock()

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

def _new_batch_dir():
    global _LAST_ID
    with _DIR_LOCK:
        os.makedirs(TEMP_SCRIPTS_DIR, exist_ok=True)
        existing = [int(name) for name in os.listdir(TEMP_SCRIPTS_DIR) if name.isdigit()]
        existing_max = max(existing) if existing else 0
        next_id = max(existing_max, _LAST_ID) + 1
        new_dir = os.path.join(TEMP_SCRIPTS_DIR, str(next_id))
        os.makedirs(new_dir, exist_ok=False)
        _LAST_ID = next_id
        return new_dir

def _write_status(batch_dir, data):
    status_tmp = os.path.join(batch_dir, "status.json.tmp")
    status_file = os.path.join(batch_dir, "status.json")
    with open(status_tmp, "w", encoding="utf-8") as f:
        json.dump(data, f)
    os.replace(status_tmp, status_file)

def _run_batch(batch_id, batch_dir, codes, submitted_event=None):
    batch_dict = {"futures": [], "cancelled": False}
    try:
        status_file = os.path.join(batch_dir, "status.json")
        started_at = datetime.now(timezone.utc).isoformat()
        if os.path.exists(status_file):
            try:
                with open(status_file, "r", encoding="utf-8") as f:
                    started_at = json.load(f).get("started_at", started_at)
            except Exception:
                pass

        with _BATCHES_LOCK:
            _BATCHES[batch_id] = batch_dict

        results = [None] * len(codes)
        done = 0
        index_of = {}
        futures_to_wait = []

        if MODE == "pool":
            pool = _get_pool()
            for i, code in enumerate(codes):
                fname = f"{i}.py"
                try:
                    fut = pool.submit(run_one, fname, code, batch_dir)
                    with _BATCHES_LOCK:
                        batch_dict["futures"].append(fut)
                    index_of[fut] = i
                    futures_to_wait.append(fut)
                except concurrent.futures.process.BrokenProcessPool:
                    _reset_pool()
                    results[i] = {
                        "file": fname,
                        "returncode": None,
                        "stdout": "",
                        "stderr": "BrokenProcessPool when submitting task",
                        "duration_sec": 0.0
                    }
                    done += 1

            if submitted_event:
                submitted_event.set()

            for fut in concurrent.futures.as_completed(futures_to_wait):
                i = index_of[fut]
                fname = f"{i}.py"
                try:
                    res = fut.result()
                    results[i] = res
                except concurrent.futures.CancelledError:
                    results[i] = {
                        "file": fname,
                        "returncode": None,
                        "stdout": "",
                        "stderr": "cancelled",
                        "duration_sec": 0.0
                    }
                except Exception as e:
                    if isinstance(e, concurrent.futures.process.BrokenProcessPool):
                        _reset_pool()
                    results[i] = {
                        "file": fname,
                        "returncode": None,
                        "stdout": "",
                        "stderr": str(e),
                        "duration_sec": 0.0
                    }
                done += 1
                with _BATCHES_LOCK:
                    is_cancelled = batch_dict.get("cancelled", False)
                if not is_cancelled:
                    _write_status(batch_dir, {
                        "state": "running",
                        "n": len(codes),
                        "done": done,
                        "mode": MODE,
                        "started_at": started_at
                    })
        else:
            executor = concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS)
            try:
                for i in range(len(codes)):
                    fname = f"{i}.py"
                    fut = executor.submit(run_script, fname, os.path.join(batch_dir, fname), batch_dir)
                    with _BATCHES_LOCK:
                        batch_dict["futures"].append(fut)
                    index_of[fut] = i
                    futures_to_wait.append(fut)

                if submitted_event:
                    submitted_event.set()

                for fut in concurrent.futures.as_completed(futures_to_wait):
                    i = index_of[fut]
                    fname = f"{i}.py"
                    try:
                        res = fut.result()
                        results[i] = res
                    except concurrent.futures.CancelledError:
                        results[i] = {
                            "file": fname,
                            "returncode": None,
                            "stdout": "",
                            "stderr": "cancelled",
                            "duration_sec": 0.0
                        }
                    except Exception as e:
                        results[i] = {
                            "file": fname,
                            "returncode": None,
                            "stdout": "",
                            "stderr": str(e),
                            "duration_sec": 0.0
                        }
                    done += 1
                    with _BATCHES_LOCK:
                        is_cancelled = batch_dict.get("cancelled", False)
                    if not is_cancelled:
                        _write_status(batch_dir, {
                            "state": "running",
                            "n": len(codes),
                            "done": done,
                            "mode": MODE,
                            "started_at": started_at
                        })
            finally:
                executor.shutdown(wait=True)

        with _BATCHES_LOCK:
            is_cancelled = batch_dict.get("cancelled", False)

        if is_cancelled:
            shutil.rmtree(batch_dir, ignore_errors=True)
            with _BATCHES_LOCK:
                if _BATCHES.get(batch_id) is batch_dict:
                    _BATCHES.pop(batch_id, None)
            return

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

        _write_status(batch_dir, {
            "state": "finished",
            "n": len(codes),
            "done": len(codes),
            "mode": MODE,
            "started_at": started_at,
            "finished_at": datetime.now(timezone.utc).isoformat()
        })
        with _BATCHES_LOCK:
            if _BATCHES.get(batch_id) is batch_dict:
                _BATCHES.pop(batch_id, None)

    except Exception as e:
        with _BATCHES_LOCK:
            if _BATCHES.get(batch_id) is batch_dict:
                _BATCHES.pop(batch_id, None)
        try:
            _write_status(batch_dir, {
                "state": "error",
                "error": str(e),
                "failed_at": datetime.now(timezone.utc).isoformat()
            })
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
        batch_dir = _new_batch_dir()
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
        "done": 0,
        "mode": MODE,
        "started_at": datetime.now(timezone.utc).isoformat()
    }
    try:
        _write_status(batch_dir, status_data)
    except Exception as e:
        return jsonify({"error": f"No se pudo guardar status.json: {e}", "batch_dir": batch_dir}), 500

    submitted_event = threading.Event()
    threading.Thread(target=_run_batch, args=(batch_id, batch_dir, payload, submitted_event), daemon=True).start()
    submitted_event.wait(timeout=2.0)

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
        "n": status_data.get("n", 0),
        "done": status_data.get("done", 0)
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

@bp.route('/run_code_async/<batch_id>', methods=['DELETE'])
def delete_batch(batch_id):
    if not batch_id.isdigit():
        return jsonify({"error": "batch_id must be numeric"}), 400

    batch_dir = os.path.join(TEMP_SCRIPTS_DIR, batch_id)

    with _BATCHES_LOCK:
        batch_info = _BATCHES.get(batch_id)
        if batch_info is not None:
            batch_info["cancelled"] = True
            futures = batch_info.get("futures", [])
            n_cancelled = sum(1 for f in futures if f.cancel())
            status_file = os.path.join(batch_dir, "status.json")
            status_data = {}
            if os.path.exists(status_file):
                try:
                    with open(status_file, "r", encoding="utf-8") as f:
                        status_data = json.load(f)
                except Exception:
                    pass
            n = status_data.get("n", 0)
            done = status_data.get("done", 0)
            _write_status(batch_dir, {
                "state": "cancelled",
                "n": n,
                "done": done
            })
            return jsonify({
                "batch_id": batch_id,
                "state": "cancelled",
                "cancelled": n_cancelled
            }), 200

    if os.path.exists(batch_dir):
        shutil.rmtree(batch_dir, ignore_errors=True)
        return jsonify({
            "batch_id": batch_id,
            "state": "deleted"
        }), 200

    return jsonify({"error": "Batch not found"}), 404
