import json
from pathlib import Path

from app import detect_local

ROOT = Path(__file__).resolve().parents[1]
TS_PATH = ROOT / "backend" / "eval" / "unseen_from_ts.json"
OUTPUT = ROOT / "docs" / "eval_unseen.md"
if not TS_PATH.exists():
    raise SystemExit("Run the TypeScript unseen evaluation test first")

items = json.loads(TS_PATH.read_text(encoding="utf-8"))
rows = []
misses = []
false_positives = []
differences = []

for item in items:
    py = detect_local(item["text"])
    ts = item["ts"]
    verdict_ok = py["verdict"] == item["expected"]
    ts_ok = ts["verdict"] == item["expected"]
    if not ts_ok:
        misses.append({"id": item["id"], "engine": "ts", "expected": item["expected"], "got": ts["verdict"], "score": ts["score"], "text": item["text"]})
    if not verdict_ok:
        misses.append({"id": item["id"], "engine": "python", "expected": item["expected"], "got": py["verdict"], "score": py["score"], "text": item["text"]})
    if item["expected"] == "safe" and ts["verdict"] != "safe":
        false_positives.append({"id": item["id"], "engine": "ts", "got": ts["verdict"], "score": ts["score"], "text": item["text"]})
    if item["expected"] == "safe" and py["verdict"] != "safe":
        false_positives.append({"id": item["id"], "engine": "python", "got": py["verdict"], "score": py["score"], "text": item["text"]})
    if ts["verdict"] != py["verdict"] or ts["score"] != py["score"]:
        differences.append({"id": item["id"], "ts": ts, "python": py})
    rows.append({
        "id": item["id"],
        "expected": item["expected"],
        "text": item["text"],
        "ts": ts,
        "python": py,
    })

lines = [
    "# Unseen evaluator: 40 independent messages",
    "",
    "These messages were written for this hardening pass and were not included in the original 48-case suite.",
    "They are not evidence of production accuracy and should not be described as an external benchmark.",
    "",
    "| ID | Expected | TS verdict / score | Python verdict / score | Text |",
    "|---|---|---|---|---|",
]
for row in rows:
    text = row["text"].replace("|", "\\|").replace("\n", " ")
    lines.append(f"| {row['id']} | {row['expected']} | {row['ts']['verdict']} / {row['ts']['score']} | {row['python']['verdict']} / {row['python']['score']} | {text} |")

lines += ["", "## Misses", ""]
if misses:
    for miss in misses:
        lines.append(f"- **{miss['id']}** ({miss['engine']}): expected `{miss['expected']}`, got `{miss['got']}` at score {miss['score']}.")
else:
    lines.append("- None.")

lines += ["", "## False positives", ""]
if false_positives:
    for fp in false_positives:
        lines.append(f"- **{fp['id']}** ({fp['engine']}): got `{fp['got']}` at score {fp['score']}.")
else:
    lines.append("- None.")

lines += ["", "## TS vs Python differences", ""]
if differences:
    for diff in differences:
        lines.append(f"- **{diff['id']}**: TS `{diff['ts']['verdict']}/{diff['ts']['score']}`; Python `{diff['python']['verdict']}/{diff['python']['score']}`.")
else:
    lines.append("- None.")

lines += [
    "",
    "## Known limitations",
    "",
    "- Small typos, opaque paraphrases and completely novel themes can evade or misclassify messages.",
    "- This set is internally written and must not be presented as an external India-specific benchmark.",
]
OUTPUT.write_text("\n".join(lines), encoding="utf-8")
print(json.dumps({"ts_misses": len([x for x in misses if x["engine"] == "ts"]), "python_misses": len([x for x in misses if x["engine"] == "python"]), "false_positives": len(false_positives), "differences": len(differences)}, indent=2))
