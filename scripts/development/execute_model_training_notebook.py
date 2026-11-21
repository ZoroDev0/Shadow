"""SHADOW Research: In-process Notebook Execution Engine for Notebook 04.

Executes all code cells in '04_Baseline Model Training & Multimodal Evaluation.ipynb'
using the project's Python environment, captures stdout, formats tables, and encodes
Matplotlib visualizations into standard Jupyter notebook cell output structures.
"""

import base64
import contextlib
import io
import json
import os
import sys
import traceback
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
mpl_dir = PROJECT_ROOT / ".venv" / "share" / "matplotlib"
mpl_dir.mkdir(parents=True, exist_ok=True)
os.environ["MPLCONFIGDIR"] = str(mpl_dir)

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

NOTEBOOK_PATH = PROJECT_ROOT / "ml-research" / "notebooks" / "04_Baseline Model Training & Multimodal Evaluation.ipynb"
FIGURES_DIR = PROJECT_ROOT / "artifacts" / "figures"
FIGURES_DIR.mkdir(parents=True, exist_ok=True)

def execute_model_training_notebook():
    print(f"[Executor] Reading notebook: {NOTEBOOK_PATH}")
    with open(NOTEBOOK_PATH, "r", encoding="utf-8") as f:
        nb = json.load(f)

    exec_globals = {
        "__name__": "__main__",
        "__file__": str(NOTEBOOK_PATH),
    }

    execution_count = 1
    total_code_cells = sum(1 for c in nb["cells"] if c["cell_type"] == "code")
    print(f"[Executor] Found {total_code_cells} code cells to execute.")

    for i, cell in enumerate(nb["cells"]):
        if cell["cell_type"] != "code":
            continue

        code_text = "".join(cell["source"])
        print(f"\n[Executor] Executing cell {execution_count}/{total_code_cells}...")
        
        stdout_buf = io.StringIO()
        cell["outputs"] = []
        cell["execution_count"] = execution_count

        plt.close("all")

        try:
            with contextlib.redirect_stdout(stdout_buf), contextlib.redirect_stderr(stdout_buf):
                exec(code_text, exec_globals)
            
            output_text = stdout_buf.getvalue()
            if output_text:
                cell["outputs"].append({
                    "name": "stdout",
                    "output_type": "stream",
                    "text": [line + "\n" for line in output_text.rstrip().split("\n")]
                })
                print(f"  Output lines: {len(output_text.splitlines())}")

            # Check if matplotlib generated any figures
            fig_nums = plt.get_fignums()
            if fig_nums:
                for fig_idx, fig_num in enumerate(fig_nums):
                    fig = plt.figure(fig_num)
                    img_buf = io.BytesIO()
                    fig.savefig(img_buf, format="png", bbox_inches="tight", dpi=150)
                    img_buf.seek(0)
                    img_base64 = base64.b64encode(img_buf.read()).decode("utf-8")
                    
                    fig_filename = f"notebook04_cell_{execution_count}_fig_{fig_idx + 1}.png"
                    fig_save_path = FIGURES_DIR / fig_filename
                    with open(fig_save_path, "wb") as f_img:
                        f_img.write(img_buf.getvalue())

                    cell["outputs"].append({
                        "data": {
                            "image/png": img_base64,
                            "text/plain": ["<Figure size ...>"]
                        },
                        "metadata": {},
                        "output_type": "display_data"
                    })
                    print(f"  Captured figure -> {fig_save_path.name}")
                plt.close("all")

            print(f"  Cell {execution_count} finished successfully.")
            execution_count += 1

        except Exception as e:
            err_trace = traceback.format_exc()
            print(f"  Cell {execution_count} FAILED: {e}")
            print(err_trace)
            cell["outputs"].append({
                "ename": type(e).__name__,
                "evalue": str(e),
                "output_type": "error",
                "traceback": err_trace.splitlines()
            })
            with open(NOTEBOOK_PATH, "w", encoding="utf-8") as f:
                json.dump(nb, f, indent=1)
            sys.exit(1)

    print("\n[Executor] All code cells executed successfully!")
    with open(NOTEBOOK_PATH, "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=1)
    print(f"[Executor] Updated notebook saved to: {NOTEBOOK_PATH}")

if __name__ == "__main__":
    execute_model_training_notebook()
