/* Navigation policy — pure functions, no chrome.* calls, so the rules that
   decide "block / badge / ignore" are directly testable.

   False positives matter more than coverage here: anything the browser itself
   owns, anything on this machine, an official domain from rules.json, or a
   site the user trusts is ignored before the engine is consulted. */

import { analyzeLink, realDomainOf, urlHost } from "../../src/detection/engine";
import { normalizeDomain } from "./settings";

export type UrlAction = "ignore" | "badge" | "block";
export type UrlReason = "internal" | "local" | "official" | "allowlisted" | "plain" | "suspicious" | "scam";

export interface UrlDecision {
  action: UrlAction;
  reason: UrlReason;
  host: string;
  link: ReturnType<typeof analyzeLink> | null;
}

const INTERNAL_SCHEMES = /^(chrome|chrome-extension|chrome-untrusted|chrome-search|edge|about|devtools|view-source|moz-extension|safari-extension|file|data|blob|javascript|mailto|tel):/i;

export function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(String(url || "").trim());
}

export function isInternalUrl(url: string): boolean {
  const value = String(url || "").trim();
  if (!value) return true;
  if (INTERNAL_SCHEMES.test(value)) return true;
  return !isHttpUrl(value);
}

export function isLocalHost(host: string): boolean {
  const h = String(host || "").toLowerCase();
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h.endsWith(".local") || h.endsWith(".test") || h.endsWith(".internal")) return true;
  if (/^127\./.test(h) || h === "0.0.0.0" || h === "[::1]" || h === "::1") return true;
  if (/^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  return false;
}

export function isAllowlisted(host: string, allowlist: string[]): boolean {
  const h = normalizeDomain(host);
  if (!h) return false;
  for (const entry of allowlist || []) {
    const domain = normalizeDomain(entry);
    if (!domain) continue;
    if (h === domain || h.endsWith("." + domain)) return true;
  }
  return false;
}

/** Decide what to do with a main-frame navigation. */
export function evaluateUrl(rawUrl: string, opts: { allowlist?: string[] } = {}): UrlDecision {
  const host = urlHost(String(rawUrl || ""));
  if (isInternalUrl(rawUrl)) return { action: "ignore", reason: "internal", host, link: null };
  if (!host || host.indexOf(".") === -1 || isLocalHost(host)) {
    return { action: "ignore", reason: "local", host, link: null };
  }
  if (isAllowlisted(host, opts.allowlist || [])) {
    return { action: "ignore", reason: "allowlisted", host, link: null };
  }
  if (realDomainOf(host)) return { action: "ignore", reason: "official", host, link: null };

  const link = analyzeLink(String(rawUrl));
  if (link.verdict === "scam") return { action: "block", reason: "scam", host, link };
  if (link.verdict === "suspicious") return { action: "badge", reason: "suspicious", host, link };
  return { action: "ignore", reason: "plain", host, link };
}

/** Full two-level decision including the global switch and the session allowlist. */
export function decideNavigation(
  url: string,
  opts: { allowlist?: string[]; sessionAllow?: string[]; enabled?: boolean } = {}
): UrlDecision {
  if (opts.enabled === false) return { action: "ignore", reason: "internal", host: urlHost(url), link: null };
  const combined = [...(opts.allowlist || []), ...(opts.sessionAllow || [])];
  return evaluateUrl(url, { allowlist: combined });
}
