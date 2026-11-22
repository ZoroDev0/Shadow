# Shadow

**On-device scam and phishing detection for SMS, WhatsApp messages and links.** One rule engine, three front ends: a web app, a browser extension and an Android notification scanner. Bilingual (English / Hindi). Built by students as a cybersecurity research project.

**Team:** Sasanka · Biswajeet · Riya · Kaustab

[![Release](https://github.com/ZoroDev0/Shadow/actions/workflows/release.yml/badge.svg)](https://github.com/ZoroDev0/Shadow/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## Contents

- [Components](#components)
- [Download](#download)
- [Quickstart](#quickstart)
- [Browser extension](#browser-extension)
- [Android app](#android-app)
- [Backend service](#backend-service)
- [Testing](#testing)
- [Releasing](#releasing)
- [Repository layout](#repository-layout)
- [Status and honest limits](#status-and-honest-limits)
- [Safety notes](#safety-notes)
- [License](#license)

---

## Components

| Component | What it does | Where |
| --- | --- | --- |
| Web app | Paste a message or URL, get an explainable verdict | `src/` |
| Browser extension (MV3) | Checks text and links, warns before a lookalike bank or government site opens | `extension/` |
| Android app | Scans notifications from messaging apps and raises a local alert | `android/` |
| Backend | FastAPI parity mirror of the rule engine | `backend/` |

All front ends import the same engine from `src/detection`. It is a rule engine: no model and no dataset in this repository.

## Download

Prebuilt files are attached to each [GitHub Release](https://github.com/ZoroDev0/Shadow/releases):

- `Shadow-extension-<version>.zip`: unzip and load unpacked (see [extension](#browser-extension)).
- `Shadow-<version>-debug.apk`: debug-signed Android build for sideloading.

## Quickstart

```bash
npm ci
npm run dev      # web app on localhost
npm test         # engine, extension and Android parity tests
npm run build    # production web build
```

Set `VITE_API_BASE` to a backend origin to POST `{ "text": "..." }` to `${VITE_API_BASE}/analyze`. When unset, or if the call fails, the on-device detector is used (8-second timeout).

## Browser extension

Chrome, Edge, Brave (and Firefox 109+ temporarily). Not published to any store.

```bash
npm run build:ext
# chrome://extensions → Developer mode → Load unpacked → extension/dist
```

Right-click text or a link and choose "Check with Shadow", or use the toolbar popup. Permissions, data flow and Firefox/Safari notes: [`extension/README.md`](extension/README.md).

## Android app

A Capacitor 8 wrapper of the web build plus a Kotlin `NotificationListenerService`. After you grant notification access it reads notifications from Google Messages, Samsung Messages, WhatsApp, WhatsApp Business, Telegram and Truecaller, runs the same engine inside QuickJS, and posts a local alert that never contains the message body.

- No SMS permission: `READ_SMS` and `RECEIVE_SMS` are absent. Notifications only.
- Everything stays on the device; the scan path makes no network call.
- Payment and banking notifications are deliberately not scanned.
- iOS is unsupported (no API to read other apps' notifications).

```bash
npm run sync:android
cd android && ./gradlew installDebug
```

Full guide, adb commands and expected verdicts: [`docs/ANDROID.md`](docs/ANDROID.md).

## Backend service

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
ML_ENABLED=false uvicorn app:app --host 0.0.0.0 --port 8000
```

- `GET /health`: status check.
- `POST /analyze`: heuristic verdict for a message or URL.

```bash
curl -X POST http://localhost:8000/analyze \
  -H 'Content-Type: application/json' \
  -d '{"text":"Your SBI account is blocked. KYC update now: http://sbi-kyc-update.xyz"}'
```

## Testing

| Check | Command |
| --- | --- |
| Frontend, engine, extension | `npm test` (61 tests) |
| Backend parity | `cd backend && pytest -q` (12 tests over 103 golden entries) |
| Extension URL fuzz | `npx tsx scripts/fuzz-ext-policy.ts` |
| Two-engine input fuzz | `npx tsx scripts/fuzz-engine.ts` |
| Android engine parity | `npx vitest run src/native` |
| Android JVM tests | `cd android && ./gradlew testDebugUnitTest` |

Manual QA steps: [`docs/MANUAL_QA.md`](docs/MANUAL_QA.md).

## Releasing

A GitHub Actions workflow (`.github/workflows/release.yml`) builds and publishes a release when a version tag is pushed:

```bash
git tag v1.5.0
git push origin v1.5.0
```

It runs the tests, builds the extension zip and the Android debug APK, and attaches both to a new GitHub Release. You can also run it manually from the Actions tab; that uploads the files as a workflow artifact instead.

Before tagging, bump `version` in `extension/manifest.json` and `versionName` / `versionCode` in `android/app/build.gradle`.

## Repository layout

```text
.
├── android/        Capacitor + Kotlin notification scanner
├── backend/        FastAPI service, parity tests, golden datasets
├── docs/           Runbooks, QA procedures, evaluation reports
├── extension/      MV3 browser extension (source, tests)
├── public/         Static web assets
├── scripts/        Build scripts, fuzzers, evaluation runners
├── src/            React/TypeScript app, detection engine, i18n
├── index.html      Vite entrypoint
└── index_9.html    Frozen reference page (read by the parity test)
```

## Status and honest limits

Last verified 2026-11-22 on the author's machine: `npm test` (61 pass), `npm run build`, `npm run build:ext`, and the backend, fuzz and Android checks listed above.

- The 88 detector cases and 103 golden entries are **project-written, not independent accuracy**. The only held-out measurement is the Phase 7 run: **24/30 correct, five misses, one false positive** ([`docs/eval_holdout_phase7.md`](docs/eval_holdout_phase7.md)), written by the same agent that wrote the rules.
- The extension is an **unpacked build**: no store listing, no signing, no auto-update. Verified only in headless Chromium, not a human browser session.
- The Android app **builds but has not been run on a phone**. The listener, alerts and restricted-settings flow are not verified. Release APKs are debug-signed.
- The web app's Protect switches are a **simulation**. Screenshot upload is a preview UI only, with no OCR.
- The independent human evaluation has not been run ([`docs/INDEPENDENT_EVAL.md`](docs/INDEPENDENT_EVAL.md)).

## Safety notes

- External HTML is parsed statically with `BeautifulSoup`; untrusted JavaScript is never executed.
- Avoid live automated navigation to malicious URLs during testing.

## License

MIT, see [`LICENSE`](LICENSE). No third-party notebooks, datasets or trained model binaries are distributed here; the backend runs rules-only (`ML_ENABLED=false`, the default).
