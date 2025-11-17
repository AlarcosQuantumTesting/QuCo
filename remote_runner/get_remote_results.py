# get_remote_results.py
from qiskit_ibm_runtime import QiskitRuntimeService
from collections import defaultdict
import sys

def get_remote_results(job_id, token, instance):
    service = QiskitRuntimeService(
        channel="ibm_cloud",
        token=token,
        instance=instance
    )
    counts = service.job(job_id).result()[0].data['c'].get_counts()
    return counts

def process_results(job_id: str, block_size: int, token: str, instance: str, output_file: str) -> None:
    service = QiskitRuntimeService(
        channel="ibm_cloud",
        token=token,
        instance=instance
    )
    counts = service.job(job_id).result()[0].data['c'].get_counts()
    sums = defaultdict(int)
    for bs, freq in counts.items():
        for i in range(0, len(bs), block_size):
            block = bs[i:i+block_size]
            if len(block) == block_size:
                sums[block] += freq

    with open(output_file, 'w') as out:
        for block in sorted(sums):
            out.write(f"{block}\t{sums[block]}\n")

if __name__ == "__main__":
    if len(sys.argv) != 5:
        print("Uso: python3 get_remote_results.py <job_id> <block_size> <IBM_TOKEN> <IBM_INSTANCE>", file=sys.stderr)
        sys.exit(1)

    _, job_id, block_size, token, instance = sys.argv
    process_results(job_id, int(block_size), token, instance, f"results_{job_id}.csv")



