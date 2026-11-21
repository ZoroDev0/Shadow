/* False-positive guard: popular legitimate sites must never be blocked.
   A "block" here means the user is stopped from opening a real site, which is
   the most expensive mistake this extension can make. */

import { describe, expect, it } from "vitest";
import { evaluateUrl } from "../src/policy";
import { analyzeLink } from "../../src/detection/engine";

import { LEGIT_SITES } from "./legitSites.data";

export { LEGIT_SITES };


describe("popular legitimate sites", () => {
  it(`has at least 40 sites (${LEGIT_SITES.length})`, () => {
    expect(LEGIT_SITES.length).toBeGreaterThanOrEqual(40);
    expect(new Set(LEGIT_SITES).size).toBe(LEGIT_SITES.length);
  });

  it("never blocks one of them", () => {
    const blocked = LEGIT_SITES.filter((url) => evaluateUrl(url).action === "block");
    expect(blocked).toEqual([]);
  });

  it("never marks one of them as a scam link at the link level", () => {
    const scam = LEGIT_SITES.filter((url) => analyzeLink(url).verdict === "scam");
    expect(scam).toEqual([]);
  });

  it("still blocks the lookalike version of a guarded brand", () => {
    expect(evaluateUrl("https://hdfcbank-kyc-verify.top/login").action).toBe("block");
    expect(evaluateUrl("https://amazon-billing.com/pay").action).toBe("block");
  });
});
