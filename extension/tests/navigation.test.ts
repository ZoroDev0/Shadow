import { beforeEach, describe, expect, it, vi } from "vitest";
import { SCAM_URL, SUSPICIOUS_URL, createChromeMock, type ChromeMock } from "./chromeMock";

let mock: ChromeMock;

beforeEach(() => {
  mock = createChromeMock();
  (globalThis as any).chrome = mock.chrome;
  vi.resetModules();
});

async function background() {
  return import("../src/background");
}

describe("service worker navigation guard", () => {
  it("redirects a SCAM navigation to the interstitial before the page loads", async () => {
    const bg = await background();
    const decision = await bg.handleNavigation({ url: SCAM_URL, tabId: 7, frameId: 0 });

    expect(decision.action).toBe("block");
    expect(mock.tabUpdates).toHaveLength(1);
    expect(mock.tabUpdates[0].tabId).toBe(7);
    expect(mock.tabUpdates[0].url).toContain("chrome-extension://scamshield-test/blocked.html");
    expect(decodeURIComponent(mock.tabUpdates[0].url)).toContain(SCAM_URL);
    expect(mock.badge.text).toBe("!");
    expect(mock.badge.color).toBe("#000000");
  });

  it("only badges a BE CAREFUL link and never redirects it", async () => {
    const bg = await background();
    const decision = await bg.handleNavigation({ url: SUSPICIOUS_URL, tabId: 8, frameId: 0 });

    expect(decision.action).toBe("badge");
    expect(mock.tabUpdates).toHaveLength(0);
    expect(mock.badge.text).toBe("?");
  });

  it("ignores official, allowlisted, local and internal URLs", async () => {
    const bg = await background();
    mock.localStore.settings = { lang: "en", enabled: true, allowlist: ["bit.ly"], apiBase: "" };

    for (const url of [
      "https://www.hdfcbank.com/",
      "https://bit.ly/claim-prize",
      "http://localhost:5173/",
      "chrome://settings",
      "chrome-extension://abc/popup.html"
    ]) {
      const decision = await bg.handleNavigation({ url, tabId: 9, frameId: 0 });
      expect(decision.action, url).toBe("ignore");
    }
    expect(mock.tabUpdates).toHaveLength(0);
    expect(mock.badge.text).toBe("");
  });

  it("does nothing at all when protection is switched off", async () => {
    const bg = await background();
    mock.localStore.settings = { lang: "en", enabled: false, allowlist: [], apiBase: "" };

    const decision = await bg.handleNavigation({ url: SCAM_URL, tabId: 10, frameId: 0 });
    expect(decision.action).toBe("ignore");
    expect(mock.tabUpdates).toHaveLength(0);
    expect(mock.badge.text).toBe("");
  });

  it("ignores sub-frames", async () => {
    const bg = await background();
    const decision = await bg.handleNavigation({ url: SCAM_URL, tabId: 11, frameId: 3 });
    expect(decision.action).toBe("ignore");
    expect(mock.tabUpdates).toHaveLength(0);
  });

  it("remembers “Proceed anyway” for that domain for the session", async () => {
    const bg = await background();

    await bg.handleNavigation({ url: SCAM_URL, tabId: 12, frameId: 0 });
    expect(mock.tabUpdates).toHaveLength(1);

    const reply = await bg.handleMessage(
      { type: "allow-session", host: "sbi-kyc-update.xyz" },
      { tab: { id: 12 } }
    );
    expect(reply.ok).toBe(true);
    expect(mock.sessionStore.sessionAllow).toContain("sbi-kyc-update.xyz");

    const after = await bg.handleNavigation({ url: SCAM_URL, tabId: 13, frameId: 0 });
    expect(after.action).toBe("ignore");
    expect(mock.tabUpdates).toHaveLength(1);
  });

  it("does not remember a session allow for a different domain", async () => {
    const bg = await background();
    await bg.handleMessage({ type: "allow-session", host: "sbi-kyc-update.xyz" }, { tab: { id: 1 } });
    const decision = await bg.handleNavigation({ url: "https://hdfcbank-secure.com/", tabId: 14, frameId: 0 });
    expect(decision.action).toBe("block");
  });
});

describe("context menu results", () => {
  it("checks a right-clicked link and shows the result in a popup window", async () => {
    const bg = await background();
    const result = await bg.handleMenuClick(
      { menuItemId: "scamshield-check-link", linkUrl: "https://hdfcbank-secure.com/login" },
      { id: 21 }
    );

    expect(result?.verdict).toBe("scam");
    expect(result?.links[0].lookalike_of).toBe("hdfcbank.com");
    expect(mock.sessionStore.lastResult.url).toBe("https://hdfcbank-secure.com/login");
    expect(mock.sessionStore.lastResult.kind).toBe("link");
    expect(mock.windows).toHaveLength(1);
    expect(mock.windows[0].url).toBe("chrome-extension://scamshield-test/popup.html?view=result");
    expect(mock.badge.text).toBe("!");
  });

  it("checks selected text on-device", async () => {
    const bg = await background();
    const result = await bg.handleMenuClick(
      {
        menuItemId: "scamshield-check-selection",
        selectionText: "Your SBI account is blocked. Share the OTP 4821 now."
      },
      { id: 22 }
    );
    expect(result?.verdict).toBe("scam");
    expect(mock.sessionStore.lastResult.kind).toBe("selection");
  });

  it("creates exactly the two monochrome menu entries", async () => {
    const bg = await background();
    bg.createMenus();
    expect(mock.menus.map((m) => m.id).sort()).toEqual([
      "scamshield-check-link",
      "scamshield-check-selection"
    ]);
    expect(mock.menus.every((m) => m.title.includes("ScamShield"))).toBe(true);
    expect(mock.menus.map((m) => m.contexts[0]).sort()).toEqual(["link", "selection"]);
  });
});
