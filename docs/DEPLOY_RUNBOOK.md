# ScamShield manual deploy runbook

This runbook assumes no existing hosting credentials. Nothing is deployed automatically.

## Frontend — Vercel

1. Push this repository to GitHub from your own machine.
2. Import the GitHub repository at https://vercel.com/new.
3. Set the framework preset to **Vite**.
4. Set build command: `npm run build`
5. Set output directory: `dist`
6. Set `VITE_API_BASE` to one of:
   - blank/empty for fully on-device mode
   - `https://YOUR-BACKEND.onrender.com` for API mode
7. Deploy.

After the frontend URL exists, add it to `ALLOWED_ORIGINS` on Render.

## Backend — Render

1. Create a new **Web Service** from the repository.
2. Set root directory to the repository root.
3. Set runtime to **Python 3**; use Python `3.11`.
4. Set build command: `pip install -r backend/requirements.txt`
5. Set start command:
   ```bash
   uvicorn app:app --app-dir backend --host 0.0.0.0 --port $PORT
   ```
6. Set environment variables:
   - `ML_ENABLED=false`
   - `ALLOWED_ORIGINS=https://YOUR-FRONTEND.vercel.app`
   - `RATE_LIMIT_PER_MINUTE=30`
   - `MAX_REQUEST_BYTES=64000`
   - `MAX_TEXT_LENGTH=5000`
7. Deploy and confirm `/health`.

The backend code reads `ALLOWED_ORIGINS` and also accepts local/Chrome-extension origins
for development. After adding the final Vercel origin, redeploy or restart Render.

## Verify deployed backend

```bash
curl -i https://YOUR-BACKEND.onrender.com/health
curl -i -X POST https://YOUR-BACKEND.onrender.com/analyze \
  -H 'Content-Type: application/json' \
  -d '{"text":"Dear Customer, your SBI NetBanking is blocked. Update KYC at http://sbi-kyc-update.xyz/verify"}'
```

Correct scam response: HTTP `200`, `verdict` = `scam`, `score` is 0–100, and `links`,
`reasons`, `advice`, `highlights` are present.

```bash
curl -i -X POST https://YOUR-BACKEND.onrender.com/analyze \
  -H 'Content-Type: application/json' \
  -d '{"text":"OTP 638271 is for login. Please do not share this code with anyone."}'
```

Correct safe response: HTTP `200` and `verdict` = `safe`.

```bash
python3 - <<'PY'
import json, urllib.request
payload = json.dumps({"text":"A"*5001}).encode()
request = urllib.request.Request(
    "https://YOUR-BACKEND.onrender.com/analyze",
    data=payload,
    headers={"Content-Type":"application/json"},
    method="POST",
)
try:
    urllib.request.urlopen(request)
except urllib.error.HTTPError as exc:
    print(exc.code)
PY
```

Correct oversized response: HTTP `422` or `413`; it must be rejected, not analyzed.

## Verify frontend

- Open the Vercel HTTPS URL on a phone.
- Set `VITE_API_BASE` only after the backend is healthy.
- Check the same scam and safe examples.
- Turn Wi-Fi off and verify the on-device example flow still works with `VITE_API_BASE` empty.
