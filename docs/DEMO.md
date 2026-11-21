# ScamShield 2-minute demo

## Two-minute script

1. Meet Priya and explain that she received a suspicious SBI KYC message.
2. Open Check and choose the fake SBI KYC example. Show the lookalike link beside `sbi.co.in`.
3. Read the SCAM verdict, risk score and plain-language reasons.
4. Switch the interface to Hindi, then switch text size to Extra large.
5. Check the real bank OTP example and show that it stays SAFE.
6. Open Protect and run one SMS simulation. Clearly describe it as a simulation.
7. Open Test lab and run tests; report the 74 project-written cases (50 scam, 7 suspicious, 17 safe). Label them project-written, not independent accuracy.
8. Close honestly: rule-based, not ML; optional URL ML OFF; no desktop SMS access.

## Likely judge questions

**Why rules instead of ML?**  
The 24-hour app needs explainable, on-device behavior. ML is optional and currently OFF because it is a website benchmark model, not a trained India-SMS classifier.

**How do you handle false positives?**  
Official domains are whitelisted; hard signs and negative genuine-message markers are separated; every rule change is parity-tested. False positives can still occur on unseen wording.

**What about privacy?**  
With `VITE_API_BASE` empty, the message stays on the device. With a backend configured, the text is sent only to that backend.

**Can it read SMS?**  
Not currently. The web app and Protect page do not access the phone SMS database. The browser extension and Android app would require separate implementations.

**What is next?**  
Add a licensed India-specific URL dataset, evaluate and retrain only if it adds measurable value, and integrate a separate browser/Android SMS client.

## Demo mode checklist

- [ ] Clear localStorage to trigger onboarding
- [ ] Preload and verify all five Check example chips
- [ ] Keep fake SBI KYC, real bank OTP and incoming-SMS simulation ready
- [ ] Switch to Hindi and back before presenting
- [ ] Set text size to Extra large for readability
- [ ] Ensure `VITE_API_BASE` is empty for the offline backup
- [ ] Have a screen recording of the complete flow
- [ ] Stop Wi-Fi to prove the on-device flow still works

## Backup plan

If live Wi-Fi fails, keep `VITE_API_BASE` empty and use only the local detector and
preloaded examples. If browser automation is unavailable, use the recorded demo and
Test lab 74 project-written result.
