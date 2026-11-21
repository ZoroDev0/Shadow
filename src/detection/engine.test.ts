import { describe, expect, it } from "vitest";
import { detectLocal } from "./engine";
import { CASES } from "./selfTests";

describe("ScamShield 48-case detector suite", () => {
  it("passes every labelled case", () => {
    const failures = CASES.filter((c) => detectLocal(c.text).verdict !== c.expect);
    expect(failures.map((c) => c.id)).toEqual([]);
  });

  it("preserves expected verdicts for 15 unseen cases", () => {
    const cases = [
      ["SBI account blocked update", "suspicious"],
      ["Your HDFC card will be blocked now. Click hdfc-secure.xyz", "scam"],
      ["OTP is 123456. Do not share it.", "safe"],
      ["Dinner at 8 tomorrow?", "safe"],
      ["You won a prize. Send Aadhaar and pay fee.", "scam"],
      ["Pay at parivahan.gov.in for your challan.", "safe"],
      ["Install AnyDesk so we can refund your money.", "scam"],
      ["Your Swiggy order is arriving tonight.", "suspicious"],
      ["WhatsApp +91 9876500000 and pay Rs 5000", "safe"],
      ["KYC update karo abhi at bank-kyc.top", "scam"],
      ["Your salary has arrived in your account.", "safe"],
      ["Press 9 to speak to RBI officer.", "suspicious"],
      ["We have your private video. Pay Rs 20,000 to this UPI id or we will send it to all contacts.", "scam"],
      ["Track your Amazon package at amazon.in/track/123", "safe"],
      ["Aapka PAN update karein at pan-check.info", "suspicious"],
    ] as const;
    for (const [text, verdict] of cases) {
      const got = detectLocal(text).verdict;
      if (got !== verdict) throw new Error(`${text} => expected ${verdict}, got ${got}`);
    }
  });
});
