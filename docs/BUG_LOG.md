# ScamShield Bug Log (Demo-Readiness Audit)

Every FIXED row below was re-run in Phase 12 and is reproducible with the
commands in `README.md` §1a (or the Playwright checks in `docs/MANUAL_QA.md`).
No row in this file is left NOT VERIFIED, but this table covers automated
findings only: the human-only checks still open — loading the unpacked
extension in a real Chrome profile, screen-reader behaviour, and the
independent evaluation — are listed as unchecked in `docs/MANUAL_QA.md` and
`docs/INDEPENDENT_EVAL.md`. "No known open bugs" therefore means no known
open *automated* failures, not that the product is fully verified.

| ID | Priority | Where (file:line) | What was wrong | Fix | Evidence | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-01** | **P0** | `src/detection/engine.ts:588` | Uncaught `TypeError: Cannot read properties of null (reading 'en')` in `detectLocal()` on link without dots (e.g., `http://localhost`) because `analyzeLink()` returns `reason: null`. | Added null check: `reason: la.reason ? { en: la.reason.en, ... } : null`. | Regression test in `src/detection/engine.test.ts` passes; benchmark runs without error. | **FIXED** |
| **BUG-02** | **P1** | `src/i18n/en.ts:125`, `src/i18n/hi.ts:125` | Missing translations for the 4th demo step (`demo_done`, `d4_t`, `d4_b`, `d4_use`) and `demo_step` still indicated "Step {n} of 3". | Synchronized missing keys and updated counter to 4 across English and Hindi. | `I18N` key parity automated check confirmed 100% match. | **FIXED** |
| **BUG-03** | **P1** | `src/legacy.ts:981, 1069, 1283` | Focus was not trapped within open sheets/modals when tabbing, and focus was not restored to the invoking element on sheet/modal close. | Stored `_returnFocus` element on modal open, restored on close, and added modal Tab trap cycle. | Real browser automated audit verified focus trapping and dismissal. | **FIXED** |
| **BUG-04** | **P1** | `src/legacy.ts:876` | `runLab()` lacked a `try/catch` around `runSelfTests()`, which would leave the loading spinner hung if a test threw. | Wrapped `runSelfTests()` invocation in `try/catch` and rendered an error banner if an exception occurs. | Playwright test suite executes Test lab cleanly with 86/86 passed. | **FIXED** |
| **BUG-05** | **P2** | `src/styles/legacy.css:531, 582` | Faint clipping of bottom card drop-shadow in Demo story (`.demo-card`), and potential label wrapping of `#demoNext` CTA button on narrow phone viewports. | Added padding `2px 4px 8px` to `.demo-scroll`; set `#demoBack` to `flex: 0 0 auto` and `#demoNext` to `flex: 1` with text truncation. | Verified in headless Chromium at 390px and 1440px; screenshots saved in `docs/screens/`. | **FIXED** |
| **BUG-06** | **P0** | `src/detection/engine.ts` (`findLookalike`), `backend/app.py` (`find_lookalike`), `src/detection/rules.json` | Three real domains were flagged as lookalikes: `hdfc.bank.in` (HDFC Bank's live domain), `ajio.com` (`jio.com` matched as a substring) and `sbilife.co.in` (`sbi` prefix-matched `sbilife`). | The embedded-official-domain check now requires a label boundary on both sides; `realDomains` grew from 47 to 109 with the verified `.bank.in` domains and real subsidiaries. No TLD-wide rule added. | `selfTests.ts` R22–R27 (the three sites safe, their lookalikes scam) in **86/86** self-tests and **101** golden entries, identical in TypeScript and Python; guard list 84 → 140; fuzz 273 URLs passes; headless Chromium no longer redirects `hdfc.bank.in` or `ajio.com`. | **FIXED** |
