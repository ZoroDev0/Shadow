# Phase 6 honest re-test

Both engines were run through the then-current 66-case self-test suite (not repeated
here), the 40-message stored development set, and a 30-message holdout written
for this phase. **None of this is independent evidence.** Every message was
written by the same agent that read `rules.json`, so these are rule-coverage
probes, not accuracy measurements. For a human-written test, see
`docs/INDEPENDENT_EVAL.md`.

## 1. Development set — 40 stored messages

Source: `docs/eval_unseen_messages.json`. These messages were already available
to the previous hardening pass, so they are development data.

Result: 40/40 verdicts correct. 0 misses, 0 false positives.
TS and Python agreed on verdict **and** score for all 40.

The 30 audit probes quoted in `docs/AUDIT_REPORT.md` are not stored as text
anywhere in the repo (only their result table survived), so they could not be
re-run verbatim. Their documented gaps were turned into the `R01`-`R11`
regression cases, which the suite now covers.

| ID | Expected | TS verdict / score | Python verdict / score | Outcome |
|---|---|---|---|---|
| S01 | scam | scam / 79 | scam / 79 | OK |
| S02 | scam | scam / 70 | scam / 70 | OK |
| S03 | scam | scam / 70 | scam / 70 | OK |
| S04 | scam | scam / 72 | scam / 72 | OK |
| S05 | scam | scam / 80 | scam / 80 | OK |
| S06 | scam | scam / 100 | scam / 100 | OK |
| S07 | scam | scam / 100 | scam / 100 | OK |
| S08 | scam | scam / 74 | scam / 74 | OK |
| S09 | scam | scam / 74 | scam / 74 | OK |
| S10 | scam | scam / 76 | scam / 76 | OK |
| S11 | scam | scam / 90 | scam / 90 | OK |
| S12 | scam | scam / 98 | scam / 98 | OK |
| S13 | scam | scam / 70 | scam / 70 | OK |
| S14 | scam | scam / 100 | scam / 100 | OK |
| S15 | scam | scam / 70 | scam / 70 | OK |
| S16 | scam | scam / 70 | scam / 70 | OK |
| S17 | scam | scam / 100 | scam / 100 | OK |
| S18 | scam | scam / 96 | scam / 96 | OK |
| S19 | scam | scam / 78 | scam / 78 | OK |
| S20 | scam | scam / 92 | scam / 92 | OK |
| G01 | safe | safe / 3 | safe / 3 | OK |
| G02 | safe | safe / 3 | safe / 3 | OK |
| G03 | safe | safe / 3 | safe / 3 | OK |
| G04 | safe | safe / 12 | safe / 12 | OK |
| G05 | safe | safe / 3 | safe / 3 | OK |
| G06 | safe | safe / 6 | safe / 6 | OK |
| G07 | safe | safe / 3 | safe / 3 | OK |
| G08 | safe | safe / 6 | safe / 6 | OK |
| G09 | safe | safe / 3 | safe / 3 | OK |
| G10 | safe | safe / 3 | safe / 3 | OK |
| G11 | safe | safe / 3 | safe / 3 | OK |
| G12 | safe | safe / 10 | safe / 10 | OK |
| G13 | safe | safe / 12 | safe / 12 | OK |
| G14 | safe | safe / 3 | safe / 3 | OK |
| G15 | safe | safe / 3 | safe / 3 | OK |
| G16 | safe | safe / 3 | safe / 3 | OK |
| G17 | safe | safe / 3 | safe / 3 | OK |
| G18 | safe | safe / 6 | safe / 6 | OK |
| G19 | safe | safe / 4 | safe / 4 | OK |
| G20 | safe | safe / 3 | safe / 3 | OK |
## 2. Holdout — 30 new messages (run once)

> **Phase 7 note:** these 30 messages have since been used as a development set
> when writing the Phase 7 rules, so they are no longer a holdout. See
> `docs/eval_holdout_phase7.md` for the current one-shot set.

Source: `docs/eval_holdout_phase6_messages.json`. Written after the rules were
frozen, executed once, and **not tuned on afterwards**. Expected labels are the
author's own; a disagreement is a genuine data point, not a bug report.

Result: 23/30 verdicts correct. 6 misses, 1 false positive.
TS and Python agreed on verdict and score for all 30.

| ID | Family | Expected | TS verdict / score | Python verdict / score | Outcome |
|---|---|---|---|---|---|
| H01 | FASTag | scam | safe / 4 | safe / 4 | MISS/FP |
| H02 | gas KYC | scam | scam / 70 | scam / 70 | OK |
| H03 | PM-Kisan fee | scam | safe / 24 | safe / 24 | MISS/FP |
| H04 | SIM swap | scam | scam / 70 | scam / 70 | OK |
| H05 | courier customs | scam | scam / 80 | scam / 80 | OK |
| H06 | Aadhaar update | scam | scam / 91 | scam / 91 | OK |
| H07 | Hinglish loan | scam | suspicious / 48 | suspicious / 48 | MISS/FP |
| H08 | Devanagari digital arrest | scam | scam / 70 | scam / 70 | OK |
| H09 | Hinglish UPI PIN | scam | scam / 100 | scam / 100 | OK |
| H10 | electricity disconnect | scam | scam / 70 | scam / 70 | OK |
| H11 | task job | scam | suspicious / 44 | suspicious / 44 | MISS/FP |
| H12 | sextortion bitcoin | scam | safe / 3 | safe / 3 | MISS/FP |
| H13 | prize tax | scam | scam / 78 | scam / 78 | OK |
| H14 | ITR refund lookalike | scam | scam / 100 | scam / 100 | OK |
| H15 | parcel narcotics | scam | suspicious / 39 | suspicious / 39 | MISS/FP |
| H16 | real bank OTP | safe | safe / 3 | safe / 3 | OK |
| H17 | bank debit alert | safe | safe / 12 | safe / 12 | OK |
| H18 | IRCTC ticket | safe | safe / 6 | safe / 6 | OK |
| H19 | electricity bill official | safe | safe / 3 | safe / 3 | OK |
| H20 | FASTag genuine | safe | safe / 3 | safe / 3 | OK |
| H21 | delivery OTP | safe | scam / 70 | scam / 70 | MISS/FP |
| H22 | clinic appointment | safe | safe / 3 | safe / 3 | OK |
| H23 | school fees | safe | safe / 3 | safe / 3 | OK |
| H24 | gas booking | safe | safe / 3 | safe / 3 | OK |
| H25 | Devanagari OTP warning | safe | safe / 3 | safe / 3 | OK |
| H26 | PM-Kisan credit | safe | safe / 16 | safe / 16 | OK |
| H27 | Aadhaar genuine | safe | safe / 3 | safe / 3 | OK |
| H28 | SIM swap alert | safe | safe / 3 | safe / 3 | OK |
| H29 | re-KYC freeze warning | safe | safe / 12 | safe / 12 | OK |
| H30 | Hinglish delivery | safe | safe / 3 | safe / 3 | OK |
### Remaining misses (6)

| ID | Message intent | Got | Why |
|---|---|---|---|
| H01 | FASTag "blacklisted, recharge at fastag-kyc.online" | safe / 4 | The bad TLD `.online` is not in `badTlds`, and the host carries no brand token, so no signal fires. |
| H03 | PM-Kisan "pay Rs 199 verification fee" | safe / 24 | A government scheme name plus a fee, with no link and no credential ask, matches no hard rule. |
| H07 | Hinglish "loan approved, pay processing fee on WhatsApp" | suspicious / 48 | The loan-APK rule needs "no documents"/".apk"; this wording has neither. |
| H11 | "Pay Rs 500 joining deposit, Telegram" | suspicious / 44 | `paidTask` needs a registration/payment word adjacent to task/job; "joining deposit" is not covered. |
| H12 | "webcam recording … bitcoin" | safe / 3 | `sextortionMedia` covers private/nude/compromising video, not "webcam recording". |
| H15 | "parcel contains narcotics … pay settlement" | suspicious / 39 | Threat + payment, but no named authority and no coercion phrase, so the digital-arrest rule does not fire. |

### False positive (1)

| ID | Message intent | Got | Why |
|---|---|---|---|
| H21 | Genuine Delhivery "share the OTP at the doorstep with the delivery agent" | scam / 70 | `credentialHard` sees "share … OTP" and floors it. Real delivery OTP wording collides with the strongest rule. |

These seven are recorded as known limitations. No rule was changed after this
run — that would turn the holdout into development data.

## 3. TS vs Python

Zero differences in verdict or score across the 40 development messages and the
30 holdout messages, plus 89/89 golden parity and the shared normalisation
fixture contract (`src/detection/normalizeFixtures.json`, asserted by both
`src/detection/normalize.test.ts` and `backend/test_parity.py`).
