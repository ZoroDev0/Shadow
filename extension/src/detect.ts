/* Checks run through the SAME engine the web app ships (src/detection).
   Nothing is copied: the popup, the options page and the service worker all
   import detectLocal / analyzeUrl from there.

   On-device by default. If — and only if — the user stores their own server
   address, pasted text is POSTed to `${apiBase}/analyze` with an 8 s timeout
   and any failure falls back to the local detector. */

import { analyzeUrl, detectLocal } from "../../src/detection/engine";
import type { AnalysisResult, Verdict } from "../../src/detection/types";

export const API_TIMEOUT_MS = 8000;
export type ResultSource = "local" | "api";
export type CheckedResult = AnalysisResult & { source: ResultSource };

const VERDICTS: Verdict[] = ["safe", "suspicious", "scam"];

function isResult(data: any): boolean {
  return !!data &&
    VERDICTS.indexOf(data.verdict) > -1 &&
    typeof data.score === "number" &&
    Array.isArray(data.reasons);
}

function shape(data: any): AnalysisResult {
  return {
    verdict: data.verdict,
    score: Math.max(0, Math.min(100, Math.round(data.score))),
    reasons: data.reasons.slice(0, 5),
    links: Array.isArray(data.links) ? data.links : [],
    advice: Array.isArray(data.advice) ? data.advice : [],
    highlights: Array.isArray(data.highlights) ? data.highlights : []
  };
}

export async function checkText(
  rawText: string,
  opts: { apiBase?: string; fetchImpl?: typeof fetch; timeoutMs?: number } = {}
): Promise<CheckedResult> {
  const text = String(rawText || "").slice(0, 4000);
  const apiBase = String(opts.apiBase || "").trim().replace(/\/+$/, "");
  if (!apiBase) return { ...detectLocal(text), source: "local" };

  const doFetch = opts.fetchImpl || (typeof fetch === "function" ? fetch : null);
  if (!doFetch) return { ...detectLocal(text), source: "local" };

  try {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = setTimeout(() => controller?.abort(), opts.timeoutMs ?? API_TIMEOUT_MS);
    const response = await doFetch(`${apiBase}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller?.signal
    });
    clearTimeout(timer);
    if (!response || !response.ok) throw new Error("HTTP " + (response ? response.status : "error"));
    const data = await response.json();
    if (!isResult(data)) throw new Error("Unexpected response shape");
    return { ...shape(data), source: "api" };
  } catch {
    return { ...detectLocal(text), source: "local" };
  }
}

/** A single address: always local, because this runs before the page loads. */
export function checkUrl(rawUrl: string): CheckedResult {
  return { ...analyzeUrl(String(rawUrl || "").slice(0, 2000)), source: "local" };
}
