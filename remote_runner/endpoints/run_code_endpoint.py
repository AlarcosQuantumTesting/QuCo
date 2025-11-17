from flask import Blueprint, request, jsonify
import json
from datetime import datetime
import subprocess
import os

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

    for i in range(len(payload)):
        code = payload[i]
        fname = f"p{i + 1}.py"
        fpath = os.path.join(batch_dir, fname)
        try:
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(code)
        except Exception as e:
            return jsonify({"error": f"No se pudo guardar {fname}: {e}", "batch_dir": batch_dir}), 500

    '''
    try:
        result = subprocess.run(
            ["python3", script_path],
            capture_output=True,
            text=True,
            timeout=10  # segundos máximo
        )
        output = result.stdout
        errors = result.stderr
    except subprocess.TimeoutExpired:
        return jsonify({"error": "El script excedió el tiempo máximo de ejecución"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    '''
    # Responder con la salida
    return jsonify({
        "message": "Código ejecutado correctamente"

    }), 200
