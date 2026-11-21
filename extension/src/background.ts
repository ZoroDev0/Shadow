/* ScamShield service worker (MV3).
 *
 * Responsibilities
 *  1. Right-click "Check with ScamShield" on selected text or on a link.
 *  2. Analyse every main-frame navigation locally, before the page loads.
 *     SCAM  → the tab is sent to blocked.html (never the scam page).
 *     BE CAREFUL → badge only, navigation is allowed.
 *  3. Remember "Proceed anyway" for that domain for this browser session.
 *
 * All detection comes from src/detection via ./detect — nothing is duplicated. */

import { api } from "./api";
import { checkText, checkUrl, type CheckedResult } from "./detect";
import { t } from "./i18n";
import { decideNavigation } from "./policy";
import { getSessionAllow, getSettings, rememberSession, setLastResult } from "./settings";

const MENU_SELECTION = "scamshield-check-selection";
const MENU_LINK = "scamshield-check-link";

export function blockedPageUrl(url: string): string {
  const c = api();
  return `${c.runtime.getURL("blocked.html")}?url=${encodeURIComponent(url)}`;
}

export async function setBadge(tabId: number | undefined, verdict: string, lang: "en" | "hi"): Promise<void> {
  const c = api();
  if (!c?.action) return;
  const target = typeof tabId === "number" && tabId >= 0 ? { tabId } : {};
  const text = verdict === "scam" ? "!" : verdict === "suspicious" ? "?" : "";
  await c.action.setBadgeText({ ...target, text });
  if (!text) return;
  await c.action.setBadgeBackgroundColor({ ...target, color: "#000000" });
  if (c.action.setBadgeTextColor) await c.action.setBadgeTextColor({ ...target, color: "#ffffff" });
  const title = verdict === "scam" ? t(lang, "ext_badge_scam") : t(lang, "ext_badge_susp");
  await c.action.setTitle({ ...target, title });
}

/** Decide and act on one main-frame navigation. Returns the decision (testable). */
export async function handleNavigation(details: any): Promise<any> {
  const c = api();
  if (!details || details.frameId !== 0 || typeof details.tabId !== "number" || details.tabId < 0) {
    return { action: "ignore", reason: "frame" };
  }
  const settings = await getSettings();
  if (!settings.enabled) return { action: "ignore", reason: "disabled" };

  const sessionAllow = await getSessionAllow();
  const decision = decideNavigation(String(details.url || ""), {
    allowlist: settings.allowlist,
    sessionAllow,
    enabled: settings.enabled
  });

  if (decision.action === "block") {
    await c.tabs.update(details.tabId, { url: blockedPageUrl(details.url) });
    await setBadge(details.tabId, "scam", settings.lang);
  } else if (decision.action === "badge") {
    await setBadge(details.tabId, "suspicious", settings.lang);
  } else if (decision.reason === "plain") {
    await setBadge(details.tabId, "safe", settings.lang);
  }
  return decision;
}

/** Build the result for a context-menu click and show it in a small window. */
export async function handleMenuClick(info: any, tab?: any): Promise<CheckedResult | null> {
  const c = api();
  const settings = await getSettings();
  const isLink = info?.menuItemId === MENU_LINK;
  let result: CheckedResult;
  let url = "";

  if (isLink) {
    url = String(info.linkUrl || "");
    if (!url) return null;
    result = checkUrl(url);
  } else {
    const selection = String(info?.selectionText || "").slice(0, 4000);
    if (!selection.trim()) return null;
    result = await checkText(selection, { apiBase: settings.apiBase });
  }

  await setLastResult({ ...result, url, kind: isLink ? "link" : "selection" });
  await setBadge(tab?.id, result.verdict, settings.lang);

  const popupUrl = c.runtime.getURL("popup.html") + "?view=result";
  try {
    await c.windows.create({ url: popupUrl, type: "popup", width: 420, height: 680 });
  } catch {
    if (c.tabs?.create) await c.tabs.create({ url: popupUrl });
  }
  return result;
}

export function createMenus(): void {
  const c = api();
  if (!c?.contextMenus) return;
  c.contextMenus.removeAll(() => {
    c.contextMenus.create({ id: MENU_SELECTION, title: "Check with ScamShield", contexts: ["selection"] });
    c.contextMenus.create({ id: MENU_LINK, title: "Check this link with ScamShield", contexts: ["link"] });
  });
}

/** "Proceed anyway" from the interstitial: allow this domain for the session. */
export async function handleMessage(message: any, sender?: any): Promise<any> {
  if (!message || message.type !== "allow-session" || !message.host) return { ok: false };
  const list = await rememberSession(String(message.host));
  const settings = await getSettings();
  await setBadge(sender?.tab?.id, "safe", settings.lang);
  return { ok: true, sessionAllow: list };
}

/* ── Listener registration (skipped when the APIs are absent, e.g. in tests
      that import the module without a mock) ───────────────────────────── */
const c = api();
if (c) {
  if (c.runtime?.onInstalled) c.runtime.onInstalled.addListener(() => createMenus());
  if (c.runtime?.onStartup) c.runtime.onStartup.addListener(() => createMenus());
  if (c.contextMenus?.onClicked) {
    c.contextMenus.onClicked.addListener((info: any, tab: any) => {
      void handleMenuClick(info, tab);
    });
  }
  if (c.webNavigation?.onBeforeNavigate) {
    c.webNavigation.onBeforeNavigate.addListener((details: any) => {
      void handleNavigation(details);
    });
  }
  if (c.runtime?.onMessage) {
    c.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
      handleMessage(message, sender).then(sendResponse);
      return true;
    });
  }
}
