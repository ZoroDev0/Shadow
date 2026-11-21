import { api } from "./api";
import type { Lang } from "./i18n";

export interface Settings {
  lang: Lang;
  enabled: boolean;
  allowlist: string[];
  apiBase: string;
}

export const DEFAULTS: Settings = { lang: "en", enabled: true, allowlist: [], apiBase: "" };

export const SETTINGS_KEY = "settings";
export const SESSION_ALLOW_KEY = "sessionAllow";
export const LAST_RESULT_KEY = "lastResult";

/** "https://WWW.Example.com/path" → "example.com" */
export function normalizeDomain(raw: string): string {
  let value = String(raw || "").trim().toLowerCase();
  if (!value) return "";
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  value = value.split("/")[0].split("?")[0].split("#")[0];
  const at = value.lastIndexOf("@");
  if (at > -1) value = value.slice(at + 1);
  value = value.split(":")[0].replace(/^www\./, "").replace(/\.$/, "");
  if (!/^[a-z0-9.-]+$/.test(value) || value.indexOf(".") === -1) return "";
  return value;
}

export function normalizeApiBase(raw: string): string {
  const value = String(raw || "").trim().replace(/\/+$/, "");
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return value;
  } catch {
    return "";
  }
}

export function normalizeSettings(raw: any): Settings {
  const source = raw && typeof raw === "object" ? raw : {};
  const allowlist: string[] = [];
  for (const entry of Array.isArray(source.allowlist) ? source.allowlist : []) {
    const domain = normalizeDomain(entry);
    if (domain && allowlist.indexOf(domain) === -1) allowlist.push(domain);
  }
  return {
    lang: source.lang === "hi" ? "hi" : "en",
    enabled: source.enabled !== false,
    allowlist,
    apiBase: normalizeApiBase(source.apiBase)
  };
}

export async function getSettings(): Promise<Settings> {
  const c = api();
  const stored = c ? await c.storage.local.get(SETTINGS_KEY) : {};
  return normalizeSettings(stored?.[SETTINGS_KEY]);
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = normalizeSettings({ ...(await getSettings()), ...patch });
  const c = api();
  if (c) await c.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

/* ── Per-session allowlist ("Proceed anyway") ────────────────────────── */

export async function getSessionAllow(): Promise<string[]> {
  const c = api();
  if (!c || !c.storage.session) return [];
  const stored = await c.storage.session.get(SESSION_ALLOW_KEY);
  const list = stored?.[SESSION_ALLOW_KEY];
  return Array.isArray(list) ? list.filter((x: unknown) => typeof x === "string") : [];
}

export async function rememberSession(host: string): Promise<string[]> {
  const domain = normalizeDomain(host);
  if (!domain) return getSessionAllow();
  const list = await getSessionAllow();
  if (list.indexOf(domain) === -1) list.push(domain);
  const c = api();
  if (c && c.storage.session) await c.storage.session.set({ [SESSION_ALLOW_KEY]: list });
  return list;
}

/* ── Last context-menu result (popup shows it) ───────────────────────── */

export async function setLastResult(result: any): Promise<void> {
  const c = api();
  if (c && c.storage.session) await c.storage.session.set({ [LAST_RESULT_KEY]: result });
}

export async function getLastResult(): Promise<any | null> {
  const c = api();
  if (!c || !c.storage.session) return null;
  const stored = await c.storage.session.get(LAST_RESULT_KEY);
  return stored?.[LAST_RESULT_KEY] ?? null;
}
