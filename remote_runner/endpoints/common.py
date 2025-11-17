import os

TEMP_SCRIPTS_DIR = "/home/qexec/temp_scripts"
os.makedirs(TEMP_SCRIPTS_DIR, exist_ok=True)

def next_sequential_dir(base_dir: str) -> str:
    existing = []
    for name in os.listdir(base_dir):
        if name.isdigit():
            try:
                existing.append(int(name))
            except ValueError:
                pass
    next_id = (max(existing) + 1) if existing else 1
    seq_dir = os.path.join(base_dir, str(next_id))
    os.makedirs(seq_dir, exist_ok=False)
    return seq_dir  # p.ej. temp_scripts/7