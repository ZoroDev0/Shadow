import json
from pathlib import Path

from app import analyze_link

DATA = Path(__file__).with_name("eval") / "india_urls.json"

items = json.loads(DATA.read_text(encoding="utf-8"))
tp = fp = tn = fn = 0
false_positives = []
false_negatives = []

for item in items:
    result = analyze_link(item["url"])
    predicted = result["verdict"] != "safe"
    actual = item["label"] == 1
    if predicted and actual:
        tp += 1
    elif predicted and not actual:
        fp += 1
        false_positives.append(item["url"])
    elif not predicted and actual:
        fn += 1
        false_negatives.append(item["url"])
    else:
        tn += 1

precision = tp / (tp + fp) if tp + fp else 0.0
recall = tp / (tp + fn) if tp + fn else 0.0
report = {
    "model_enabled": False,
    "method": "rules-only link verdict",
    "sample_count": len(items),
    "lookalike_count": sum(item["label"] == 1 for item in items),
    "official_count": sum(item["label"] == 0 for item in items),
    "precision": round(precision, 4),
    "recall": round(recall, 4),
    "tp": tp,
    "fp": fp,
    "tn": tn,
    "fn": fn,
    "false_positives": false_positives,
    "false_negatives": false_negatives,
}
print(json.dumps(report, indent=2))
