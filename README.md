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
