# ScamShield browser extension — handoff

Status: **in the repo** (`extension/`), Manifest V3, unpacked build.
Detection is imported from `src/detection` — there is no second engine.

## What exists now

| Part | File | Behaviour |
| --- | --- | --- |
| Service worker | `extension/src/background.ts` | Context menus, main-frame navigation guard, badge, session “Proceed anyway”. |
| Popup | `extension/src/popup.ts` | Paste/type → verdict, score, reasons, link diff, advice. EN/HI toggle persisted. Also renders the last context-menu result (`?view=result`). |
| Options | `extension/src/options.ts` | Language, protection on/off, allowlist, optional API base URL. |
| Interstitial | `extension/src/blocked.ts` | Fake-vs-real domain diff, reasons, “Go back” (default) and “Proceed anyway”. |
| URL policy | `extension/src/policy.ts` | Pure functions: `block` / `badge` / `ignore` + reasons. |
| Engine bridge | `extension/src/detect.ts` | `checkText` (local, or server with local fallback), `checkUrl` (always local). |
| Tests | `extension/tests/*.test.ts` | Mocked chrome API; navigation, allowlist, manifest, false-positive guard. |

Build and load steps, permissions and data flow: [`extension/README.md`](../extension/README.md).

## Detection contract

Local checks call the shared engine directly:

```ts
import { detectLocal } from "../../src/detection/engine";
```

A bare address uses `analyzeUrl()` (same module), which returns the **link**
verdict so a lookalike domain is never reported as merely “be careful”. The
message score is not reused for navigation decisions.

## Optional backend API

Still supported, unchanged in shape, but **off unless the user sets a base URL**
in the options page. The extension then requests the optional host permission
for that exact origin, and sends:

```json
POST {API_BASE}/analyze
{"text": "..."}
```

Response contract:

```json
{
  "verdict": "safe | suspicious | scam",
  "score": 0,
  "reasons": [{"icon": "link", "text_en": "...", "text_hi": "..."}],
  "links": [{"url": "...", "verdict": "safe", "reason": {"en": "...", "hi": "..."}, "lookalike_of": null}],
  "advice": [{"text_en": "...", "text_hi": "..."}],
  "highlights": []
}
```

Timeout 8 s (`API_TIMEOUT_MS` in `extension/src/detect.ts`). Non-200, a bad
shape, a thrown error or an abort all fall back to the on-device detector, and
the popup says “checked on this device”. Navigation checks never call the API.

## Run the backend locally

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
ML_ENABLED=false uvicorn app:app --reload --port 8000
```

`GET /health` is available for a reachability check. CORS already allows
`chrome-extension://*` origins plus explicit `ALLOWED_ORIGINS`.

## Rules of the road

- Do not copy engine code into `extension/`. Import it.
- Keep permissions at `contextMenus`, `storage`, `webNavigation` plus the
  optional runtime host permission. `extension/tests/manifest.test.ts` fails if
  that set grows or if `<all_urls>` appears.
- Any change to `src/detection/rules.json` affects the web app, the backend and
  the extension at once. Run `npm test` and backend `pytest` together.
- False positives are the expensive failure. The guarded list lives in
  `extension/tests/legitSites.data.ts` (84 sites, shared with the fuzz). Only
  widen a rule in `selfTests.ts` + `backend/golden.json` when a real bug is
  proven, and mirror it in `backend/app.py`.
- Run `npx tsx scripts/fuzz-ext-policy.ts` (217 odd URLs) after touching
  `extension/src/policy.ts`; it fails on a throw, on any private/internal block,
  on any guarded-site block, and on a lookalike that stops being blocked.
- Current counts: 76 self-tests (51/7/18), 91 golden entries, 52 vitest tests,
  12 backend tests. Keep them green.

## Not done / not claimed

- Not published to any store; no signing, no auto-update.
- No content scripts: page content is never read.
- No Firefox or Safari build (no `manifest.firefox.json`; the port is unwritten).
- The web app's Protect-screen switches remain demo simulations; installing
  this extension is a separate manual step.
- Three real sites are still flagged as lookalikes: `hdfc.bank.in`,
  `ajio.com`, `sbilife.co.in`. Cause and fix are written up in
  `docs/AUDIT_REPORT.md` §I8; they were left alone because Phase 10B forbids
  engine/`rules.json` changes that are not required by the golden parity test.
