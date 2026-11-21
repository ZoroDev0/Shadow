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
3. **ScamShield Browser Extension (Chrome/Edge/Brave)**: Manifest V3 build of the same engine — checks pasted text, right-clicked text or links, and warns before a lookalike bank or government page opens. Available as an unpacked build; not published to any extension store.

## 1a. Status and honest limits

Verified on 2026-11-22 by running these commands on this machine:

| Check | Command | Result |
| --- | --- | --- |
| Frontend + engine tests | `npm ci && npm test` | 53 tests pass, including 86 project-written detector cases |
| Web build | `npm run build` | succeeds |
| Extension build | `npm run build:ext` | succeeds; loads unpacked in headless Chromium |
| Backend parity | `cd backend && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt && pytest -q` | 12 tests pass over 101 golden entries |
| Extension URL fuzz | `npx tsx scripts/fuzz-ext-policy.ts` | 273 URLs: 0 throws, 0 private/internal blocks, 0 guarded-site blocks |
| Two-engine input fuzz | `npx tsx scripts/fuzz-engine.ts` | 340 adversarial inputs: 0 throws, identical TS/Python verdict and score, slowest 9.07 ms |

The 86 detector cases and 101 golden entries are **project-written cases, not independent accuracy**. The only held-out measurement is the one-shot Phase 7 run — **24/30 correct, five misses and one false positive** (`docs/eval_holdout_phase7.md`) — and it was written by the same agent that wrote the rules.

- Detection is a **rule engine**: no model and no dataset in this repository.
- The extension ships as an **unpacked build** only — no store listing, no signing, no auto-update.
- The Protect screen on the web app is a **simulation**; only the extension performs real navigation checks.
- Screenshot upload is a **file-selection and preview UI only** — no OCR.
- The **Android app is not built**; there is no Android project in this repository.
- The **PWA and the extension are not yet verified in a human browser session** (automated headless Chromium only).
- The **independent human evaluation has not been run** (`docs/INDEPENDENT_EVAL.md`).

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

### Browser extension (unpacked build)

The extension imports `src/detection` directly — the engine is not copied. Build it and load `extension/dist`:

```bash
npm run build:ext
# chrome://extensions → Developer mode → Load unpacked → extension/dist
```

See [`extension/README.md`](extension/README.md) for permissions, data flow and limits.

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
├── extension/          # ScamShield MV3 browser extension (source + build output)
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
- **Simulation Notice:** Device protection switches in the demo UI are simulated, and screenshot upload is preview UI only. The browser extension's navigation warning is real once you load the unpacked build; installing it is a manual step and it is not distributed through a store.

---

## 6. License & Credits

- Shadow application code is released under the MIT License; see `LICENSE`.
- This repository ships only the application, backend, tests and documentation. Third-party research notebooks, datasets, figures and trained model binaries are not distributed here, and no model file is required: the backend runs rules-only with `ML_ENABLED=false` (the default).
