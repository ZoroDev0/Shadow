# SHADOW / ScamShield — Autonomous Phishing & Scam Detection Platform

> **A student-built cybersecurity research initiative and scam detection application defending users against web deception, malicious URLs, and smishing attacks.**

---

## 👥 Core Team & Authors

1. **Sasanka**
2. **Biswajeet**
3. **Riya**
4. **Kaustab**

---

## 1. Project Overview

SHADOW / ScamShield is an end-to-end platform designed to protect users against modern web-based and message-based deception attacks, including credential harvesting, brand impersonation, zero-day phishing, and SMS/WhatsApp smishing scams.

The platform provides:
1. **ScamShield Web Application**: Single-page, on-device scam detector for SMS, WhatsApp messages and URLs with an explainable rule engine and bilingual (English/Hindi) UI.
2. **Central Backend Detection Engine**: FastAPI service with Python parity mirror, rule engine validation, and optional ML evaluation pipelines.
3. **Multimodal ML Research Pipeline**: Comprehensive research pipeline exploring multimodal intelligence (URL lexical, static HTML DOM, and visual embeddings).

---

## 2. ScamShield Web Application

The interactive client detector is rule-based and runs on-device, with optional backend API support:

```text
index_9.html (original source of truth)
          |
          v
src/detection/rules.json --> engine.ts + links.ts
                               |
                               v
                           analyze.ts
                               |
                               v
src/screens + src/components + src/state + src/i18n
                               |
                               v
                         React/Vite UI
```

### Quickstart

```bash
npm install
npm run dev
npm test
npm run build
```

Set `VITE_API_BASE` to a backend origin to POST `{ "text": "..." }` to `${VITE_API_BASE}/analyze`.
When unset or on API failure, ScamShield uses its on-device local detector with an 8-second timeout.

---

## 3. Backend Detection Service

The FastAPI central backend service mirrors the detection rules and exposes evaluation endpoints:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
ML_ENABLED=false uvicorn app:app --host 0.0.0.0 --port 8000
```

### Endpoints

- `GET /health` — Service status check.
- `POST /analyze` — Submit message/URL for heuristic detection.
  ```bash
  curl -X POST http://localhost:8000/analyze \
    -H 'Content-Type: application/json' \
    -d '{"text":"Your SBI account is blocked. KYC update now: http://sbi-kyc-update.xyz"}'
  ```

---

## 4. Multimodal ML Research & Pipeline

The SHADOW research pipeline (`ml-research/`) explores **multimodal fusion** across complementary observation layers:
1. **URL Intelligence (Lexical & Structural):** Shannon entropy, token depth, path/query structure, digit ratio, IP usage, and suspicious brand keywords.
2. **HTML DOM Intelligence (Semantic Architecture):** Safe static parsing of forms, password inputs, hidden fields, cross-origin targets, and iframe embedding without executing untrusted JavaScript.
3. **Visual Intelligence (Deep Vision Embeddings):** Webpage screenshot representation via frozen pretrained backbones (**MobileNetV3-Small** / **ResNet-18**).
4. **Unified LightGBM Classifier:** Trained model located at `models/shadow_unified_classifier.txt` paired with `models/feature_schema.json`.

Sequential reproducible Jupyter research notebooks are located in `ml-research/notebooks/`:
- `Dataset Discovery.ipynb` (Phase 1): Discovery, safe acquisition, and integrity verification across 7 benchmark datasets.
- `02_Dataset Audit & Preprocessing.ipynb` (Phase 2): Auditing, deduplication, registered domain extraction, and domain-grouped leakage-free splitting.
- `03_Feature Engineering & Signal Extraction.ipynb` (Phase 3): Signal extraction across URL, DOM, and visual dimensions.
- `04_Baseline Model Training & Multimodal Evaluation.ipynb` (Phase 4): LightGBM training, threshold tuning, and multimodal evaluation.

---

## 5. Repository Directory Structure

```
.
├── backend/            # FastAPI central detection engine, parity tests & golden datasets
├── docs/               # System documentation, runbooks, QA procedures & research reports
│   └── research/       # Multimodal ML research specifications, catalogues & audit logs
├── index.html          # Vite entrypoint
├── index_9.html        # Original standalone single-page source of truth
├── ml-research/        # Research notebooks (01-04) and acquisition manifests
├── models/             # Trained unified classifier binary & feature schemas
├── public/             # Static web assets
├── scripts/            # Evaluation runners and ML automation scripts
├── src/                # ScamShield React/TypeScript frontend (engines, state, i18n, screens)
└── package.json        # Frontend dependencies and test scripts
```

---

## 6. Safety & Untrusted Data Protocol

- **Static Parsing Only:** External HTML pages are parsed statically with `BeautifulSoup` without executing untrusted JavaScript.
- **No Live Navigation:** Avoid live automated navigation to malicious URLs during testing.
- **Simulation Notice:** Device protection switches in the demo UI are simulated; screenshot upload serves as preview UI.

---

## 7. License & Credits

- ScamShield application code is released under the MIT License; see `LICENSE`.
- Multimodal ML research and model training in `ml-research/` and `models/` were developed by the research team.
