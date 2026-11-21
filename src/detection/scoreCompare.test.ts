import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { detectLocal } from "./engine";

describe("old HTML engine score parity", () => {
  it("has zero score differences for 48 cases and 15 extra cases", () => {
    const source = readFileSync("index_9.html", "utf8");
    const start = source.indexOf("/*DETECTION-START*/");
    const end = source.indexOf("/*DETECTION-END*/");
    let detection = source.slice(start, end);
    const selfStart = detection.indexOf("/* ── 10 · Self-test suite");
    if (selfStart >= 0) detection = detection.slice(0, selfStart);
    detection += "\nconst sleep = ms => new Promise(r => setTimeout(r, ms));\nglobalThis.__oldEngine = { detectLocal };";

    const context: any = { console, Set, URL, AbortController, globalThis: {} };
    vm.runInNewContext(detection, context);
    const oldDetect: (text: string) => any = context.__oldEngine?.detectLocal
      || context.globalThis.__oldEngine?.detectLocal;

    const casesStart = source.indexOf("const CASES = [", source.indexOf("function runSelfTests()"));
    const casesEnd = source.indexOf("\n  ];", casesStart) + 4;
    const casesSource = source.slice(casesStart + "const CASES = ".length, casesEnd);
    const cases = vm.runInNewContext(`(${casesSource})`);

    const extra = [
      "SBI account blocked update",
      "Your HDFC card will be blocked now. Click hdfc-secure.xyz",
      "OTP is 123456. Do not share it.",
      "Dinner at 8 tomorrow?",
      "You won a prize. Send Aadhaar and pay fee.",
      "Pay at parivahan.gov.in for your challan.",
      "Install AnyDesk so we can refund your money.",
      "Your Swiggy order is arriving tonight.",
      "WhatsApp +91 9876500000 and pay Rs 5000",
      "KYC update karo abhi at bank-kyc.top",
      "Your salary has arrived in your account.",
      "Press 9 to speak to RBI officer.",
      "We have your private video. Pay Rs 20,000 to this UPI id or we will send it to all contacts.",
      "Track your Amazon package at amazon.in/track/123",
      "Aapka PAN update karein at pan-check.info",
    ];

    const differences: any[] = [];
    for (const c of cases) {
      const oldResult = oldDetect(c.text);
      const newResult = detectLocal(c.text);
      if (oldResult.verdict !== newResult.verdict || oldResult.score !== newResult.score) {
        differences.push({ id: c.id, old: oldResult, new: newResult });
      }
    }
    for (let i = 0; i < extra.length; i++) {
      const oldResult = oldDetect(extra[i]);
      const newResult = detectLocal(extra[i]);
      if (oldResult.verdict !== newResult.verdict || oldResult.score !== newResult.score) {
        differences.push({ id: `extra-${i + 1}`, old: oldResult, new: newResult });
      }
    }
    expect(differences).toEqual([]);
  });
});
