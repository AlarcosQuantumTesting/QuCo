import pytest
import time
import json
import os
from flask import Flask
import endpoints.run_code_endpoint as rce
import endpoints.run_code_async_endpoint as rcae
import endpoints.common as comm

@pytest.fixture(params=["pool", "subprocess"])
def mode(request):
    return request.param

@pytest.fixture
def app_client(tmp_path, monkeypatch, mode):
    monkeypatch.setattr(rce, "TEMP_SCRIPTS_DIR", str(tmp_path))
    monkeypatch.setattr(rcae, "TEMP_SCRIPTS_DIR", str(tmp_path))
    monkeypatch.setattr(comm, "TEMP_SCRIPTS_DIR", str(tmp_path))
    monkeypatch.setattr(rcae, "MODE", mode)
    monkeypatch.setattr(rcae, "WORKERS", 2)

    rcae._reset_pool()

    app = Flask(__name__)
    app.register_blueprint(rce.bp)
    app.register_blueprint(rcae.bp)
    client = app.test_client()

    yield client, tmp_path

    rcae._reset_pool()

def test_run_code_async_success(app_client):
    client, tmp_path = app_client
    scripts = [f"print({i})" for i in range(12)]
    resp = client.post("/run_code_async", data=json.dumps(scripts), content_type="application/json")
    assert resp.status_code == 202
    batch_id = resp.get_json()["batch_id"]

    start = time.time()
    finished = False
    while time.time() - start < 60:
        s_resp = client.get(f"/run_code_async/status/{batch_id}")
        assert s_resp.status_code == 200
        if s_resp.get_json().get("state") == "finished":
            finished = True
            break
        time.sleep(0.1)
    assert finished

    r_resp = client.get(f"/run_code_async/results/{batch_id}")
    assert r_resp.status_code == 200
    data = r_resp.get_json()
    results = data["results"]
    assert len(results) == 12
    for i, r in enumerate(results):
        assert r["file"] == f"{i}.py"
        assert r["returncode"] == 0
        assert r["stdout"].strip() == str(i)

    assert not os.path.exists(os.path.join(tmp_path, batch_id))

def test_script_with_exception(app_client):
    client, tmp_path = app_client
    scripts = [
        "print('ok')",
        "raise ValueError('x')",
        "print('still ok')"
    ]
    resp = client.post("/run_code_async", data=json.dumps(scripts), content_type="application/json")
    assert resp.status_code == 202
    batch_id = resp.get_json()["batch_id"]

    start = time.time()
    while time.time() - start < 60:
        s_resp = client.get(f"/run_code_async/status/{batch_id}")
        if s_resp.status_code == 200 and s_resp.get_json().get("state") == "finished":
            break
        time.sleep(0.1)

    r_resp = client.get(f"/run_code_async/results/{batch_id}")
    assert r_resp.status_code == 200
    results = r_resp.get_json()["results"]
    assert len(results) == 3
    assert results[0]["returncode"] == 0
    assert results[0]["stdout"].strip() == "ok"
    assert results[1]["returncode"] == 1
    assert "ValueError" in results[1]["stderr"]
    assert results[2]["returncode"] == 0
    assert results[2]["stdout"].strip() == "still ok"

def test_qiskit_execution(app_client):
    client, tmp_path = app_client
    script = """from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator

qc = QuantumCircuit(2, 2)
qc.h(0)
qc.cx(0, 1)
qc.measure([0, 1], [0, 1])
sim = AerSimulator()
res = sim.run(qc, shots=100).result()
print(res.get_counts())
"""
    resp = client.post("/run_code_async", data=json.dumps([script]), content_type="application/json")
    assert resp.status_code == 202
    batch_id = resp.get_json()["batch_id"]

    start = time.time()
    while time.time() - start < 60:
        s_resp = client.get(f"/run_code_async/status/{batch_id}")
        if s_resp.status_code == 200 and s_resp.get_json().get("state") == "finished":
            break
        time.sleep(0.1)

    r_resp = client.get(f"/run_code_async/results/{batch_id}")
    assert r_resp.status_code == 200
    results = r_resp.get_json()["results"]
    assert results[0]["returncode"] == 0
    stdout = results[0]["stdout"]
    assert ("00" in stdout) or ("11" in stdout)

def test_isolation(app_client):
    client, tmp_path = app_client
    scripts = [
        "x = 1\nprint('A done')",
        "print('x' in globals())\nprint('B done')"
    ]
    resp = client.post("/run_code_async", data=json.dumps(scripts), content_type="application/json")
    assert resp.status_code == 202
    batch_id = resp.get_json()["batch_id"]

    start = time.time()
    while time.time() - start < 60:
        s_resp = client.get(f"/run_code_async/status/{batch_id}")
        if s_resp.status_code == 200 and s_resp.get_json().get("state") == "finished":
            break
        time.sleep(0.1)

    r_resp = client.get(f"/run_code_async/results/{batch_id}")
    assert r_resp.status_code == 200
    results = r_resp.get_json()["results"]
    assert results[0]["returncode"] == 0
    assert results[1]["returncode"] == 0
    lines = results[1]["stdout"].strip().split()
    assert lines[0] == "False"

def test_results_while_running_409(app_client):
    client, tmp_path = app_client
    scripts = ["import time; time.sleep(2); print('done')"]
    resp = client.post("/run_code_async", data=json.dumps(scripts), content_type="application/json")
    assert resp.status_code == 202
    batch_id = resp.get_json()["batch_id"]

    r_resp = client.get(f"/run_code_async/results/{batch_id}")
    assert r_resp.status_code == 409
    assert r_resp.get_json()["state"] == "running"

def test_status_invalid_or_missing(app_client):
    client, _ = app_client
    resp_bad = client.get("/run_code_async/status/abc")
    assert resp_bad.status_code == 400
    resp_not_found = client.get("/run_code_async/status/999999")
    assert resp_not_found.status_code == 404

def test_post_empty_array_400(app_client):
    client, _ = app_client
    resp = client.post("/run_code_async", data=json.dumps([]), content_type="application/json")
    assert resp.status_code == 400

def test_run_code_sync_numerical_order(app_client):
    client, tmp_path = app_client
    scripts = [f"print({i})" for i in range(12)]
    resp = client.post("/run_code", data=json.dumps(scripts), content_type="application/json")
    assert resp.status_code == 200
    results = resp.get_json()["results"]
    assert len(results) == 12
    for i, r in enumerate(results):
        assert r["file"] == f"{i}.py"
        assert r["stdout"].strip() == str(i)
