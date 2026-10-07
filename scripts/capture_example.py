"""Capture the supplied example with explicit demo inputs: 0, 1, 7, 8.

Input is echoed into the transcript, just as in an interactive terminal.
This executes only the checked-in example, not arbitrary uploaded code.
"""
from pathlib import Path
import builtins
import contextlib
import io
import runpy

root = Path(__file__).resolve().parents[1]
answers = iter(["0", "1", "7", "8"])

def recorded_input(prompt=""):
    answer = next(answers)
    print(prompt + answer)
    return answer

original_input = builtins.input
transcript = io.StringIO()
try:
    builtins.input = recorded_input
    with contextlib.redirect_stdout(transcript):
        runpy.run_path(str(root / "examples/distance_measures.py"), run_name="__main__")
finally:
    builtins.input = original_input

path = root / "examples/distance_output.txt"
path.write_text(transcript.getvalue())
print(f"Saved actual output to {path}. Demo inputs: 0, 1, 7, 8.")
