from flask import Blueprint, request, jsonify, send_file
import os
import mimetypes
import json
import subprocess
from datetime import datetime
from .common import *

bp = Blueprint("run_qiskit_editor", __name__)

def _run_qiskit_editor_path() -> str:
    """Ruta absoluta a run_qiskit_editor.py."""
    this_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.normpath(os.path.join(this_dir, "..", "run_qiskit_editor.py"))

def _write_status(batch_dir: str, data: dict) -> None:
    status_path = os.path.join(batch_dir, "status.json")
    with open(status_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def _read_status(batch_dir: str) -> dict:
    status_path = os.path.join(batch_dir, "status.json")
    if os.path.exists(status_path):
        with open(status_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

@bp.route("/run_qiskit_editor", methods=["POST"])
def run_qiskit_editor():
    iterations = request.args.get("iterations", default=1, type=int)
    overwrite = (request.args.get("overwrite", default="n") or "n").lower()
    runner = request.args.get("runner", default=1, type=int)
    ibm_token = request.args.get("ibm_token", default=None, type=str)
    ibm_instance = request.args.get("ibm_instance", default=None, type=str)

    if iterations is None or iterations < 1:
        return jsonify({"error": "El parámetro 'iterations' debe ser un entero >= 1"}), 400
    if overwrite not in {"y", "n"}:
        return jsonify({"error": "El parámetro 'overwrite' debe ser 'y' o 'n'"}), 400

    
    try:
        payload = json.loads(request.data.decode("utf-8"))
    except Exception:
        return jsonify({"error": "El cuerpo debe ser JSON válido con un array de cadenas"}), 400
    
    if not isinstance(payload, list) or not payload:
        return jsonify({"error": "El cuerpo debe ser un array JSON no vacío de cadenas"}), 400

    try:
        batch_dir = next_sequential_dir(TEMP_SCRIPTS_DIR)
    except Exception as e:
        return jsonify({"error": f"No se pudo crear el directorio: {e}"}), 500

    batch_id = os.path.basename(batch_dir)

    for i, code in enumerate(payload, start=1):
        fpath = os.path.join(batch_dir, f"p{i}.py")
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(code)

    import sys
    run_script = _run_qiskit_editor_path()
    cmd_list = [sys.executable, run_script, "p*.py", str(iterations), overwrite, str(runner)]
    if ibm_token: cmd_list.append(ibm_token)
    if ibm_instance: cmd_list.append(ibm_instance)

    stdout_txt = os.path.join(batch_dir, "stdout.txt")
    stderr_txt = os.path.join(batch_dir, "stderr.txt")
    rc_name = "return_code.txt"
    done_name = "done.flag"

    iso_utc = r'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'
    base_cmd = " ".join(f'"{arg}"' for arg in cmd_list)
    shell_cmd = f'{base_cmd} ; code=$?; echo $code > "{rc_name}"; echo {iso_utc} > "{done_name}"'

    try:
        with open(stdout_txt, "w", encoding="utf-8") as of, open(stderr_txt, "w", encoding="utf-8") as ef:
            proc = subprocess.Popen(
                ["bash", "-lc", shell_cmd],
                cwd=batch_dir,
                stdout=of,
                stderr=ef,
                start_new_session=True
            )
    except Exception as e:
        return jsonify({"error": f"Error al lanzar proceso: {e}"}), 500

    started_at = datetime.utcnow().isoformat() + "Z"
    _write_status(batch_dir, {
        "batch_id": batch_id,
        "state": "running",
        "pid": proc.pid,
        "command": " ".join(cmd_list),
        "started_at": started_at
    })

    return jsonify({
        "message": "Lote de editor recibido",
        "batch_id": batch_id,
        "batch_dir": os.path.abspath(batch_dir)
    }), 202

@bp.route("/run_qiskit_editor/status/<batch_id>", methods=["GET"])
def run_qiskit_editor_status(batch_id: str):
    batch_dir = os.path.join(TEMP_SCRIPTS_DIR, str(batch_id))
    if not os.path.isdir(batch_dir):
        return jsonify({"error": "batch_id no existe"}), 404

    status = _read_status(batch_dir)
    done_flag = os.path.join(batch_dir, "done.flag")
    
    if os.path.exists(done_flag):
        status["state"] = "finished"
        
    files_in_batch = []
    for f in sorted(os.listdir(batch_dir)):
        fpath = os.path.join(batch_dir, f)
        if os.path.isfile(fpath):
            files_in_batch.append({"name": f, "size": os.path.getsize(fpath)})

    return jsonify({
        "batch_id": batch_id,
        "state": status.get("state", "running"),
        "files": files_in_batch,
        "stdout_path": os.path.join(batch_dir, "stdout.txt"),
        "stderr_path": os.path.join(batch_dir, "stderr.txt")
    }), 200

@bp.route("/run_qiskit_editor/get_file/<int:batch_id>/<filename>", methods=["GET"])
def get_file(batch_id: int, filename: str):
    batch_dir = os.path.join(TEMP_SCRIPTS_DIR, str(batch_id))
    file_path = os.path.join(batch_dir, os.path.basename(filename))
    if not os.path.exists(file_path):
        return jsonify({"error": "Archivo no encontrado"}), 404

    guessed, _ = mimetypes.guess_type(file_path)
    mimetype = guessed or "text/plain"
    return send_file(file_path, mimetype=mimetype)
