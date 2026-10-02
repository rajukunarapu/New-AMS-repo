import os
import glob
import subprocess
import sys

scratch_dir = os.path.dirname(__file__)
test_files = [f for f in glob.glob(os.path.join(scratch_dir, "test_*.py")) if not f.endswith("test_user_prompt_eval.py")]

print(f"Found {len(test_files)} test files.")
for tf in test_files:
    fname = os.path.basename(tf)
    print(f"\n--- Running {fname} ---")
    res = subprocess.run([sys.executable, tf], capture_output=True, text=True)
    if res.returncode == 0:
        print(f"SUCCESS: {fname}")
    else:
        print(f"FAILED: {fname}")
        print("STDOUT:", res.stdout[:500])
        print("STDERR:", res.stderr[:500])
