import os
import sys
import io
import time
import contextlib
import traceback
import warnings
import multiprocessing
import concurrent.futures

def init_worker():
    os.environ.setdefault("OMP_NUM_THREADS", "1")
    try:
        import matplotlib
        matplotlib.use("Agg")
    except ImportError:
        pass
    try:
        import qiskit
        import qiskit_aer
    except ImportError:
        pass
    warnings.filterwarnings("ignore")

def run_one(fname: str, code: str, workdir: str) -> dict:
    start = time.time()
    try:
        os.chdir(workdir)
    except Exception:
        pass

    out = io.StringIO()
    err = io.StringIO()

    try:
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            fpath = os.path.join(workdir, fname)
            compiled = compile(code, fpath, "exec")
            globs = {"__name__": "__main__", "__file__": fpath}
            exec(compiled, globs)
        returncode = 0
    except SystemExit as se:
        returncode = 0 if se.code is None else (se.code if isinstance(se.code, int) else 1)
    except Exception:
        returncode = 1
        err.write(traceback.format_exc())

    duration = time.time() - start
    return {
        "file": fname,
        "returncode": returncode,
        "stdout": out.getvalue(),
        "stderr": err.getvalue(),
        "duration_sec": round(duration, 6),
    }

def make_pool(workers: int):
    return concurrent.futures.ProcessPoolExecutor(
        max_workers=workers,
        mp_context=multiprocessing.get_context("spawn"),
        initializer=init_worker,
        max_tasks_per_child=200
    )
