# Manual browser QA checklist

This list cannot be marked browser-verified by static tooling.

## Static checks covered

- [S] 74 project-written detector cases
- [S] 70 TS/Python golden verdict-score parity cases
- [S] Backend 5000-character cap and 64 KB request guard
- [S] Production frontend build
- [S] Monochrome CSS token audit

## Human-only checks

- [ ] Onboarding appears on first launch and only once
- [ ] Fake SBI KYC example verdict = SCAM
- [ ] Electricity cut-off example verdict = SCAM
- [ ] Customs digital-arrest example verdict = SCAM
- [ ] Real bank OTP example verdict = SAFE
- [ ] Swiggy delivery example verdict = SAFE
- [ ] EN/Hindi works on Check, History, Protect, Settings and sheets
- [ ] Light, Dark and Auto themes work
- [ ] Extra-large text has no clipped text or wrapping action buttons
- [ ] Reduced motion removes/shortens animation
- [ ] 920px desktop result banner is fully visible
- [ ] 1280px desktop result banner is fully visible
- [ ] 1920px desktop result banner is fully visible
- [ ] Protect SMS, copy and website simulations behave visibly
- [ ] History filter, delete and clear confirmation work
- [ ] Test lab reports 74 project-written cases (50 scam, 7 suspicious, 17 safe), not independent accuracy
- [ ] Read aloud starts and stops
- [ ] Share and WhatsApp actions open or copy correctly
- [ ] Airplane mode: on-device examples still work
- [ ] Backend stopped with `VITE_API_BASE` set: clean fallback, no visible error
- [ ] DevTools Network with `VITE_API_BASE` empty: no analysis text leaves the device
- [ ] No coloured pixels or accent images appear in light/dark

## PWA / installability (NOT VERIFIED)

The build ships `public/manifest.webmanifest`, three monochrome shield icons
(`public/icons/icon-192.png`, `icon-512.png`, `maskable-512.png`) and
`public/sw.js`. The service worker is registered only in production builds.

- [ ] Manifest and icons are served with the correct MIME types
- [ ] Browser offers "Install app" / "Add to Home screen"
- [ ] Installed app opens standalone with the themed background
- [ ] Reload while offline shows the cached shell, not the browser error page
- [ ] `POST /analyze` is never served from cache: block the network, submit a
      message with `VITE_API_BASE` set, and confirm it fails instead of
      returning a stale verdict
- [ ] A new build bumps the cache name and the old cache is deleted

**Installability is NOT VERIFIED.** No browser install prompt was exercised in
this environment; the checks above must be run by hand.
