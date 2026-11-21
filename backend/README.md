# ScamShield FastAPI backend

This backend is the Python rules-only mirror of `src/detection/engine.ts`. It reads all
shared domain, brand and keyword data from `../src/detection/rules.json`.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

```bash
curl http://127.0.0.1:8000/health
curl -X POST http://127.0.0.1:8000/analyze \
  -H 'Content-Type: application/json' \
  -d '{"text":"Your SBI account is blocked. KYC update now: http://sbi-kyc-update.xyz"}'
```

## Optional URL-only ML signal

ML is disabled by default:

```bash
export ML_ENABLED=false
export SHADOW_MODEL_PATH=/absolute/path/to/a-20-feature-url-model.txt
uvicorn app:app --reload --port 8000
```

The backend loads no model and works rules-only when `SHADOW_MODEL_PATH` is missing or
`ML_ENABLED=false`. Model loading errors fall back silently.

Do not commit model or dataset files. Obtain the model only after its licence is confirmed.
The implementation accepts only an explicitly 20-feature LightGBM URL model whose ordered
feature names match `URL_FEATURE_NAMES` in `app.py`. It rejects the teammate's existing
67-feature multimodal model rather than silently supplying missing HTML and visual features.

The contribution is bounded to `+10` for risky URLs and `-5` for clean suspicious URLs.
It never lowers a hard-rule scam, never contributes for official domains, and cannot turn
an official-domain message into a scam through ML.

## India URL evaluation

`backend/eval/india_urls.json` contains 60 written URLs: 30 phishing/lookalike URLs and
30 official domains. Run:

```bash
PYTHONPATH=. python eval_india.py
```

Rules-only result: precision `1.00`, recall `1.00`, 0 false positives, 0 false negatives.
The LightGBM model and PhiUSIIL held-out data were not available in this repository, so
a masked 67-feature versus 20-feature accuracy comparison was not performed and ML remains
disabled. This model, if obtained later, is a website-URL benchmark model, not an SMS or
India-scam classifier.

## Limits

- Screenshot upload remains UI-only.
- Protect-screen controls are simulations.
- The browser extension is not in this repository.
- When `VITE_API_BASE` is empty, the frontend remains fully on-device.

## Request and CORS limits

`POST /analyze` accepts at most 5,000 text characters and a 64 KB HTTP request body.
It applies a simple 30-request-per-60-second per-IP limit. Message bodies are never
logged.

Configure CORS with a comma-separated `CORS_ORIGINS` environment variable:

```bash
export CORS_ORIGINS="https://your-frontend.example.com"
export ML_ENABLED=false
uvicorn app:app --host 0.0.0.0 --port 8000
```
