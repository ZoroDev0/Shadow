# ScamShield 2-minute demo

## Two-minute script

1. **Meet Priya (Demo Story):**
   - Click "See a demo story" on the Check screen.
   - Walk through Step 1 (Meet Priya, 58, Mumbai school teacher), Step 2 (The attack: SMS received), Step 3 (Without vs With ScamShield side-by-side comparison), and Step 4 ("Now you try": interactive checker directly inside the demo).
   - Click "Use Priya’s SMS" and click "Check now" to show the live `SCAM` verdict. Close story with "Done".
2. **Check the Lookalike Link:**
   - Tap the "Fake SBI KYC scam" example chip.
   - Point out the shape-coded `SCAM` verdict, the 100/100 risk score, and the visual link diff (`sbi-kyc-update.xyz` vs real `sbi.co.in` with inverted difference marker).
3. **Language & Accessibility:**
   - Switch language to Hindi in Settings (or via topbar). Show immediate translation of verdict, reasons, and guidance.
   - Demonstrate text size "Extra large" (`data-ts="xl"`) with zero button clipping.
4. **Genuine Messages Stay Safe:**
   - Check the "Real bank OTP" and "Swiggy order" example chips; show that both give `SAFE` without false alarms.
5. **Simulated Protection Layers:**
   - Open the "Protect" tab. Trigger the "Simulate incoming SMS" banner, "Simulate copied text" toast, and "Simulate dangerous site" overlay.
   - Clarify explicitly to judges that these are live demonstrations of future native client capabilities.
6. **Test Lab (Verification Suite):**
   - Open Settings -> Test lab -> "Run tests".
   - Show the 74 project-written cases (50 scam, 7 suspicious, 17 safe) all passing at 100% on-device.
7. **Wrap-up & Offline Guarantee:**
   - Explain privacy architecture: with `VITE_API_BASE` unset, zero network requests leave the device. Show that the app continues to operate flawlessly even with airplane mode active.

## Judge Q&A Cheat Sheet

- **Why rule-based heuristics over LLM on-device?**
  Guarantees instant (<50ms) inference, zero token cost, zero data leakage, and total explainability for regulatory and user trust in India's banking ecosystem.
- **How are lookalike domains detected?**
  Homoglyphs, punycode, hyphenated prefixes, embedded brands, and known suspicious TLDs are matched against official verified domains.
- **Is this reading user SMS automatically?**
  No. On web, the user pastes text or checks preloaded samples. Direct SMS interception requires the companion Android app or notification listener.

## Demo Pre-Flight Checklist

- [x] Clear `localStorage` to verify onboarding flow
- [x] Test all 5 Check example chips
- [x] Confirm EN/HI language switch
- [x] Verify offline execution with `VITE_API_BASE` unset
- [x] Ensure browser audio is enabled if demonstrating Read Aloud
