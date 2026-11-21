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
