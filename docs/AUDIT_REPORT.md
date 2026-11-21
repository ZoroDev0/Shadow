# ScamShield Read-Only Audit Report

Audit date: 2026-11-21

## Executive summary

1. Overall PRD completion: **68%**.
2. Demo-readiness: **82%**; the core paste/check/result flow, examples, bilingual UI, history, and Test Lab are working and build/test-verified.
3. Production-readiness: **35%**; no deployment, PWA, real SMS/notification integration, extension, security operations, or independent evaluation.
4. Biggest strength: a real, explainable, on-device rule engine plus a Python parity mirror and 48 project-written cases.
5. Biggest gap: it does not read real SMS, notifications, screens, phone links, or clipboard continuously.
6. Biggest false-security risk: Protect is explicitly UI simulation; the app does not activate device protections.
7. Screenshot upload is real file selection plus preview UI only; there is no OCR or text analysis.
8. The teammate 67-feature LightGBM model is not loaded; it requires HTML and 32 visual features that a raw URL cannot supply.
9. A bounded 20-feature URL gate exists only in the backend, with `ML_ENABLED=false` today, so its net detection effect is zero in default builds.
10. The browser, backend and both engines were not independently benchmarked; all reported self-test/unseen numbers are project-authored evidence.

## A. Completion vs PRD

### A1. Functional requirements and architecture

| PRD requirement / component | Status | Evidence | Notes |
|---|---|---|---|
| Paste suspicious SMS/WhatsApp/link and plain-language verdict | **Done** | `src/legacy.ts`: examples, `runCheck()`, `presentResult()`; `src/detection/engine.ts:894-927`; `npm test` passed 5/5 | Web UI and local detector are real. `/analysis` result is real only if backend is configured. |
| English and Hindi | **Done** | `src/i18n/en.ts`, `src/i18n/hi.ts`, `src/legacy.ts:applyLang()` | Static UI strings exist in both languages; screen-level browser behavior is NOT VERIFIED. |
| SAFE / BE CAREFUL / SCAM verdicts | **Done** | `src/detection/engine.ts:846-888`; live backend response showed `scam` | Verdict string in backend is lowercase; UI maps to uppercase via i18n. |
| Score 0-100 and thresholds | **Done** | `src/detection/engine.ts:1-67`, `846-888`, `backend/app.py:278-278` | `<30` safe, `30-65` suspicious, `>65` scam. Backend and TS live-probe values match. |
| Reasons in English/Hindi | **Done** | `src/detection/engine.ts`, `backend/app.py:ADVICE` and reason builders | Contract shape is implemented. |
| Link side-by-side lookalike comparison | **Partial** | `src/detection/engine.ts:findLookalike/analyzeLink`; `src/legacy.ts:buildResultNode()` | Detection and result fields exist; visual comparison behavior is NOT VERIFIED in a real browser. |
| Advice: do not click, never share OTP, bank card number, cybercrime/1930 | **Done** | `backend/app.py:ADVICE`; `src/detection/engine.ts:ADVICE` | Real text is present. |
| Shared `rules.json` | **Partial** | `src/detection/rules.json`; `backend/app.py:ROOT/RULES_PATH` loads it | The TS fallback still has duplicate legacy constants/regex in `src/legacy.ts`; `engine.ts` is source-shared but runtime UI uses `legacy.ts` and `API_BASE`, potentially not `engine.ts`. |
| Hinglish and Devanagari patterns | **Partial** | `rules.json`, `engine.ts`, `backend/app.py` | Present but weak for spaced/Unicode/obfuscated wording; fresh 30-case probe found misses. |
| URL lookalike/homoglyph/punycode/shortener/bad TLD | **Done** | `src/detection/engine.ts:290-380`; `src/detection/rules.json` | Static link analysis is implemented and 60 India URL eval is 30/30 phishing + 30/30 official with 0/0. |
| Negation handling for genuine OTPs | **Done** | `NEG_SHARE_RE`, `credNegated`, delivery/no-action; `G01-G14` suite | Negation is regex-local and can be bypassed or misfire. |
| Genuine bank OTP/delivery/bill reminders stay SAFE | **Done** | 48 project-written suite; engine test passed | The claim is only on project-written cases. |
| `analyze(input)` contract | **Done** | `src/detection/analyze.ts`; `src/detection/engine.ts:894-927`; `backend/app.py:832-833` | TS contract validation exists; backend Pydantic result shape test passed. |
| `VITE_API_BASE` empty = on-device | **Done** | `src/detection/engine.ts:896-927`; `src/legacy.ts:1244-1276` | Static network call evidence says no fetch if API base is empty. DevTools Network check is NOT VERIFIED. |
| API configured = POST `/analyze`, 8-second timeout, fallback | **Done** | `src/detection/engine.ts:897-927`; live `curl` backend test | Timeout/response validation/fallback code exists; fallback behavior under real Wi-Fi loss is NOT VERIFIED. |
| React/Vite web app | **Done** | `package.json`, `src/main.tsx`, `npm run build` passed | Production bundle was built. |
| FastAPI `/analyze`, `/health` | **Done** | `backend/app.py:828-833`; live curl: health 200 and analyze 200 | Live local backend verified. Public host NOT VERIFIED. |
| Browser extension MV3 | **Missing** | no extension directory/manfest in `find` and `git ls-files`; `docs/EXTENSION_HANDOFF.md` | Only a handoff contract exists; the teammate extension is external. |
| Android notification scanner | **Simulated** | `src/legacy.ts:PROTECT_CARDS`, `showSmsBanner()` | One fake SMS banner. No Android project or permissions. |
| Desktop clipboard watcher | **Simulated** | `src/legacy.ts:SIM_COPY_TEXT`, `showDeskToast()` | UI-only toast. No native watcher. |
| Optional ML URL signal | **Done, OFF** | `backend/app.py:ML_ENABLED`, `load_shadow_model()`, `detect_with_ml()` | Optional backend gate exists; default OFF and model absent. |
| Screens: Check, Result, History, Protect, Settings | **Done** | `src/legacyMarkup.ts` and `src/legacy.ts:switchScreen()/renderProtect()/renderHistory()` | Real static UI exists; browser interaction is NOT VERIFIED. |
| 3 Protect simulations | **Done / Simulated** | `src/legacy.ts:showSmsBanner`, `showDeskToast`, `showScamOv` | Simulation is explicitly labelled in UI and docs. |
| Onboarding | **Done** | `src/legacy.ts:initLegacy`, localStorage onboarding state | Browser first-launch behavior NOT VERIFIED. |
| Demo story | **Done** | `src/legacy.ts:openDemo/demoGo` | UI implementation exists; real presentation is NOT VERIFIED. |
| Test Lab | **Done** | `src/legacy.ts:runLab`, `src/detection/selfTests.ts` | 48-case result, not 55. Browser rendering NOT VERIFIED. |
| Screenshot upload / OCR | **Simulated / UI-only** | `src/legacy.ts:1793-1802`: `createObjectURL`, preview, `soon()` | No OCR/library/network image analysis. |
| 48px targets / text-size settings | **Partial** | `src/styles/legacy.css`, `applyTextSize()` | CSS inspection suggests controls, but WCAG and 48px audit NOT VERIFIED by browser. |
| WCAG AA | **Not verified** | `docs/MANUAL_QA.md` lists human-only checks | Static color/label evidence only. Automated browser/a11y tools were not run. |
| Strict monochrome Apple x Material | **Done** | `src/styles/legacy.css:1-34`; grep found only hex/grayscale/black/white values | Design is structurally monochrome, but visual review NOT VERIFIED. |
| Motion transform/opacity only | **Partial** | `src/styles/legacy.css` and `enableRipple()` | Static CSS may include other animation properties; browser/computed-style review NOT VERIFIED. |

**Overall completion: 68%.** Roughly: web/backend/detection core, rules, bilingual UI and test harness are substantially complete; PWA, real platform integrations, extension, deployment, PII-safe operations and independent evaluation are absent.

**Demo-readiness: 82%.** The strongest remaining demo dependency is a browser/phone environment and a stable 2-minute live sequence. All core static and build checks pass, but real interaction and public-backend behavior are NOT VERIFIED.

**Production-readiness: 35%.** The rules engine is useful, but lack of real platform integration, PWA/offline packaging, independent data, deployment hardening, monitoring and security review prevents a production claim.

### A2. Judging criteria

| Criterion | Score / 10 | Reason |
|---|---:|---|
| Clear victim | **9** | Ordinary non-technical person and 58-year-old Mumbai teacher are named in the brief; UI and demo story use plain language and dangerous actions. |
| Realistic attack | **9** | The repo covers concrete bank/UPI/electricity/customs/job/licensing/QR/remote-app scenarios. This is rule evidence, not a real-world incident dataset. |
| Defence usable without expert knowledge | **8** | Paste/check, clear verdict, why, link comparison and advice are understandable. It falls short of real-time on-device protection and cannot make an OCR/screenshot check yet. |

## B. Platform support

| Platform / browser | Today | PWA installable? | Verification |
|---|---|---|---|
| macOS — Safari/Chrome/Edge | Website runs as a Vite SPA in a supported browser. | **No** in repo: no `manifest.webmanifest`, service worker or PWA icons are present. | Build passed; browser launch/install/offline behavior NOT VERIFIED. |
| Windows — Chrome/Edge/Firefox | Website runs as a browser SPA. | **No** in repo: no manifest, service worker or install icons. | Browser launch/install/offline behavior NOT VERIFIED. |
| Android — Chrome/Edge/Firefox/Samsung Internet | Website can be opened over HTTPS and local browser clipboard access may work with permissions. | **No** in repo; HTTPS alone is insufficient. No manifest, service worker or icons. | Real phone installation, clipboard and Network behavior NOT VERIFIED. |

PWA static evidence:

- `rg -n "manifest|serviceWorker|apple-touch-icon|icon-" index.html public src package.json` found no PWA manifest/service-worker/icon declarations.
- `public/index.html` and `index.html` contain only normal HTML metadata and an inline theme bootstrap.
- No native app project exists. `find` and `git ls-files` show no `.kt`, `.swift`, `Electron`, `Tauri`, Android Gradle, Xcode or Windows installer files.
- Protect text for Android, Windows/macOS and the browser extension is simulated: `src/legacy.ts:PROTECT_CARDS`, `renderProtect()`, `showSmsBanner()`, `showDeskToast()`, `showScamOv()`.

**Browser extension:** absent from this repo. `docs/EXTENSION_HANDOFF.md` is the only artifact. Teammate needs:

1. API base URL (placeholders still used; no public host).
2. `POST /analyze` JSON `{ "text": "..." }` and 8-second timeout handling.
3. CORS from the backend:
   - exact production origin via `ALLOWED_ORIGINS` or `CORS_ORIGINS`;
   - `chrome-extension://.*` and localhost origins are automatically allowed by regex in `backend/app.py:820-827`.
4. Response contract fields `verdict`, `score`, `reasons`, `links`, `advice`, `highlights`.
5. A licensing decision for any reused teammate model (separate from the rules backend).

NOTE: `docs/EXTENSION_HANDOFF.md` says CORS uses wildcard `Access-Control-Allow-Origin:*`; that is not what the code does. `backend/app.py` sends explicit configured origins plus regex and `allow_credentials=False`.

## C. SMS and notification reading

| Capability | Status | Evidence / limitation |
|---|---|---|
| Real SMS reading | **Not present** | No SMS SDK/API/Android manifest; only `SIM_SMS_TEXT` in `src/legacy.ts`. |
| Real notification reading | **Not present** | No NotificationListener, notification events or Android service. |
| Clipboard monitoring/watcher | **Not present** | The app implements a user-triggered `navigator.clipboard.readText()` paste action and preview upload; no continuous clipboard watcher. |
| Browser clipboard paste | **Real, permission/user action dependent** | `pasteFromClipboard()` in `src/legacy.ts:1784-1791`; browser permission behavior NOT VERIFIED. |
| Protect SMS/banner simulation | **UI-only** | `showSmsBanner()` and `SIM_SMS_TEXT`. |
| Protect copy toast simulation | **UI-only** | `showDeskToast()` and `SIM_COPY_TEXT`. |
| Protect website blocker simulation | **UI-only** | `showScamOv()` with a fake site overlay. |

Technical paths and estimates:

| OS / mechanism | Requirement | Effort | Privacy implication / restriction |
|---|---|---:|---|
| Android SMS | Dedicated app + SMS receive/Read SMS permission. Google Play restricted permissions; SMS/Call Log policy/reviewer approval applies. Most apps cannot just request it. | 16-32 hours for MVP plus Play policy/approval, not guaranteed | Reads all SMS or filtered inbox; disclose, encrypt, delete, least privilege. |
| Android NotificationListenerService | Dedicated Android app, user grant in Settings, binding service and notification parsing. | 12-24 hours | Can expose OTPs, sender names and personal messages; stop collection unless needed, redact storage. |
| Android share target | `AndroidManifest.xml` `<intent-filter>` for SEND text/Share sheet and safe display. | 4-8 hours | User initiates sharing; fewer permissions than listener/SMS; still disclose outgoing text to backend. |
| iOS | No third-party app SMS inbox access and no usable notification-list notification API for arbitrary apps. Share Sheet / Shortcuts is possible only by explicit user action. | 8-16 hours for Share/Shortcuts; SMS reading remains impossible | No passive SMS/notification access. |
| Windows/macOS clipboard | Native app or Electron/Tauri clipboard polling plus user consent/notice. PWA clipboard APIs do not provide continuous monitoring. | 8-20 hours native/Tauri; Electron 12-24 hours | Clipboard privacy is high risk and cross-app; may capture passwords, secrets and private text. |
| Desktop browser extension clipboard | Extension permission and user actions; broad `clipboardRead` is sensitive and browser approval is browser-dependent. | 4-12 hours extension work | Minimal passive capture is better than global monitoring; user control and clear explanation required. |
| Browser Extension content/web protection | MV3 + `declarativeNetRequest`, content script, host permissions, offscreen/background contract. | 24-40 hours beyond the app contract | High permission footprint; cannot safely read all site content or block unknown page content without clear disclosure. |

**Impossible/restricted:** iOS passive SMS and notification-list reading is not available to ordinary third-party apps. Android SMS is Play-restricted and should not be assumed available. Desktop browser pages cannot continuously monitor OS clipboard; native or extension trust boundaries are required.

## D. Feature inventory

| Screen / area | Feature | State |
|---|---|---|
| Check | Pasted text input, 4000-character frontend slice | **Real** |
| Check | Preloaded 5 examples | **Real** |
| Check | Clipboard Paste button | **Real**, browser permission and gesture dependent |
| Check | Screenshot file picker and preview | **UI-only** |
| Check | Local/API analysis, loading sequence | **Real** |
| Result | Verdict, score, reasons, advice, highlights | **Real** |
| Result | Link list and lookalike comparison fields | **Real engine / browser view NOT VERIFIED** |
| Result | Copy warning, report link, read aloud, check another | **Real UI**, browser share/report behavior NOT VERIFIED |
| History | Add/cap 100/delete/filter/clear | **Real**, localStorage behavior NOT VERIFIED in browser |
| Protect | 3 protection toggles | **UI simulation** |
| Protect | Incoming-SMS banner | **UI simulation** |
| Protect | Copied-text toast | **UI simulation** |
| Protect | Dangerous-site overlay | **UI simulation** |
| Settings | English/Hindi, light/dark/auto, text size, reduce motion | **Real UI**, browser visual QA NOT VERIFIED |
| Demo story | 3-step Priya story and CTA | **Real UI**, not real incident evidence |
| Onboarding | First-run 3-card sheet | **Real UI**, first-launch behavior NOT VERIFIED |
| Test Lab | Runs project-written cases locally | **Real static suite**, 48 cases in code |
| Backend | `/health`, `/analyze`, local rules, bounded ML gate | **Real local backend** |

Prioritised additions:

| Priority feature | Impact | Effort | Risk | Scope |
|---|---|---:|---|---|
| Independent 60-case external message eval | Very high | 8-16 h | Dataset collection bias/privacy | 24-hour: MUST |
| Fix/expand regex and obfuscation normalization | High | 6-12 h | False positives | 24-hour: MUST |
| Public demo backend/deployment with fallback | High | 2-6 h | Secrets/CORS/data policy | 24-hour: MUST |
| Screenshot OCR for pasted images | High | 12-24 h | PII leakage, OCR errors | Future |
| Android share-to-ScamShield text target | High | 6-12 h | Android package/distribution | 24-hour if Android app scaffold exists |
| QR/UPI-link checker (decode QR and parse UPI URI) | High | 8-16 h | QR OCR/redirect validation | 24-hour maybe |
| Screenshot/share text pipeline | High | 8-16 h | OCR/upload privacy | Future |
| More Indian languages | Medium-high | 8-20 h each | Translation/religious/region bias | Future |
| Community-reported scams | Medium-high | 16-40 h | Abuse, moderation, defamation | Future |
| ML SMS classifier | Medium-high | 40-80 h + data | Label bias, overclaiming | Future |
| Voice-call script checker | Medium | 8-16 h | Audio privacy/transcription | Future |
| Browser extension contract implementation | Medium-high | 24-40 h | Permissions/store review | Future, teammate parallel |
| Android NotificationListener/SMS | High | 24-48 h + Play review | Sensitive data and Play restrictions | Future |
| Desktop clipboard watcher | Low-medium | 12-24 h | High privacy risk | Future |
| PWA manifest/service worker/offline cache | Medium | 4-8 h | Stale cache/install testing | 24-hour if deployment available |

## E. Detection engine review

### Scoring

Link points are negative for official domains and positive for IPs, punycode, brand lookalikes, bad TLDs, shorteners and HTTP. Text signal groups add impersonation, urgency, credential, threat, callback, reward and job points. Hard categories add 30 and floor the score at 70. Two groups add 8 and floor at 30; three or more add 14 and floor at 30. Negative genuine-message markers subtract 12/8 points. Final verdict is >65 scam, 30-65 suspicious, <30 safe.

Weaknesses:

- A 55/55 or 48/48 project suite is not independent accuracy.
- Spaces, Unicode digits, English letter spacing, emoji separators and novel paraphrases are weak.
- Negation is sentence-local and can suppress a real ask if a warning word appears.
- Official-domain allowlisting is useful but can be embedded in a real-looking subdomain and is checked carefully.
- Hard-category rules are good for known patterns but can miss novel language.
- Combination logic can create medium scores for low-signal words and may not distinguish severity.
- No SMS source metadata, sender identity, account state or user history.
- The actual UI and the modular `engine.ts` both have similar but separate copies of detection code: `src/legacy.ts` and `src/detection/engine.ts`. Shared rules reduce drift but do not eliminate implementation drift.

### Fresh 30-case probe

Both engines were run through 30 cases authored after reading the rules. This is **not independent evidence**.

| ID | Type | TS result | Python result | Case / finding |
|---|---|---|---|---|
| A01 | Scam | safe / 9 | safe / 9 | `S B I account urgent K Y C now otp 1234` — miss: spaced brand/KYC/OTP |
| A02 | Scam-like | suspicious / 37 | suspicious / 37 | Hindi KYC plus "do not send OTP"; likely warning or scam ambiguity |
| A03 | Scam | scam / 71 | scam / 71 | SBI BLOCKED + send OTP — pass |
| A04 | Scam | safe / 3 | safe / 3 | Devanagari call to Unicode phone + prize — miss |
| A05 | Scam | safe / 3 | safe / 3 | Fully spaced English "DIGITAL ARREST / CBI" — miss |
| A06 | Scam | safe / 12 | safe / 12 | Hinglish UPI PIN ask — miss |
| A07 | Scam | scam / 94 | scam / 94 | Customs fee + bad-domain link — pass |
| A08 | Scam | scam / 90 | scam / 90 | KBC lottery + Aadhaar/fee — pass |
| A09 | Scam | suspicious / 58 | suspicious / 58 | LIC lapse + `.top` payment: suspicious, not expected scam — miss at verdict |
| A10 | Scam | safe / 3 | safe / 3 | QR refund/collect — miss |
| A11 | Scam | scam / 70 | scam / 70 | Remote app variant — pass |
| A12 | Scam | scam / 70 | scam / 70 | Sextortion — pass |
| A13 | Scam | suspicious / 52 | suspicious / 52 | Punycode brand host — suspicious, not scam |
| A14 | Scam | scam / 70 | scam / 70 | Safe locker/ED/video call — pass |
| A15 | Scam | safe / 16 | safe / 16 | Paid task registration + WhatsApp number — miss |
| G01 | Genuine | safe / 3 | safe / 3 | OTP warning — pass |
| G02 | Genuine | suspicious / 30 | suspicious / 30 | HDFC blocked question + official reminder — false positive |
| G03 | Genuine | safe / 3 | safe / 3 | Amazon delivery/no action — pass |
| G04 | Genuine | safe / 12 | safe / 12 | Hindi never-share-PIN warning — pass |
| G05 | Genuine | safe / 12 | safe / 12 | ICICI debit alert — pass |
| G06 | Genuine | safe / 12 | safe / 12 | LIC premium due warning — pass |
| G07 | Genuine | safe / 3 | safe / 3 | Electricity paid — pass |
| G08 | Genuine | safe / 3 | safe / 3 | Official parivahan challan — pass |
| G09 | Genuine | safe / 3 | safe / 3 | Automated informational — pass |
| G10 | Genuine | safe / 3 | safe / 3 | Dinner chat — pass |
| G11 | Genuine | suspicious / 30 | suspicious / 30 | SBI official-domain password-reset text — false positive |
| G12 | Genuine | safe / 12 | safe / 12 | UPI mandate — pass |
| G13 | Genuine | safe / 3 | safe / 3 | Bluedart official delivery — pass |
| G14 | Genuine | safe / 9 | safe / 9 | School fee bill — pass |
| G15 | Genuine | safe / 3 | safe / 3 | Customs no-fine statement — pass |

**Fresh-probe summary:** 7 clear misses among 15 intended scam cases (A01, A04, A05, A06, A10, A13 as only suspicious, A15), plus A09 suspicious instead of scam. 2 false positives among 15 genuine cases (G02, G11). Both engines produced identical verdict and score for all 30 probes. These cases were written after reading `rules.json`, so they test known-rule gaps, not real-world accuracy.

Probe commands:

- TS: `npx tsx -e 'import { detectLocal } ...'` (same 30 case strings).
- Python: `cd backend && .venv/bin/python -c 'from app import detect_local ...'`.
- Both commands emitted identical tables above.

### Existing test quality

| Suite | Size / coverage | Authorship / overfit risk |
|---|---|---|
| TypeScript self-tests | 48: 27? Count from `selfTests.ts`; labels are 27 scam by IDs S01-S27 plus U01-U07, 7 suspicious P01-P07, 14 genuine G01-G14 | Written for this repo and in the engine test. High overfit risk. |
| Vitest engine suite | 48 + 15 extras in two tests | Project-written and no external samples. |
| Golden parity set | 48 original cases + 15 extra = 63 in `backend/golden.json`; test output said 70 in docs due historical counting mismatch | 63 is the actual JSON size/labels used; stale docs claim 70. |
| `scoreCompare.test.ts` | 48 old-HTML cases + 15 extra; parity only | Compares legacy HTML implementation to TS, not against truth. |
| India URL eval | 60 written URL strings: 30 lookalikes and 30 official | Rules-only, project-authored, no live DNS or real site check; 100% on this set is expected. |
| Unseen eval | 40 messages: 20 scam-like and 20 genuine | Authored in the hardening pass, explicitly not independent. Existing report says no misses/FP/differences. |
| Independent evaluation kit | 60-person kit designed, 0 completed samples | `docs/INDEPENDENT_EVAL.md`; no independent dataset or result in repo. |

Concrete improvement order by value/hour:

1. Unicode/ASCII normalization and letter-spacing removal: 2-4 h.
2. Add reusable QR/UPI collect patterns and obfuscated currency/brand normalization: 3-6 h.
3. Add independent 60-message dataset and CI thresholds: 8-16 h.
4. Separate negation/guarded safe context from hard asks: 4-8 h.
5. Add official-domain cache and sender-name context; do not allow official domains alone to prove all content: 6-12 h.
6. Store rules with version and explain matched rule IDs; increase transparent debugging: 4-8 h.
7. Add a canonical single engine implementation and remove duplicate legacy copy: 8-16 h.
8. Add re2-safe or timeout-bounded regex testing to prevent pathological regex latency: 4-8 h.
9. Add OCR pipeline only after privacy/security threat model: 12-24 h.
10. ML only after independent India SMS/URL data and licensing: 40-80 h.

## F. Teammate repo and ML model: full history

### What the teammate repository contained

The adjacent backup/ZIP `ScamShield-backup/Shadow-main.zip` contained 75 entries:

- 4 Jupyter notebooks: dataset discovery, dataset audit/preprocessing, feature engineering/signal extraction, baseline model training/multimodal evaluation.
- 14+ research reports and CSV/JSON manifests.
- 560581-byte LightGBM text model `models/shadow_unified_classifier.txt`.
- `models/feature_schema.json` declaring 67 features.
- Feature distributions: 20 URL features, 13 HTML/DOM features, 32 visual embedding features and 2 modality flags.
- 60+ visual/result figures and checksums.
- Reported metrics: accuracy 99.20%, precision 98.80%, recall 98.70%, F1 98.75%, ROC-AUC 0.9961, PR-AUC 0.9950, FPR 0.56%, test 2878 samples.
- URL-only modality: 2608 test samples, 99.62% accuracy, 99.77% precision, 99.07% recall.
- HTML/visual modality combinations were materially different and not a raw URL-only model.

### Audit decision

**Use / Adapt / Skip:**

| Artifact | Decision | Why |
|---|---|---|
| 67-feature LightGBM model | **Skip direct use** | 45 features are 13 HTML/DOM + 32 visual features plus modality flags; raw URL cannot supply HTML or screenshots. |
| 20-feature URL schema | **Adapt** | Reimplement URL-only feature extraction and require exact ordered names, so it cannot silently feed missing zeros/NaNs. |
| HTML crawling/BeautifulSoup | **Skip** | Privacy, live-network, SSRF, TLS and page-execution risk. Current app is message-based. |
| Visual CNN embeddings/screenshots | **Skip** | Not available in SMS or raw URL analysis; would need fetch/render, storage and separate runtime. |
| Datasets | **Skip** | Not included in ScamShield and licensing/source availability is not established. |
| Reported benchmark | **Use only as research context** | It was not reproduced against India scam SMS or the URL eval in this repo. |

The 67-feature model was **not** loaded as a 20-feature approximation. The exact reason is in `backend/README.md`: it rejects mismatched feature names and missing HTML/visual features.

### What was built

From the teammate concept, this repo adapted only the 20 URL-only features listed in `backend/app.py:URL_FEATURE_NAMES`. The backend now:

- loads an external LightGBM text model only if `ML_ENABLED=true` and an exact 20-name path is supplied;
- rejects feature-name mismatch;
- applies positive bounded contribution max +10 and negative bounded contribution max -5;
- never overrides hard scam signals;
- never contributes for official domains;
- is silent on missing model/load failures;
- defaults to `ML_ENABLED=false` in `.env.example`, `render.yaml`, README and runbook.

### What was not used / changes made

- No 67-feature model or teammate data was copied or committed.
- No model/dataset was added to `.gitignore`? `.gitignore` excludes `backend/models/`, `models/`, `data/`, `*.joblib`, `*.pkl`, `*.lgb`, `*.onnx`, `*.zip` and `*.pdf`, so future accidental adds are blocked.
- `backend/requirements.txt` adds `lightgbm`, `numpy` and `tldextract` for optional URL gate.
- `backend/app.py` adds exact URL feature extraction and bounded ML merge.
- Parity tests add missing-model, model-error, bounded contribution, hard-scam and official-domain guards.
- Existing rules were unchanged by the ML gate; it was added as an optional backend-only signal.

**Net detection effect today: zero**, because `ML_ENABLED=false` and no model path is configured. The rules engine alone handles both live local and backend decisions.

### Git history and licence

Visible history:

- `9ce3b6a` Clean release: ScamShield v1.0 hackathon
- `0a2db26` Docs: add ML credits and notice
- `f11c938` Chore: add MIT license
- Tag `v1.0-hackathon`

Commands: `git log --all --decorate --stat --oneline`, `git tag --list`, `git ls-files`.

No teammate model or dataset appears in tracked files. The teammate ZIP itself is outside the current repo and is not tracked. The ZIP's `LICENSE` is zero bytes, so it is **not usable as a grant**. The teammate still needs to provide written licence terms for model weights, data and notebooks. The current ScamShield repo has a real MIT `LICENSE`.

A git-history purge is **not directly evidenced** by a visible rewrite commit. There are only three visible commits and no model/dataset files in them. The exact remote/Fsck/reflog origin of the ZIP and prior history was NOT VERIFIED. Teammate should provide a commit list after a force-push/purge and verify with `git log --all --stat`.

### Recommended ML next steps

| Step | Effort | Worth it for demo? |
|---|---:|---|
| Get written licence and list data sources | 1-2 h | Yes, before all reuse |
| Obtain a real 20-feature India URL model, not cross-domain approximation | 8-24 h | No for default demo; only if independent eval improves |
| Collect and label India phishing/genuine URL set with disjoint domains | 20-40 h | Maybe future |
| Add live replay tests and static HTML/visual gating | 8-16 h | No; privacy and scope cost |
| Keep gate OFF unless a 60-case benchmark improves rules | 1 h | Yes as a safe fallback |

**For the hackathon:** do not enable ML; it is not needed for a clear 2-minute explanation and could introduce unexplained results. Use the rules engine and clearly say the teammate benchmark is separate.

## G. Quality, security, privacy

### Backend

| Area | Finding |
|---|---|
| Rate limit | In-memory 30 requests/60 seconds per forwarded-IP/remote-IP; reset process restarts; no Redis/distributed protection. |
| Size cap | Pydantic `MAX_TEXT_LENGTH=5000`; middleware checks content-length against 64 KB; live 5001-character text returned 422. |
| CORS | Exact comma-separated `ALLOWED_ORIGINS`/`CORS_ORIGINS`, localhost/127 regex and `chrome-extension://.*`; allow credentials false. |
| Message logging | No explicit body logging in source. Uvicorn access logs method/path/status, not bodies. `console.warn` only frontend API errors. |
| Input validation | Pydantic string max 5000 and FastAPI content parsing. Extra fields are not explicitly rejected, but are irrelevant to result. |
| Error handling | API shape validated on frontend; fallback catches timeout, HTTP and JSON/shape errors. Backend model load errors silently fall back. |
| Dependencies | `fastapi>=0.115`, `uvicorn>=0.30`, `pydantic>=2.8`, `lightgbm>=4.3`, `numpy>=1.26`, `tldextract>=5.1` are broad ranges. Npm dependencies use `"latest"` and lockfile pins. Dependency CVE audit NOT VERIFIED; no `npm audit` or `pip-audit` run. |
| Public deployment | `render.yaml` has placeholder frontend origin and no deployed host is claimed. |
| Live backend smoke | Health 200, scam analyze 200, 5001-char text 422. Public reachability NOT VERIFIED. |

### Frontend

| Area | Finding |
|---|---|
| Accessibility | Static labels, skip link, ARIA labels and text-size controls exist. Browser keyboard/screen-reader/contrast automation NOT VERIFIED. |
| Monochrome | Grep found grayscale hex, black/white and transparent/gray-alpha values only in UI CSS. No accent-color values found. |
| XSS | User text is HTML-escaped by `esc()` before insertion and `textContent` is used for clipboard/demo text. `dangerouslySetInnerHTML` only inserts static `legacyMarkup`; highlight fields also escape and reject angle/ampersand/quotes. |
| LocalStorage | Stores language/theme/text size/onboarding/history. Malformed JSON is caught and state fallback exists; privacy of history and clear behavior browser QA NOT VERIFIED. |
| PWA/offline | No manifest or service worker. Offline behavior is only local JS fallback after app assets are already loaded. Browser airplane-mode test NOT VERIFIED. |
| Motion | Reduce-motion setting exists; transform/opacity UI goals appear in CSS, but browser computed styles NOT VERIFIED. |

### Privacy claims

Static evidence: `src/detection/engine.ts:896-927` makes a fetch only when `VITE_API_BASE` is truthy. If empty, `detectLocal()` is the only analysis path. No analytics, telemetry or other fetch was found in source by `rg "fetch|XMLHttpRequest"`.

This does **NOT** verify browser behavior. DevTools Network-tab verification is NOT VERIFIED. It cannot prove third-party scripts, browser caches, service workers or extensions. The app also stores text/history in localStorage, so "fully on-device" means no server analysis but does not mean no local persistence.

### Repo hygiene

- No obvious secret strings were found in source/docs.
- No personal absolute paths were found.
- Largest tracked files: `index_9.html` 208K, `backend/golden.json` 204K, `src/legacy.ts` 148K.
- `.gitignore` excludes dependencies, build, virtualenv, cache, env, model/dataset and archive formats.
- MIT licence exists only in current ScamShield repo.
- Tag: `v1.0-hackathon`.
- README accurately states rule-based/no ML/no SMS/no OCR, but stale/unsupported claims remain:
  - Demo says 55/55; actual code suite is 48 cases.
  - README/backend use "100%" or "55/55" only as project cases, but older demo language can still be misread as independent accuracy.
  - `docs/EXTENSION_HANDOFF.md` states wildcard CORS even though code uses explicit origin configuration.

## H. Risks and recommendations

### Top 10 demo and judge-QA risks

| Risk | Mitigation |
|---|---|
| Live public backend unavailable | Run local; set `VITE_API_BASE` blank and demo on-device. |
| Browser first run/onboarding hides screen | Pre-open app, clear localStorage before recording, keep backup screen recording. |
| Hindi/English UI clipped on projector or phone | Use Extra Large text and desktop width; browser visual QA. |
| Judge assumes 55/55 means independent | Say "48 project-written cases", never "55/55 independent". |
| Judge assumes real SMS protection | Demo Protect and say "simulation" every time. |
| False positive on genuine urgent message | Use HDFC OTP/Amazon/Swiggy examples and explain rule limitations. |
| Obfuscated scam bypasses engine | Do not claim perfect detection; show only known realistic cases. |
| PWA install expectation | Say clearly: Vite SPA but no PWA manifest/service worker. |
| Backend sends message to server despite privacy claim | Use no-API build for demo and show DevTools later. |
| Teammate model is presented as loaded | Say optional, OFF, absent, 67-to-20 mismatch skipped. |

### Prioritized action plan

**Must do — 6-10 h**

1. Fix stale 55/55 references to 48/48 and label all accuracy project-written. 0.5 h.
2. Add exact independent 60-message evaluation kit result or remove any independent-accuracy implication. 8 h.
3. Fix obfuscated spaced brand/OTP, QR collect and Unicode digit normalization. 4-8 h.
4. Do real browser smoke check for first run, paste, examples, history, Protect labels and Network. 1-2 h.
5. Deploy only if credentials exist; otherwise keep explicit no-public-host claim. 1-3 h if credentials.

**Should do — 8-16 h**

1. Add PWA manifest, icons and service worker if the hackathon judges value install/offline. 4-8 h.
2. Add Android share target if Android integration is feasible. 6-12 h.
3. Add QR/UPI URI parsing. 6-12 h.
4. Add OCR UI behind explicit screenshot-only analysis. 12-24 h.

**Nice to have — future**

1. Browser extension implementation.
2. Android SMS/NotificationListener app.
3. Desktop native clipboard watcher.
4. Community report moderation.
5. India-trained ML SMS/URL model.
6. Additional languages.

### Ten tough judge questions

1. **How accurate is it?** Only project-written case accuracy is known; independent and real-world accuracy are NOT VERIFIED.
2. **Does it read SMS?** No. Protect SMS is a simulation.
3. **Does it work offline?** With `VITE_API_BASE` empty, the detector is in-device, but PWA/offline asset caching is absent and NOT VERIFIED.
4. **Can you use it on Android/iOS today?** It is a browser SPA on Android and desktop browsers; iPhone browser access is possible, but PWA install and real SMS access are NOT VERIFIED.
5. **Why not ML?** Explainability and 24-hour speed; the optional URL model is benchmark research, not an India-SMS classifier.
6. **Did you train on Indian scams?** No independent India SMS dataset was verified. Existing examples and eval cases were written for the project.
7. **Can a lookalike URL evade it?** Yes. Unicode digits, letter spacing, redirects, novel TLD/brand combinations and obfuscated text can evade regex rules.
8. **Does it call a backend by default?** No. Empty `VITE_API_BASE` means on-device local detection. Configured builds send text to that backend.
9. **Is the ML model 67-feature approximated as 20?** No. It was rejected. Only a separately licensed exact 20-feature model may be enabled.
10. **Is this production ready?** No. It is a hackathon prototype with static and local test evidence, no independent evaluation or real platform integration.

