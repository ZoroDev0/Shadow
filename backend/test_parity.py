import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import app as backend
from app import detect_local

GOLDEN = Path(__file__).with_name("golden.json")


GOLDEN_ENTRY_COUNT = 101  # 86 project-written self-tests + 15 extra parity cases


def test_all_golden_verdicts_and_scores():
    outputs = json.loads(GOLDEN.read_text(encoding="utf-8"))
    # Every entry must be exercised: a truncated or partially written golden
    # file must fail here rather than silently shrink the parity set.
    assert len(outputs) == GOLDEN_ENTRY_COUNT, (
        f"golden.json has {len(outputs)} entries, expected {GOLDEN_ENTRY_COUNT}"
    )
    assert len({item["id"] for item in outputs}) == GOLDEN_ENTRY_COUNT
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


def test_model_missing_is_silent(monkeypatch):
    monkeypatch.setattr(backend, "ML_ENABLED", True)
    monkeypatch.setattr(backend, "SHADOW_MODEL_PATH", "/tmp/model-that-does-not-exist.txt")
    monkeypatch.setattr(backend, "_ML_MODEL_LOADED", False)
    monkeypatch.setattr(backend, "_ML_MODEL", None)
    assert backend.load_shadow_model() is None
    assert backend.detect_with_ml("Your SBI account is blocked.")["verdict"] in {"safe", "suspicious", "scam"}


def test_model_error_is_silent(monkeypatch):
    monkeypatch.setattr(backend, "ML_ENABLED", True)
    monkeypatch.setattr(backend, "SHADOW_MODEL_PATH", "/tmp/broken-model.txt")
    monkeypatch.setattr(backend, "_ML_MODEL_LOADED", False)
    monkeypatch.setattr(backend, "_ML_MODEL", None)
    assert backend.detect_with_ml("Hello")["score"] >= 0


def test_ml_contribution_is_bounded(monkeypatch):
    monkeypatch.setattr(backend, "ML_ENABLED", True)
    monkeypatch.setattr(backend, "_model_probability", lambda url: 1.0)
    result = backend.detect_with_ml("A strange message: http://generic-danger.xyz/login")
    delta = result["score"] - detect_local("A strange message: http://generic-danger.xyz/login")["score"]
    assert 0 <= delta <= backend.ML_POSITIVE_MAX


def test_hard_scam_is_never_lowered(monkeypatch):
    monkeypatch.setattr(backend, "ML_ENABLED", True)
    monkeypatch.setattr(backend, "_model_probability", lambda url: 0.0)
    text = "Install AnyDesk and share the 9-digit code immediately."
    result = backend.detect_with_ml(text)
    assert result["verdict"] == "scam"
    assert result["score"] >= 70


def test_official_domains_never_receive_ml_contribution(monkeypatch):
    monkeypatch.setattr(backend, "ML_ENABLED", True)
    monkeypatch.setattr(backend, "_model_probability", lambda url: 1.0)
    text = "Track your order at sbi.co.in/track/123"
    assert backend.detect_with_ml(text)["score"] == detect_local(text)["score"]


def test_safe_cases_never_move_above_safe(monkeypatch):
    outputs = json.loads(GOLDEN.read_text(encoding="utf-8"))
    monkeypatch.setattr(backend, "ML_ENABLED", True)
    monkeypatch.setattr(backend, "_model_probability", lambda url: 1.0)
    for item in outputs:
        if item["id"].startswith("G") and item["expect"] == "safe":
            got = backend.detect_with_ml(item["text"])
            assert got["verdict"] == "safe", (item["id"], got)


def test_analyze_rejects_text_over_5000_characters():
    client = TestClient(backend.app)
    response = client.post("/analyze", json={"text": "A" * 5001})
    assert response.status_code == 422


def test_analyze_request_size_limit():
    client = TestClient(backend.app)
    response = client.post("/analyze", content=b"{" + b"x" * 65_000 + b"}", headers={"Content-Type": "application/json"})
    assert response.status_code == 413


def test_normalisation_matches_shared_fixtures():
    """The TS engine asserts the identical fixture file in
    src/detection/normalize.test.ts — this is the parity contract."""
    fixtures_path = Path(__file__).resolve().parents[1] / "src" / "detection" / "normalizeFixtures.json"
    fixtures = json.loads(fixtures_path.read_text(encoding="utf-8"))
    for fixture in fixtures:
        assert backend.normalize_text(fixture["input"]) == fixture["expected"], fixture["name"]


def test_analyze_works_with_ml_disabled_and_no_model_present(monkeypatch):
    """The shipped configuration: ML_ENABLED=false, SHADOW_MODEL_PATH empty, no model file."""
    monkeypatch.setattr(backend, "ML_ENABLED", False)
    monkeypatch.setattr(backend, "SHADOW_MODEL_PATH", "")
    assert not Path("models").exists() or not list(Path("models").glob("*")), "no model tree expected"
    client = TestClient(backend.app)
    response = client.post(
        "/analyze",
        json={"text": "Your SBI account is blocked. KYC update now: http://sbi-kyc-update.xyz"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["verdict"] == "scam"
    assert 0 <= body["score"] <= 100
