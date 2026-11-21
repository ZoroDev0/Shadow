# ScamShield

ScamShield is a single-page, on-device scam detector for Indian SMS, WhatsApp messages and links.
The detector is rule-based, not machine learning. Protect-screen actions are simulations; screenshot
upload is UI-only and does not OCR an image.

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

## Run

```bash
npm install
npm run dev
npm test
npm run build
```

Set `VITE_API_BASE` to a backend origin to POST `{ "text": "..." }` to `${VITE_API_BASE}/analyze`.
When unset or on API failure, ScamShield uses its on-device local detector with an 8-second timeout.

## Current status

- The detector is rule-based; it is not an ML SMS classifier.
- Optional URL ML is implemented but OFF and not India-trained.
- Protect controls are simulations.
- Screenshot upload is UI-only and has no OCR.
- The browser extension is maintained separately.
- Desktop apps cannot read SMS from a phone.
- Self-test accuracy is based on cases written for this project.
- 55/55 and other 100% results are self-written case counts, not independent evidence.

## Deploy

### Frontend

```bash
npm install
npm run build
```

Deploy the `dist/` directory to Vercel, Netlify or GitHub Pages. Keep `VITE_API_BASE`
empty for an on-device-only build. Set `VITE_API_BASE=https://YOUR-BACKEND.example.com`
when a backend is intentionally enabled.

The app should open on a phone over HTTPS. No public deployment URL was available from
this environment, so no live URL is claimed here.

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
ML_ENABLED=false CORS_ORIGINS=https://YOUR-FRONTEND.example.com \
  uvicorn app:app --host 0.0.0.0 --port 8000
```

Deploy it to Render, Railway or Fly with `ML_ENABLED=false`. Configure `CORS_ORIGINS`
with the exact frontend HTTPS origin and any approved `chrome-extension://` origins.
The backend also allows local and Chrome-extension origins for development.

Example endpoints:

```bash
curl https://YOUR-BACKEND.example.com/health
curl -X POST https://YOUR-BACKEND.example.com/analyze \
  -H 'Content-Type: application/json' \
  -d '{"text":"Your SBI account is blocked. KYC update now: http://sbi-kyc-update.xyz"}'
```
