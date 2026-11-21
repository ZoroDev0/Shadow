import { beforeEach, describe, expect, it, vi } from "vitest";
import { createChromeMock } from "./chromeMock";

beforeEach(() => {
  (globalThis as any).chrome = createChromeMock().chrome;
  vi.resetModules();
});

const SCAM_TEXT = "Your SBI account is blocked. Update KYC now: http://sbi-kyc-update.xyz";

describe("checkText", () => {
  it("checks on-device when no server is configured", async () => {
    const { checkText } = await import("../src/detect");
    const fetchImpl = vi.fn();
    const result = await checkText(SCAM_TEXT, { apiBase: "", fetchImpl: fetchImpl as any });

    expect(result.verdict).toBe("scam");
    expect(result.source).toBe("local");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("uses the configured server when it answers", async () => {
    const { checkText } = await import("../src/detect");
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        verdict: "suspicious",
        score: 40,
        reasons: [{ icon: "link", text_en: "From the server", text_hi: "सर्वर से" }],
        links: [],
        advice: [{ text_en: "Check the app", text_hi: "ऐप जाँचें" }],
        highlights: []
      })
    }));

    const result = await checkText(SCAM_TEXT, {
      apiBase: "https://api.example.com",
      fetchImpl: fetchImpl as any
    });

    expect(result.source).toBe("api");
    expect(result.verdict).toBe("suspicious");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/analyze",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ text: SCAM_TEXT }) })
    );
  });

  it("falls back to the local engine when the server fails", async () => {
    const { checkText } = await import("../src/detect");
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    });
    const result = await checkText(SCAM_TEXT, {
      apiBase: "https://api.example.com",
      fetchImpl: fetchImpl as any
    });
    expect(result.source).toBe("local");
    expect(result.verdict).toBe("scam");
  });

  it("falls back to the local engine on an error status or a bad response shape", async () => {
    const { checkText } = await import("../src/detect");

    const errorStatus = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    const badShape = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ verdict: "maybe" }) }));

    for (const fetchImpl of [errorStatus, badShape]) {
      const result = await checkText(SCAM_TEXT, { apiBase: "https://api.example.com", fetchImpl: fetchImpl as any });
      expect(result.source).toBe("local");
      expect(result.verdict).toBe("scam");
    }
  });

  it("uses an 8 second timeout", async () => {
    const { API_TIMEOUT_MS } = await import("../src/detect");
    expect(API_TIMEOUT_MS).toBe(8000);
  });
});

describe("checkUrl", () => {
  it("reports the link-level verdict, not a diluted message score", async () => {
    const { checkUrl } = await import("../src/detect");
    const result = checkUrl("https://sbi-kyc-update.xyz/login");
    expect(result.verdict).toBe("scam");
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.links[0].lookalike_of).toBe("sbi.co.in");
    expect(result.advice.length).toBeGreaterThan(0);
  });

  it("keeps a suspicious link merely suspicious", async () => {
    const { checkUrl } = await import("../src/detect");
    expect(checkUrl("https://bit.ly/x").verdict).toBe("suspicious");
  });
});
