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
- [x] **VERIFIED**: Test lab reports 74/74 project-written cases passing (100%).
- [x] **VERIFIED**: Keyboard shortcuts: 1-4 tab switching, Ctrl/Cmd+Enter check, Esc sheet dismiss, Tab focus trapping in open modals.
- [x] **VERIFIED**: Storage failure & fallback: app survives corrupted `scamshield.v1` in `localStorage`.
- [x] **VERIFIED**: Zero external network or analysis calls during check when `VITE_API_BASE` is unset.
- [x] **VERIFIED**: Strict monochrome design system audit: zero chromatic colors in styles, SVGs, or tokens.

## Physical Device & Hardware Only Checks (Human Verification Required)

- [ ] **Physical Audio Playback**: Confirm that Web Speech API (`speechSynthesis`) plays audio audibly in English and Hindi on a physical smartphone speaker.
- [ ] **Native OS Share Sheet**: Confirm `navigator.share` opens native iOS/Android sharing dialogs on a touch device.
- [ ] **PWA Add-to-Home-Screen Prompt**: Confirm physical browser displays "Install App" or "Add to Home Screen" banner and launches in standalone display mode with correct splash background.
- [ ] **Physical Airplane Mode**: Turn off device Wi-Fi/cellular on phone and confirm on-device scanning operates without degraded functionality.
- [ ] **Virtual On-Screen Keyboard**: Confirm mobile soft keyboard does not obscure the Check button or input when active on small screens (e.g. iPhone SE / 360px Android).
