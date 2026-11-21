# ScamShield browser extension handoff

The backend is a Manifest V3 extension-compatible HTTP API.

## Run locally

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
ML_ENABLED=false uvicorn app:app --reload --port 8000
```

Set `SHADOW_MODEL_PATH` only if a licensed 20-feature URL model is available.

## Base URL

Use a placeholder and configure it in the extension:

```text
const API_BASE = "http://127.0.0.1:8000";
```

For production, replace this placeholder with the deployed public HTTPS base URL:

```text
const API_BASE = "https://YOUR-BACKEND.example.com";
```

No public deployed backend URL is available in this environment yet.

For a deployed backend, use the HTTPS backend origin. Do not append `/analyze` to the
base URL in the configuration.

## CORS

The backend does **not** use a wildcard. It allows `GET`, `POST` and `OPTIONS` from:

- the explicit origins listed in the `ALLOWED_ORIGINS` environment variable
  (comma-separated; defaults to `http://localhost:5173`), and
- the regex `https?://(localhost|127\.0\.0\.1)(:\d+)?|chrome-extension://.*`
  (local development and browser extensions).

`allow_credentials=False`, so cookies are never accepted cross-origin. To use a
deployed backend from the extension, add that exact origin to `ALLOWED_ORIGINS`.

## Request contract

`POST /analyze`

```json
{"text":"Your SBI account is blocked. KYC update now: http://sbi-kyc-update.xyz"}
```

Example Manifest V3 service worker call:

```js
const response = await fetch(`${API_BASE}/analyze`, {
  method: "POST",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify({text: messageText}),
  signal: AbortSignal.timeout(8000),
});

if (!response.ok) throw new Error(`HTTP ${response.status}`);
const result = await response.json();
```

## Response contract

```json
{
  "verdict": "safe",
  "score": 0,
  "reasons": [{"icon":"link","text_en":"...","text_hi":"..."}],
  "links": [{"url":"https://example.com","verdict":"safe","reason":{"en":"...","hi":"..."},"lookalike_of":null}],
  "advice": [{"text_en":"...","text_hi":"..."}],
  "highlights": []
}
```

`verdict` is exactly `safe`, `suspicious`, or `scam`. `score` is 0–100.

## Health check

```js
const health = await fetch(`${API_BASE}/health`);
```
