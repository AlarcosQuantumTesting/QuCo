from flask import Blueprint, request, jsonify, send_file
import os
import mimetypes
import json
import subprocess
from datetime import datetime
from .common import *

bp = Blueprint("run_qiskit", __name__)

def _run_qiskit_path() -> str:
    """Ruta absoluta a run_qiskit.py (está en la raíz del proyecto)."""
    this_dir = os.path.dirname(os.path.abspath(__file__))    # .../endpoints
    return os.path.normpath(os.path.join(this_dir, "..", "run_qiskit.py"))


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


@bp.route("/run_qiskit", methods=["POST"])
def run_qiskit():
    # 1) Query params
    iterations = request.args.get("iterations", default=1, type=int)
    overwrite = (request.args.get("overwrite", default="n") or "n").lower()
    runner = request.args.get("runner", default=1, type=int)
    ibm_token = request.args.get("ibm_token", default=None, type=str)
    ibm_instance = request.args.get("ibm_instance", default=None, type=str)

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
    run_qiskit = _run_qiskit_path()
    pattern = "p*.py"
    cmd_list = ["python3", run_qiskit, pattern, str(iterations), overwrite, str(runner)]
    if ibm_token:
        cmd_list.append(ibm_token)
    if ibm_instance:
        cmd_list.append(ibm_instance)

    # Archivos de trazas y estado (NOMBRES dentro de batch_dir, porque usamos cwd=batch_dir)
    command_txt = os.path.join(batch_dir, "command.txt")
    stdout_txt  = os.path.join(batch_dir, "stdout.txt")
    stderr_txt  = os.path.join(batch_dir, "stderr.txt")

    # IMPORTANTÍSIMO: como cwd=batch_dir, estos deben ser simples nombres
    rc_name   = "return_code.txt"
    done_name = "done.flag"

    # Guardar el comando invocado (informativo)
    try:
        with open(command_txt, "w", encoding="utf-8") as cf:
            cf.write(" ".join(cmd_list) + "\n")
    except Exception:
        pass

    # 6) Lanzar proceso no bloqueante
    # Escribimos finished_at en ISO-8601 UTC al terminar
    iso_utc = r'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'
    # Construimos el comando con rutas adecuadas al cwd
    base_cmd = " ".join(f'"{arg}"' for arg in cmd_list)  # cita cada argumento por seguridad
    shell_cmd = f'{base_cmd} ; code=$?; echo $code > "{rc_name}"; echo {iso_utc} > "{done_name}"'

    try:
        with open(stdout_txt, "w", encoding="utf-8") as of, open(stderr_txt, "w", encoding="utf-8") as ef:
            proc = subprocess.Popen(
                ["bash", "-lc", shell_cmd],
                cwd=batch_dir,     # ← estamos dentro de temp_scripts/<id>
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

    # 7) Persistir estado inicial
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

    # 8) Responder inmediatamente
    return jsonify({
        "message": "Lote recibido. Proceso lanzado en segundo plano.",
        "batch_id": batch_id,
        "batch_dir": os.path.abspath(batch_dir)
    }), 202


@bp.route("/run_qiskit/status/<batch_id>", methods=["GET"])
def run_qiskit_status(batch_id: str):
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

    # Caso 1: hay bandera de finalización → terminó todo
    if os.path.exists(done_flag):
        state = "finished"

        # return_code
        if os.path.exists(rc_file):
            try:
                with open(rc_file, "r", encoding="utf-8") as f:
                    return_code = int((f.read() or "").strip())
            except Exception:
                return_code = None

        # finished_at: preferimos el contenido del fichero; si no, su mtime; si no, ahora
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

        # Persistimos (idempotente)
        status.update({
            "state": state,
            "return_code": return_code,
            "finished_at": finished_at
        })
        _write_status(batch_dir, status)

    else:
        # Caso 2: no hay bandera; comprobamos el PID (si lo tenemos)
        if pid is not None:
            try:
                pid_int = int(pid)
            except Exception:
                pid_int = None

            if pid_int is not None and not _pid_alive(pid_int):
                # El proceso ya no está, pero no hay done.flag → marcamos estado "finished" conservador,
                # y ponemos finished_at por mtime de stdout/stderr si existe, o ahora.
                state = "finished"
                if not finished_at:
                    candidate = None
                    try:
                        # usamos el más reciente entre stdout/stderr si existen
                        mt = max(
                            os.path.getmtime(p) for p in [stdout_txt, stderr_txt] if os.path.exists(p)
                        )
                        candidate = datetime.utcfromtimestamp(mt).isoformat() + "Z"
                    except Exception:
                        candidate = datetime.utcnow().isoformat() + "Z"
                    finished_at = candidate

                status.update({
                    "state": state,
                    "finished_at": finished_at
                })
                _write_status(batch_dir, status)
            else:
                state = "running"
        else:
            # Sin PID y sin flag: estado desconocido
            state = "unknown"

    # 🔹 Añadimos la lista de archivos del directorio del lote con nombre y tamaño
    try:
        files_in_batch = []
        for f in sorted(os.listdir(batch_dir)):
            fpath = os.path.join(batch_dir, f)
            if os.path.isfile(fpath):
                size_bytes = os.path.getsize(fpath)
                files_in_batch.append({
                    "name": f,
                    "size": size_bytes
                })
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
        "files": files_in_batch  # 👈 Ahora cada archivo tiene 'name' y 'size'
    }), 200


def _batch_dir(batch_id: int) -> str:
    """Directorio absoluto del lote N (p.ej., temp_scripts/7)."""
    base = os.path.abspath(TEMP_SCRIPTS_DIR)
    return os.path.join(base, str(batch_id))

@bp.route("/run_qiskit/get_results/<int:batch_id>", methods=["GET"])
def get_results(batch_id: int):
    """
    Devuelve el fichero all_results.csv del lote <batch_id>.
    """
    batch_dir = _batch_dir(batch_id)
    csv_path = os.path.join(batch_dir, "all_results.csv")
    if not os.path.isdir(batch_dir):
        return jsonify({"error": "El lote no existe", "batch_id": batch_id}), 404
    if not os.path.exists(csv_path):
        return jsonify({"error": "No se encontró all_results.csv en el lote indicado", "batch_id": batch_id}), 404

    # Descarga directa del CSV
    return send_file(
        csv_path,
        mimetype="text/csv",
        as_attachment=True,
        download_name=f"all_results_{batch_id}.csv",
        conditional=True,   # habilita 304/Range cuando procede
        max_age=0
    )

@bp.route("/run_qiskit/get_summary/<int:batch_id>", methods=["GET"])
def get_summary(batch_id: int):
    """
    Devuelve el fichero summary.csv del lote <batch_id>.
    """
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


@bp.route("/run_qiskit/help", methods=["GET"])
def run_qiskit_help():
    """
    Devuelve una descripción de los endpoints disponibles en run_qiskit.
    """
    help_info = {
        "module": "run_qiskit",
        "description": "Endpoints para ejecutar y consultar resultados de experimentos Qiskit.",
        "endpoints": {
            "POST /run_qiskit": {
                "description": (
                    "Recibe un array JSON de programas Python, los guarda en un lote secuencial "
                    "y lanza su ejecución en segundo plano usando run_qiskit.py."
                ),
                "query_params": {
                    "iterations": "Número de iteraciones (int, por defecto=1).",
                    "overwrite": "Sobrescribir resultados previos: 'y' o 'n' (por defecto='n').",
                    "runner": "Tipo de ejecución (int, por defecto=1).",
                    "ibm_token": "Token de IBM Quantum (opcional).",
                    "ibm_instance": "Identificador de la instancia IBM Quantum (opcional)."
                },
                "body": "JSON con un array de cadenas, cada una con el código Python a ejecutar.",
                "returns": {
                    "202": "Confirmación con 'batch_id' y ruta del lote creado."
                }
            },
            "GET /run_qiskit/status/<batch_id>": {
                "description": "Consulta el estado del lote indicado.",
                "returns": {
                    "state": "running | finished | error",
                    "started_at": "Fecha/hora UTC de inicio.",
                    "finished_at": "Fecha/hora UTC de finalización (si aplica).",
                    "stdout_path": "Ruta al archivo stdout.txt.",
                    "stderr_path": "Ruta al archivo stderr.txt."
                }
            },
            "GET /run_qiskit/get_results/<batch_id>": {
                "description": "Descarga el fichero all_results.csv del lote indicado.",
                "returns": "Archivo CSV con resultados detallados de ejecución."
            },
            "GET /run_qiskit/get_summary/<batch_id>": {
                "description": "Descarga el fichero summary.csv del lote indicado.",
                "returns": "Archivo CSV con resumen de ejecución."
            }
        }
    }

    return jsonify(help_info), 200


def _send_text_file(path: str, download_name: str):
    """
    Envía un archivo de texto con soporte para descarga opcional mediante ?download=y|n.
    """
    if not os.path.exists(path):
        return None
    # Por defecto: visualizar en navegador; si ?download=y, forzar descarga
    download = (request.args.get("download", "n") or "n").lower() == "y"
    return send_file(
        path,
        mimetype="text/plain; charset=utf-8",
        as_attachment=download,
        download_name=download_name,
        conditional=True,
        max_age=0
    )

@bp.route("/run_qiskit/get_stdout/<int:batch_id>", methods=["GET"])
def get_stdout(batch_id: int):
    """
    Devuelve el archivo stdout.txt del lote <batch_id>.
    ?download=y para forzar descarga (opcional).
    """
    batch_dir = _batch_dir(batch_id)
    if not os.path.isdir(batch_dir):
        return jsonify({"error": "El lote no existe", "batch_id": batch_id}), 404

    stdout_path = os.path.join(batch_dir, "stdout.txt")
    resp = _send_text_file(stdout_path, f"stdout_{batch_id}.txt")
    if resp is None:
        return jsonify({"error": "No se encontró stdout.txt en el lote indicado", "batch_id": batch_id}), 404
    return resp

@bp.route("/run_qiskit/get_stderr/<int:batch_id>", methods=["GET"])
def get_stderr(batch_id: int):
    """
    Devuelve el archivo stderr.txt del lote <batch_id>.
    ?download=y para forzar descarga (opcional).
    """
    batch_dir = _batch_dir(batch_id)
    if not os.path.isdir(batch_dir):
        return jsonify({"error": "El lote no existe", "batch_id": batch_id}), 404

    stderr_path = os.path.join(batch_dir, "stderr.txt")
    resp = _send_text_file(stderr_path, f"stderr_{batch_id}.txt")
    if resp is None:
        return jsonify({"error": "No se encontró stderr.txt en el lote indicado", "batch_id": batch_id}), 404
    return resp

@bp.route("/run_qiskit/get_file/<int:batch_id>/<filename>", methods=["GET"])
def get_file(batch_id: int, filename: str):
    '''
    Devuelve uno de los ficheros permitidos del lote <batch_id>.
    Ficheros permitidos: summary.csv, all_results.csv, stdout.txt, stderr.txt.
    Uso: GET /run_qiskit/get_file/12/summary.csv[?download=y]

    allowed = {"summary.csv", "all_results.csv", "stdout.txt", "stderr.txt"}
'''
    # Normalización y validación del nombre (evita path traversal)
    safe_name = os.path.basename(filename)


    batch_path = _batch_dir(batch_id)
    if not os.path.isdir(batch_path):
        return jsonify({"error": "El lote no existe", "batch_id": batch_id}), 404

    file_path = os.path.join(batch_path, safe_name)
    if not os.path.exists(file_path):
        return jsonify({"error": f"No se encontró {safe_name} en el lote indicado", "batch_id": batch_id}), 404

    # Resolución de mimetype
    guessed, _ = mimetypes.guess_type(file_path)
    mimetype = guessed or ("text/csv" if safe_name.endswith(".csv") else "text/plain; charset=utf-8")

    # ¿Descarga forzada?
    download = (request.args.get("download", "n") or "n").lower() == "y"

    return send_file(
        file_path,
        mimetype=mimetype,
        as_attachment=download,
        download_name=f"{safe_name.split('.')[0]}_{batch_id}.{safe_name.split('.')[-1]}",
        conditional=True,
        max_age=0
    )