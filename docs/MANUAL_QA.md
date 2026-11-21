# Manual Browser & Physical Device QA Checklist

This checklist documents items verified through automated headless browser runs versus items requiring physical human device confirmation.

## Automated Real-Browser Verified (Playwright Chromium)

All items below have been executed and verified in real headless Chromium against `npm run preview` at 390px (mobile) and 1440px (desktop) viewport sizes:

- [x] **VERIFIED**: Onboarding sheet appears on first launch and only once (`#sheetOnb`).
- [x] **VERIFIED**: Demo story 4-step walkthrough: Meet Priya, The Attack, Without vs With, and "Now you try" live checker.
- [x] **VERIFIED**: 5 Example chips verdicts through full UI:
  - Fake SBI KYC -> `SCAM` (100 risk score, lookalike diff displayed)
  - Electricity cut-off -> `SCAM`
  - Customs digital-arrest -> `SCAM`
  - Real bank OTP -> `SAFE`
  - Swiggy order -> `SAFE`
- [x] **VERIFIED**: UI input stress checks: empty string, whitespace-only, 4000-character text (<1500ms), link-only message, Devanagari text.
- [x] **VERIFIED**: Screenshot preview UI and object URL revocation on remove.
- [x] **VERIFIED**: English and Hindi toggle on Check, History, Protect, Settings, and modal sheets.
- [x] **VERIFIED**: Text sizes: Normal (`data-ts="n"`), Large (`data-ts="l"`), Extra large (`data-ts="xl"`) without layout breakage or button wrapping.
- [x] **VERIFIED**: Themes: Light, Dark, Auto (switching `data-theme`).
- [x] **VERIFIED**: Desktop inline panel banner visibility tested across 920px, 1280px, 1440px, 1920px.
- [x] **VERIFIED**: Protect screen simulations (SMS notification banner, clipboard watcher toast, dangerous site overlay).
- [x] **VERIFIED**: History operations: records checks, filters by verdict, deletes single item, clear all dialog.
- [x] **VERIFIED**: Test lab reports 76/76 project-written cases passing (100%).
  - 74 original cases plus R20 (official Amazon.com / amazon.co.uk storefronts) and R21 (an Amazon lookalike is still rejected), added in Phase 10B.
- [x] **VERIFIED**: Golden parity is 91 entries (76 self-tests plus 15 extras); TypeScript and Python agree on every verdict and score.
- [x] **VERIFIED**: Keyboard shortcuts: 1-4 tab switching, Ctrl/Cmd+Enter check, Esc sheet dismiss, Tab focus trapping in open modals.
- [x] **VERIFIED**: Storage failure & fallback: app survives corrupted `scamshield.v1` in `localStorage`.
- [x] **VERIFIED**: Zero external network or analysis calls during check when `VITE_API_BASE` is unset.
- [x] **VERIFIED**: Strict monochrome design system audit: zero chromatic colors in styles, SVGs, or tokens.

## Browser Extension — Automated (Playwright Chromium, `--load-extension`)

Run against the built `extension/dist` loaded unpacked in Playwright's Chromium
(headless). These are browser checks, not just unit tests:

- [x] **VERIFIED**: The MV3 service worker registers and the extension ID is stable.
- [x] **VERIFIED**: Popup: pasted SBI-KYC scam text renders a `SCAM` banner, score, 5 reasons, the fake-vs-real domain diff and 4 advice lines.
- [x] **VERIFIED**: Popup: EN→HI toggle re-renders the result in Hindi and the choice is written to `chrome.storage.local`.
- [x] **VERIFIED**: Popup: a genuine Swiggy delivery message renders `SAFE`.
- [x] **VERIFIED**: Interstitial (`blocked.html`) shows the fake host, the real domain and both actions.
- [x] **VERIFIED**: Navigation to `https://sbi-kyc-update.xyz/login` is redirected to `blocked.html` before the page loads.
- [x] **VERIFIED**: Navigation to `https://www.hdfcbank.com/` is not redirected.
- [x] **VERIFIED**: “Proceed anyway” writes the domain to `chrome.storage.session` and the retry is allowed.

## Browser Extension — Automated URL-policy fuzz

- [x] **VERIFIED**: `npx tsx scripts/fuzz-ext-policy.ts` exercises 217 unique odd URLs (malformed, unicode/punycode hosts, `userinfo@host`, IPv6 literals, ports, `data:`/`javascript:`/`blob:`/`file:` schemes, 8000-character inputs, path-and-query text that only looks like a host) plus the 84 guarded legitimate sites: 0 throws, 0 blocks of a private/internal address, 0 blocks of a legitimate site, and 19 blocks that are all genuine lookalikes or bare public IPs.
- [x] **VERIFIED**: 76 self-tests (51 scam / 7 suspicious / 18 safe), 91 golden entries evaluated by both TypeScript and Python, 52 vitest tests, 12 backend tests.
- [ ] **KNOWN GAP**: `hdfc.bank.in`, `ajio.com` and `sbilife.co.in` are real sites still flagged as lookalikes (see `docs/AUDIT_REPORT.md` §I8); do not present them as safe.

## Browser Extension — Human-only on a real Chrome/Edge/Brave profile

- [ ] Load `extension/dist` via “Load unpacked” and confirm the toolbar icon appears without an error badge on `chrome://extensions`.
- [ ] Right-click selected text → “Check with ScamShield” opens the result window with the matching verdict and a toolbar badge.
- [ ] Right-click a link → “Check this link with ScamShield” shows the fake-vs-real diff for a lookalike domain.
- [ ] Toggle protection off in options, then open a known scam URL: it must load normally with no badge.
- [ ] Add a domain to “Always allowed sites”, then open it: it must never be blocked.
- [ ] Leave the API base URL empty and confirm in DevTools that no network request leaves the extension.
- [ ] Set an API base URL, approve the permission prompt, then stop the backend: the popup must still show a local verdict and “checked on this device”.
- [ ] Keyboard-only pass on popup, options and interstitial: visible focus ring on every control, 48 px targets, `Esc`/`Tab` behave.
- [ ] Light and dark OS appearance: no colour appears, contrast holds for muted text.

## Physical Device & Hardware Only Checks (Human Verification Required)

- [ ] **Physical Audio Playback**: Confirm that Web Speech API (`speechSynthesis`) plays audio audibly in English and Hindi on a physical smartphone speaker.
- [ ] **Native OS Share Sheet**: Confirm `navigator.share` opens native iOS/Android sharing dialogs on a touch device.
- [ ] **PWA Add-to-Home-Screen Prompt**: Confirm physical browser displays "Install App" or "Add to Home Screen" banner and launches in standalone display mode with correct splash background.
- [ ] **Physical Airplane Mode**: Turn off device Wi-Fi/cellular on phone and confirm on-device scanning operates without degraded functionality.
- [ ] **Virtual On-Screen Keyboard**: Confirm mobile soft keyboard does not obscure the Check button or input when active on small screens (e.g. iPhone SE / 360px Android).
