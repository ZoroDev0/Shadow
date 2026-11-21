# Shadow — Autonomous Phishing & Scam Detection Platform

> **A student-built cybersecurity research initiative and scam detection application defending users against web deception, malicious URLs, and smishing attacks.**

---

## 👥 Core Team & Authors

1. **Sasanka**
2. **Biswajeet**
3. **Riya**
4. **Kaustab**

---

## 1. Project Overview

Shadow is an end-to-end platform designed to protect users against modern web-based and message-based deception attacks, including credential harvesting, brand impersonation, zero-day phishing, and SMS/WhatsApp smishing scams.

The platform provides:
1. **Shadow Web Application**: Single-page, on-device scam detector for SMS, WhatsApp messages and URLs with an explainable rule engine and bilingual (English/Hindi) UI.
2. **Central Backend Detection Engine**: FastAPI service with a Python parity mirror of the rule engine, validated against the TypeScript implementation.

---

## 2. Shadow Web Application

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
npm ci
npm run dev
npm test
npm run build
```

Set `VITE_API_BASE` to a backend origin to POST `{ "text": "..." }` to `${VITE_API_BASE}/analyze`.
When unset or on API failure, Shadow uses its on-device local detector with an 8-second timeout.

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

## 4. Repository Directory Structure

```
.
├── backend/            # FastAPI central detection engine, parity tests & golden datasets
├── docs/               # System documentation, runbooks, QA procedures & evaluation reports
├── index.html          # Vite entrypoint
├── index_9.html        # Frozen standalone reference page (not built; read by the parity test)
├── public/             # Static web assets
├── scripts/            # Evaluation runners
├── src/                # Shadow React/TypeScript frontend (engines, state, i18n, screens)
└── package.json        # Frontend dependencies and test scripts
```

---

## 5. Safety & Untrusted Data Protocol

- **Static Parsing Only:** External HTML pages are parsed statically with `BeautifulSoup` without executing untrusted JavaScript.
- **No Live Navigation:** Avoid live automated navigation to malicious URLs during testing.
- **Simulation Notice:** Device protection switches in the demo UI are simulated; screenshot upload serves as preview UI.

---

## 6. License & Credits

- Shadow application code is released under the MIT License; see `LICENSE`.
- This repository ships only the application, backend, tests and documentation. Third-party research notebooks, datasets, figures and trained model binaries are not distributed here, and no model file is required: the backend runs rules-only with `ML_ENABLED=false` (the default).
