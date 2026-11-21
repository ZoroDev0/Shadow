import json
from pathlib import Path

from app import detect_local

GOLDEN = Path(__file__).with_name("golden.json")


def test_all_golden_verdicts_and_scores():
    outputs = json.loads(GOLDEN.read_text(encoding="utf-8"))
    differences = []
    for item in outputs:
        got = detect_local(item["text"])
        if got["verdict"] != item["result"]["verdict"] or got["score"] != item["result"]["score"]:
            differences.append({
                "id": item["id"],
                "text": item["text"],
                "expected_verdict": item["result"]["verdict"],
                "expected_score": item["result"]["score"],
                "got_verdict": got["verdict"],
                "got_score": got["score"],
            })
    assert differences == [], differences


def test_contract_shape():
    result = detect_local("Hello")
    assert set(result) == {"verdict", "score", "reasons", "links", "advice", "highlights"}
    assert result["verdict"] in {"safe", "suspicious", "scam"}
    assert 0 <= result["score"] <= 100
