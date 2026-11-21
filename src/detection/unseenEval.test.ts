import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "vitest";
import { detectLocal } from "./engine";
import { CASES } from "./selfTests";

describe("40 unseen evaluation messages", () => {
  it("exports TS outputs for comparison", () => {
    const source = JSON.parse(readFileSync(join(process.cwd(), "docs/eval_unseen_messages.json"), "utf8"));
    const outputs = source.map((item: any) => ({
      ...item,
      ts: detectLocal(item.text),
    }));
    writeFileSync(join(process.cwd(), "backend/eval/unseen_from_ts.json"), JSON.stringify(outputs, null, 2));
  });
  it("exports project-written plus 15-extra parity golden outputs", () => {
    const extra = [
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
    ].map(([text, expect], i) => ({
      id: `X${i + 1}`,
      label: "extra",
      expect,
      text,
    }));
    const originalAndFixed = CASES.map((item) => ({
      id: item.id,
      label: item.label,
      expect: item.expect,
      text: item.text,
      result: detectLocal(item.text),
    }));
    const extras = extra.map((item) => ({
      ...item,
      result: detectLocal(item.text),
    }));
    writeFileSync(join(process.cwd(), "backend/golden.json"), JSON.stringify([...originalAndFixed, ...extras], null, 2));
  });
});
