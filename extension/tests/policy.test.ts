import { describe, expect, it } from "vitest";
import { evaluateUrl, isAllowlisted, isInternalUrl, isLocalHost } from "../src/policy";

describe("navigation policy", () => {
  it("blocks a lookalike bank domain", () => {
    const decision = evaluateUrl("https://sbi-kyc-update.xyz/login?otp=1");
    expect(decision.action).toBe("block");
    expect(decision.link?.lookalike_of).toBe("sbi.co.in");
  });

  it("blocks a brand name embedded as an inner subdomain", () => {
    expect(evaluateUrl("https://sbi.co.in.verify-kyc.top/login").action).toBe("block");
  });

  it("blocks a homoglyph / typosquat copy of a bank", () => {
    expect(evaluateUrl("https://iciclbank.com/login").action).toBe("block");
    expect(evaluateUrl("https://hdfcbank-secure.com").action).toBe("block");
  });

  it("blocks a punycode host and a public bare-IP address", () => {
    expect(evaluateUrl("https://xn--sbi-kyc-9va.com").action).toBe("block");
    expect(evaluateUrl("http://45.33.12.9/login").action).toBe("block");
  });

  it("never blocks a merely suspicious link", () => {
    const decision = evaluateUrl("https://bit.ly/claim-prize");
    expect(decision.action).toBe("badge");
    expect(decision.reason).toBe("suspicious");
  });

  it("badges a cheap-TLD link but does not block it", () => {
    expect(evaluateUrl("https://some-shop.online/item").action).toBe("badge");
  });

  it("ignores browser-internal and local pages", () => {
    for (const url of [
      "chrome://settings",
      "chrome-extension://abc/popup.html",
      "edge://extensions",
      "about:blank",
      "file:///Users/me/report.html",
      "http://localhost:5173/",
      "http://127.0.0.1:8000/health",
      "http://192.168.1.1/admin",
      "http://10.0.0.4/",
      "http://printer.local/"
    ]) {
      const decision = evaluateUrl(url);
      expect(decision.action, url).toBe("ignore");
    }
  });

  it("treats official domains from rules.json as safe", () => {
    for (const url of [
      "https://onlinesbi.sbi/",
      "https://www.hdfcbank.com/personal",
      "https://www.cybercrime.gov.in/",
      "https://www.uidai.gov.in/",
      "https://www.amazon.in/orders"
    ]) {
      const decision = evaluateUrl(url);
      expect(decision.action, url).toBe("ignore");
      expect(decision.reason).toBe("official");
    }
  });

  it("honours the allowlist for the domain and its subdomains", () => {
    expect(evaluateUrl("https://bit.ly/x", { allowlist: ["bit.ly"] }).action).toBe("ignore");
    expect(evaluateUrl("https://a.b.example.org/x", { allowlist: ["example.org"] }).action).toBe("ignore");
    expect(isAllowlisted("evil.example.org", ["example.org"])).toBe(true);
    expect(isAllowlisted("example.org.evil.com", ["example.org"])).toBe(false);
  });

  it("keeps helper predicates honest", () => {
    expect(isInternalUrl("chrome://newtab")).toBe(true);
    expect(isInternalUrl("https://example.com")).toBe(false);
    expect(isLocalHost("localhost")).toBe(true);
    expect(isLocalHost("example.com")).toBe(false);
  });
});
