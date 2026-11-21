# Phase 7 one-shot evaluation

This run happened **after** the Phase 7 rules were written, evaluated exactly
once, and was not tuned on afterwards. The messages were written by the same
agent that wrote the rules, so this is **not independent evidence** of
real-world accuracy. For a human-written test see `docs/INDEPENDENT_EVAL.md`.

- Messages: `docs/eval_holdout_phase7_messages.json` (30, written for this phase).
- Engines: TypeScript (`src/detection/engine.ts`) and Python (`backend/app.py`).
- Result: **24/30 verdicts correct**, 5 misses, 1 false positive.
- TS and Python agreed on verdict and score for all 30.

## Per-message results

| ID | Family | Expected | TS verdict / score | Python verdict / score | Outcome |
|---|---|---|---|---|---|
| N01 | EPFO claim fee | scam | suspicious / 44 | suspicious / 44 | MISS/FP |
| N02 | YONO reward points | scam | scam / 100 | scam / 100 | OK |
| N03 | Paytm KYC | scam | scam / 100 | scam / 100 | OK |
| N04 | vaccine certificate fee | scam | scam / 100 | scam / 100 | OK |
| N05 | matrimonial advance fee | scam | safe / 18 | safe / 18 | MISS/FP |
| N06 | OLX scan to receive | scam | scam / 70 | scam / 70 | OK |
| N07 | customs gift parcel | scam | scam / 100 | scam / 100 | OK |
| N08 | Tata Power bill link | scam | scam / 100 | scam / 100 | OK |
| N09 | ITR refund lookalike | scam | scam / 100 | scam / 100 | OK |
| N10 | LIC bonus fee | scam | suspicious / 44 | suspicious / 44 | MISS/FP |
| N11 | Hinglish SIM block | scam | scam / 68 | scam / 68 | OK |
| N12 | Devanagari police threat | scam | scam / 85 | scam / 85 | OK |
| N13 | data-entry registration fee | scam | scam / 100 | scam / 100 | OK |
| N14 | lucky draw tax | scam | suspicious / 34 | suspicious / 34 | MISS/FP |
| N15 | crypto wallet drain | scam | safe / 3 | safe / 3 | MISS/FP |
| N16 | EPFO settled | safe | safe / 4 | safe / 4 | OK |
| N17 | SBI reward points genuine | safe | safe / 3 | safe / 3 | OK |
| N18 | Paytm KYC done | safe | safe / 3 | safe / 3 | OK |
| N19 | CoWIN certificate ready | safe | safe / 4 | safe / 4 | OK |
| N20 | matrimonial verified | safe | safe / 3 | safe / 3 | OK |
| N21 | OLX ad live | safe | safe / 3 | safe / 3 | OK |
| N22 | India Post cleared | safe | safe / 12 | safe / 12 | OK |
| N23 | Tata Power bill | safe | safe / 3 | safe / 3 | OK |
| N24 | ITR credited | safe | safe / 12 | safe / 12 | OK |
| N25 | LIC premium due | safe | safe / 16 | safe / 16 | OK |
| N26 | Airtel KYC complete | safe | safe / 4 | safe / 4 | OK |
| N27 | police FIR update | safe | safe / 19 | safe / 19 | OK |
| N28 | job application received | safe | suspicious / 36 | suspicious / 36 | MISS/FP |
| N29 | free coffee draw | safe | safe / 14 | safe / 14 | OK |
| N30 | exchange withdrawal | safe | safe / 3 | safe / 3 | OK |
## Misses (5)

| ID | Intent | Got | Why |
|---|---|---|---|
| N01 | EPFO PF claim "pay Rs 99 to release" | suspicious / 44 | The release-fee rule needs a `verification/processing/release` fee word; "pay Rs 99 … to release it" splits the verb and the noun too widely. |
| N05 | Matrimonial site "pay Rs 3,500 registration" | safe / 18 | A private advance fee for a dating/matrimonial profile is not in any rule class; no link, no credential ask. |
| N10 | LIC bonus "pay 2% processing fee" | suspicious / 44 | The fee has no amount and no link; the release-fee rule needs a link or an explicit fee amount to reach the hard tier. |
| N14 | "won Rs 9 lakh … pay Rs 4,500 GST" | suspicious / 34 | The prize rule fires, but the fee is worded as "GST", not "fee/charge", so it stays below the scam floor. |
| N15 | Crypto wallet "send 0.01 BTC to secure it" | safe / 3 | Crypto transfer demands are covered only when paired with intimate media; a standalone wallet-drain message has no rule. |

## False positive (1)

| ID | Intent | Got | Why |
|---|---|---|---|
| N28 | Genuine "Amazon: your application … No fee is charged" | suspicious / 36 | "Amazon" + "data entry" matches the job-bait rule, and the negation ("no fee") does not suppress that signal. |

## What changed for this phase

All Phase 7 rule changes are general and mirrored in TS and Python; the eight
new self-test regressions `R12`-`R19` cover them.

- Delivery hand-over: an OTP given in person to a delivery agent, in a message
  naming a courier/order with no link and no phone number, no longer trips the
  credential hard signal. A link or number restores it (`R12`, `R19`).
- Upfront fee to release money or a benefit (`R13`, `R14`).
- Approved loan + processing/advance fee via a private contact (`R15`).
- Job/task "joining deposit" and similar start-up fees (`R16`).
- Webcam-recording blackmail (`R17`).
- Parcel-contraband threat + payment demand (`R18`).
- `.online`/`.site` added to the cheap-TLD list.

The 30 Phase 6 messages were used as development data while writing these
rules and are no longer a holdout (`docs/eval_holdout_phase6.md`).

## Suite state after this phase

- Self-tests: **74 project-written cases** (50 scam, 7 suspicious, 17 safe):
  55 original + 11 audit-gap regressions + 8 Phase 7 regressions.
- Golden parity: **89 entries** (74 + 15 extra), identical verdict and score in
  TS and Python.
- These are project-written cases, not independent accuracy.
