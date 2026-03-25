from flask import Blueprint, request, jsonify, send_file
import os
import mimetypes
import json
import subprocess
from datetime import datetime
from .common import *

bp = Blueprint("run_cirq", __name__)

def _run_cirq_path() -> str:
    """Ruta absoluta a run_cirq.py (está en la raíz del proyecto)."""
    this_dir = os.path.dirname(os.path.abspath(__file__))  # .../endpoints
    return os.path.normpath(os.path.join(this_dir, "..", "run_cirq.py"))

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

@bp.route("/run_cirq", methods=["POST"])
def run_cirq():
    # 1) Query params (mantenemos misma forma que run_qiskit)
    iterations = request.args.get("iterations", default=1, type=int)
    overwrite = (request.args.get("overwrite", default="n") or "n").lower()
    runner = request.args.get("runner", default=1, type=int)

    if iterations is None or iterations < 1:
        return jsonify({"error": "El parámetro 'iterations' debe ser un entero >= 1"}), 400
    if overwrite not in {"y", "n"}:
        return jsonify({"error": "El parámetro 'overwrite' debe ser 'y' o 'n'"}), 400

    # 2) Body: JSON array de cadenas
    try:
        payload = json.loads(request.data.decode("utf-8"))
    except Exception:
        return jsonify({"error": "El cuerpo debe ser JSON válido con un array de cadenas"}), 400

    if not isinstance(payload, list) or not payload or not all(isinstance(s, str) for s in payload):
        return jsonify({"error": "El cuerpo debe ser un array JSON no vacío de cadenas (código Python)"}), 400

    # 3) Crear carpeta de lote
    try:
        batch_dir = next_sequential_dir(TEMP_SCRIPTS_DIR)  # p.ej. temp_scripts/8
    except Exception as e:
        return jsonify({"error": f"No se pudo crear el directorio secuencial: {e}"}), 500

    batch_id = os.path.basename(batch_dir)

    # 4) Guardar p1.py, p2.py, ...
    saved_files = []
    for i, code in enumerate(payload, start=1):
        fname = f"p{i}.py"
        fpath = os.path.join(batch_dir, fname)
        try:
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(code)
            saved_files.append(fpath)
        except Exception as e:
            return jsonify({"error": f"No se pudo guardar {fname}: {e}", "batch_dir": batch_dir}), 500

    # 5) Preparar ejecución en segundo plano
    run_cirq = _run_cirq_path()
    pattern = "p*.py"
    cmd_list = ["python3", run_cirq, pattern, str(iterations), overwrite, str(runner)]

    command_txt = os.path.join(batch_dir, "command.txt")
    stdout_txt  = os.path.join(batch_dir, "stdout.txt")
    stderr_txt  = os.path.join(batch_dir, "stderr.txt")

    rc_name   = "return_code.txt"
    done_name = "done.flag"

    try:
        with open(command_txt, "w", encoding="utf-8") as cf:
            cf.write(" ".join(cmd_list) + "\n")
    except Exception:
        pass

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
        return jsonify({"error": f"No se pudo lanzar el proceso en segundo plano: {e}", "batch_dir": batch_dir}), 500

    started_at = datetime.utcnow().isoformat() + "Z"
    _write_status(batch_dir, {
        "batch_id": batch_id,
        "state": "running",
        "pid": proc.pid,
        "command": " ".join(cmd_list),
        "started_at": started_at,
        "stdout_path": stdout_txt,
        "stderr_path": stderr_txt
    })

    return jsonify({
        "message": "Lote recibido. Proceso lanzado en segundo plano.",
        "batch_id": batch_id,
        "batch_dir": os.path.abspath(batch_dir)
    }), 202


@bp.route("/run_cirq/status/<batch_id>", methods=["GET"])
def run_cirq_status(batch_id: str):
    batch_dir = os.path.join(TEMP_SCRIPTS_DIR, str(batch_id))
    if not (batch_id.isdigit() and os.path.isdir(batch_dir)):
        return jsonify({"error": "batch_id inválido o inexistente"}), 404

    status = _read_status(batch_dir)

    stdout_txt  = os.path.join(batch_dir, "stdout.txt")
    stderr_txt  = os.path.join(batch_dir, "stderr.txt")
    rc_file     = os.path.join(batch_dir, "return_code.txt")
    done_flag   = os.path.join(batch_dir, "done.flag")
    summary_csv = os.path.join(batch_dir, "summary.csv")
    details_csv = os.path.join(batch_dir, "all_results.csv")

    state = status.get("state", "running")
    return_code = status.get("return_code")
    finished_at = status.get("finished_at")
    pid = status.get("pid")

    def _pid_alive(pid_int: int) -> bool:
        try:
            os.kill(pid_int, 0)
            return True
        except OSError:
            return False

    if os.path.exists(done_flag):
        state = "finished"

        if os.path.exists(rc_file):
            try:
                with open(rc_file, "r", encoding="utf-8") as f:
                    return_code = int((f.read() or "").strip())
            except Exception:
                return_code = None

        try:
            with open(done_flag, "r", encoding="utf-8") as f:
                ts = (f.read() or "").strip()
                finished_at = ts or None
        except Exception:
            finished_at = None

        if not finished_at:
            try:
                mtime = os.path.getmtime(done_flag)
                finished_at = datetime.utcfromtimestamp(mtime).isoformat() + "Z"
            except Exception:
                finished_at = datetime.utcnow().isoformat() + "Z"

        status.update({
            "state": state,
            "return_code": return_code,
            "finished_at": finished_at
        })
        _write_status(batch_dir, status)

    else:
        if pid is not None:
            try:
                pid_int = int(pid)
            except Exception:
                pid_int = None

            if pid_int is not None and not _pid_alive(pid_int):
                state = "finished"
                if not finished_at:
                    try:
                        mt = max(
                            os.path.getmtime(p) for p in [stdout_txt, stderr_txt] if os.path.exists(p)
                        )
                        finished_at = datetime.utcfromtimestamp(mt).isoformat() + "Z"
                    except Exception:
                        finished_at = datetime.utcnow().isoformat() + "Z"

                status.update({
                    "state": state,
                    "finished_at": finished_at
                })
                _write_status(batch_dir, status)
            else:
                state = "running"
        else:
            state = "unknown"

    try:
        files_in_batch = []
        for f in sorted(os.listdir(batch_dir)):
            fpath = os.path.join(batch_dir, f)
            if os.path.isfile(fpath):
                files_in_batch.append({"name": f, "size": os.path.getsize(fpath)})
    except Exception as e:
        files_in_batch = [{"error": f"No se pudieron listar los archivos: {e}"}]

    return jsonify({
        "batch_id": batch_id,
        "batch_dir": os.path.abspath(batch_dir),
        "state": state,
        "return_code": return_code,
        "started_at": status.get("started_at"),
        "finished_at": finished_at,
        "stdout_path": stdout_txt if os.path.exists(stdout_txt) else None,
        "stderr_path": stderr_txt if os.path.exists(stderr_txt) else None,
        "summary_csv": summary_csv if os.path.exists(summary_csv) else None,
        "details_csv": details_csv if os.path.exists(details_csv) else None,
        "files": files_in_batch
    }), 200


def _batch_dir(batch_id: int) -> str:
    base = os.path.abspath(TEMP_SCRIPTS_DIR)
    return os.path.join(base, str(batch_id))


@bp.route("/run_cirq/get_results/<int:batch_id>", methods=["GET"])
def get_results(batch_id: int):
    batch_dir = _batch_dir(batch_id)
    csv_path = os.path.join(batch_dir, "all_results.csv")
    if not os.path.isdir(batch_dir):
        return jsonify({"error": "El lote no existe", "batch_id": batch_id}), 404
    if not os.path.exists(csv_path):
        return jsonify({"error": "No se encontró all_results.csv en el lote indicado", "batch_id": batch_id}), 404

    return send_file(
        csv_path,
        mimetype="text/csv",
        as_attachment=True,
        download_name=f"all_results_{batch_id}.csv",
        conditional=True,
        max_age=0
    )


@bp.route("/run_cirq/get_summary/<int:batch_id>", methods=["GET"])
def get_summary(batch_id: int):
    batch_dir = _batch_dir(batch_id)
    csv_path = os.path.join(batch_dir, "summary.csv")
    if not os.path.isdir(batch_dir):
        return jsonify({"error": "El lote no existe", "batch_id": batch_id}), 404
    if not os.path.exists(csv_path):
        return jsonify({"error": "No se encontró summary.csv en el lote indicado", "batch_id": batch_id}), 404

    return send_file(
        csv_path,
        mimetype="text/csv",
        as_attachment=True,
        download_name=f"summary_{batch_id}.csv",
        conditional=True,
        max_age=0
    )


@bp.route("/run_cirq/help", methods=["GET"])
def run_cirq_help():
    help_info = {
        "module": "run_cirq",
        "description": "Endpoints para ejecutar y consultar resultados de experimentos Cirq.",
        "endpoints": {
            "POST /run_cirq": {
                "description": (
                    "Recibe un array JSON de programas Python, los guarda en un lote secuencial "
                    "y lanza su ejecución en segundo plano usando run_cirq.py."
                ),
                "query_params": {
                    "iterations": "Número de iteraciones (int, por defecto=1).",
                    "overwrite": "Sobrescribir resultados previos: 'y' o 'n' (por defecto='n').",
                    "runner": "Tipo de ejecución (int, por defecto=1)."
                },
                "body": "JSON con un array de cadenas, cada una con el código Python a ejecutar.",
                "returns": {"202": "Confirmación con 'batch_id' y ruta del lote creado."}
            },
            "GET /run_cirq/status/<batch_id>": {"description": "Consulta el estado del lote indicado."},
            "GET /run_cirq/get_results/<batch_id>": {"description": "Descarga all_results.csv del lote."},
            "GET /run_cirq/get_summary/<batch_id>": {"description": "Descarga summary.csv del lote."},
            "GET /run_cirq/get_stdout/<batch_id>": {"description": "Devuelve stdout.txt del lote."},
            "GET /run_cirq/get_stderr/<batch_id>": {"description": "Devuelve stderr.txt del lote."},
            "GET /run_cirq/get_file/<batch_id>/<filename>": {"description": "Devuelve un fichero permitido del lote."}
        }
    }
    return jsonify(help_info), 200


def _send_text_file(path: str, download_name: str):
    if not os.path.exists(path):
        return None
    download = (request.args.get("download", "n") or "n").lower() == "y"
    return send_file(
        path,
        mimetype="text/plain; charset=utf-8",
        as_attachment=download,
        download_name=download_name,
        conditional=True,
        max_age=0
    )


@bp.route("/run_cirq/get_stdout/<int:batch_id>", methods=["GET"])
def get_stdout(batch_id: int):
    batch_dir = _batch_dir(batch_id)
    if not os.path.isdir(batch_dir):
        return jsonify({"error": "El lote no existe", "batch_id": batch_id}), 404

    stdout_path = os.path.join(batch_dir, "stdout.txt")
    resp = _send_text_file(stdout_path, f"stdout_{batch_id}.txt")
    if resp is None:
        return jsonify({"error": "No se encontró stdout.txt en el lote indicado", "batch_id": batch_id}), 404
    return resp


@bp.route("/run_cirq/get_stderr/<int:batch_id>", methods=["GET"])
def get_stderr(batch_id: int):
    batch_dir = _batch_dir(batch_id)
    if not os.path.isdir(batch_dir):
        return jsonify({"error": "El lote no existe", "batch_id": batch_id}), 404

    stderr_path = os.path.join(batch_dir, "stderr.txt")
    resp = _send_text_file(stderr_path, f"stderr_{batch_id}.txt")
    if resp is None:
        return jsonify({"error": "No se encontró stderr.txt en el lote indicado", "batch_id": batch_id}), 404
    return resp


@bp.route("/run_cirq/get_file/<int:batch_id>/<filename>", methods=["GET"])
def get_file(batch_id: int, filename: str):
    # Normalización y validación del nombre (evita path traversal)
    safe_name = os.path.basename(filename)

    allowed = {"summary.csv", "all_results.csv", "stdout.txt", "stderr.txt"}
    if safe_name not in allowed:
        return jsonify({"error": f"Fichero no permitido: {safe_name}", "allowed": sorted(allowed)}), 400

    batch_path = _batch_dir(batch_id)
    if not os.path.isdir(batch_path):
        return jsonify({"error": "El lote no existe", "batch_id": batch_id}), 404

    file_path = os.path.join(batch_path, safe_name)
    if not os.path.exists(file_path):
        return jsonify({"error": f"No se encontró {safe_name} en el lote indicado", "batch_id": batch_id}), 404

    guessed, _ = mimetypes.guess_type(file_path)
    mimetype = guessed or ("text/csv" if safe_name.endswith(".csv") else "text/plain; charset=utf-8")

    download = (request.args.get("download", "n") or "n").lower() == "y"

    return send_file(
        file_path,
        mimetype=mimetype,
        as_attachment=download,
        download_name=f"{safe_name.split('.')[0]}_{batch_id}.{safe_name.split('.')[-1]}",
        conditional=True,
        max_age=0
    )