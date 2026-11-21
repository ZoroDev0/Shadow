#!/usr/bin/env node
/* URL-policy fuzz for the browser extension.
 *
 * Runs the real evaluateUrl() over 200+ odd addresses and asserts three
 * things that must never regress:
 *   1. it never throws and always returns a well-formed decision;
 *   2. it never blocks a private-network, loopback or internal address;
 *   3. it never blocks any of the 84 known legitimate sites.
 *
 * Lookalike addresses are included too, so a policy that simply stopped
 * blocking would fail this script instead of passing it.
 *
 * Run: npx tsx scripts/fuzz-ext-policy.ts
 */
import { evaluateUrl } from "../extension/src/policy";
import { LEGIT_SITES } from "../extension/tests/legitSites.data";

type Category = "legit" | "private" | "internal" | "odd" | "hostile-path" | "lookalike";
interface Case { category: Category; url: string; }

const longLabel = "https://" + "a".repeat(250) + ".com";
const deepHost = "https://" + Array.from({ length: 120 }, () => "a").join(".") + ".com";
const hugeQuery = "https://example.com/?q=" + "x".repeat(4000);
const hugePath = "https://sbi-kyc-update.xyz/" + "a/".repeat(1000);
const hugeBare = "https://" + "a".repeat(8000);

const cases: Case[] = [
  ...LEGIT_SITES.map((url) => ({ category: "legit" as Category, url })),

  /* ── browser-internal and non-http schemes: never notreated as a page ── */
  ...[
    "chrome://settings", "chrome://extensions", "chrome://newtab", "chrome-untrusted://x/",
    "chrome-extension://abcdefghijklmnop/popup.html", "edge://extensions", "about:blank",
    "about:newtab", "devtools://devtools/bundled/inspector.html",
    "view-source:https://sbi-kyc-update.xyz/login", "file:///etc/passwd",
    "file:///Users/someone/Downloads/invoice.html",
    "data:text/html,<script>alert(1)</script>", "data:text/plain,hello",
    "blob:https://example.com/2c1f9c1e-0000-4000-8000-000000000000",
    "javascript:alert(document.domain)", "javascript:void(0)",
    "mailto:help@example.com", "tel:+919876543210", "ftp://files.example.com/x",
    "ws://socket.example.com/", "wss://socket.example.com/", "intent://scan/#Intent;scheme=zxing;end",
    "ms-settings:", "android-app://com.example.app/https/example.com"
  ].map((url) => ({ category: "internal" as Category, url })),

  /* ── private network, loopback and local-only names ─────────────────── */
  ...[
    "http://10.1.2.3/", "http://10.255.255.255:8080/", "https://10.0.0.1/login",
    "http://172.16.5.5/", "http://172.31.255.255/", "http://172.20.1.1:3000/admin",
    "http://192.168.0.1/", "http://192.168.1.1:8080/admin",
    "http://192.168.100.200/", "http://127.0.0.1:8000/health", "http://127.1.2.3/",
    "http://169.254.169.254/latest/meta-data/", "http://0.0.0.0/",
    "http://localhost/", "http://localhost:5173/", "http://app.localhost:5173/",
    "https://printer.local/", "http://build.internal/", "http://site.test/",
    "http://[::1]/", "http://[::1]:8080/", "http://[2001:db8::1]/",
    "http://[::ffff:192.168.0.1]/", "http://[fe80::1]/"
  ].map((url) => ({ category: "private" as Category, url })),

  /* ── malformed input ─────────────────────────────────────────────────── */
  ...[
    "", " ", "\t", "\n", "http://", "https://", "http:/x", "http:x.com",
    "htp://sbi-kyc-update.xyz", "://evil.com", "//evil.com", "////",
    "https://.", "https://..", "https://.evil.com", "https://evil..com",
    "https://-", "https://--", "https:// ", "https://exa mple.com",
    "https://exa\tmple.com", "https://a<b>c.com", "https://sbi-kyc-update.xyz/%",
    "https://sbi-kyc-update.xyz/%%%", "https://exa\"mple.com", "https://exa'mple.com"
  ].map((url) => ({ category: "odd" as Category, url })),

  /* ── unicode, punycode, homoglyph and control characters ─────────────── */
  ...[
    "https://ईसबी-केवाईसी.कॉम", "https://sbi-kyc-update。xyz", "https://sbi-kyc-update．xyz",
    "https://ѕbi.co.in", "https://sbi\u200b-kyc.xyz", "https://sbi\u202ekyc.xyz",
    "https://😀.com", "https://example.com/नमस्ते", "https://xn--80ak6aa92e.com",
    "https://xn--sbi-kyc-9va.com", "https://xn--fiqs8s", "https://xn--",
    "https://münchen.example", "https://Example.COM/Path", "https://example.com/%E2%98%83",
    "https://sbi。co。in", "https://exаmple.com", "https://ｓｂｉ-ｋｙｃ.ｘｙｚ"
  ].map((url) => ({ category: "odd" as Category, url })),

  /* ── userinfo, IPv6, ports, very long input ──────────────────────────── */
  ...[
    "https://sbi.co.in@evil.xyz/login", "https://evil.xyz@sbi.co.in/login",
    "https://user:pass@192.168.1.5/", "https://user:p@ss@example.com/",
    "https://user@example.com/", "https://@example.com/", "https://a@b@c@d/",
    "https://sbi-kyc-update.xyz@127.0.0.1/",
    "https://sbi.co.in:8443/", "https://www.hdfcbank.com:443/", "https://example.com:8080/path",
    "https://bit.ly:443/x", "https://sbi-kyc-update.xyz:8443/", "https://example.com:65535/",
    "https://example.com:65536/", "https://example.com:abc/",
    // 172.15.x.x is NOT in the private 172.16/12 block, so a bare IP here is
    // expected to block like any other public IP.
    "http://172.15.0.1/"
  ].map((url) => ({ category: "odd" as Category, url })),
  ...[longLabel, deepHost, hugeQuery, hugePath, hugeBare].map((url) => ({
    category: "odd" as Category, url
  })),

  /* ── hostile text that only LOOKS like a host (in a path/query/fragment) ── */
  ...[
    "https://example.com/sbi.co.in/login", "https://example.com/?next=https://sbi-kyc-update.xyz",
    "https://example.com/#sbi.co.in", "https://example.com/../sbi.co.in",
    "https://example.com%2f@sbi.co.in", "https://example.com/?otp=1234&bank=sbi",
    "https://example.com/sbi-kyc-update.xyz", "https://example.com//sbi.co.in//login"
  ].map((url) => ({ category: "hostile-path" as Category, url })),

  /* ── real lookalikes: the policy must still block these ──────────────── */
  ...[
    "https://sbi-kyc-update.xyz/login", "https://sbi.co.in.evil.com/login",
    "https://evil-sbi.xyz/", "https://hdfcbank-secure.com/", "https://iciclbank.com/",
    "https://xn--sbi-kyc-9va.com/", "http://45.33.12.9/login", "https://amazon-billing.com/pay",
    "https://paytm-kyc.top/", "http://sbi-kyc-update.xyz/login", "https://sbi-kyc-update.xyz:8443/"
  ].map((url) => ({ category: "lookalike" as Category, url }))
];

const failures: string[] = [];
const counts: Record<string, number> = {};
const seen = new Set<string>();
const blocked: string[] = [];
const VALID = new Set(["ignore", "badge", "block"]);

for (const item of cases) {
  if (seen.has(item.url)) continue;
  seen.add(item.url);
  counts[item.category] = (counts[item.category] || 0) + 1;

  let decision: any;
  try {
    decision = evaluateUrl(item.url);
  } catch (error: any) {
    failures.push(`THREW [${item.category}] ${JSON.stringify(item.url).slice(0, 80)} — ${error?.message}`);
    continue;
  }

  if (!decision || !VALID.has(decision.action) || typeof decision.host !== "string" || typeof decision.reason !== "string") {
    failures.push(`BAD SHAPE [${item.category}] ${JSON.stringify(item.url).slice(0, 80)} — ${JSON.stringify(decision)}`);
    continue;
  }

  if (decision.action === "block") blocked.push(`${item.category}: ${decision.host}`);
  if (item.category === "legit" && decision.action === "block") {
    failures.push(`BLOCKED LEGIT SITE ${item.url}`);
  }
  if ((item.category === "private" || item.category === "internal") && decision.action !== "ignore") {
    failures.push(`NOT IGNORED [${item.category}] ${item.url} → ${decision.action}`);
  }
  if (item.category === "lookalike" && decision.action !== "block") {
    failures.push(`LOOKALIKE NOT BLOCKED ${item.url} → ${decision.action}`);
  }
  if (item.category === "hostile-path" && decision.action === "block") {
    failures.push(`PATH TEXT MISTAKEN FOR HOST ${item.url} → ${decision.host}`);
  }
}

const total = seen.size;
if (total < 200) failures.push(`only ${total} unique URLs exercised (need 200+)`);

console.log("extension URL-policy fuzz");
console.log(`  unique URLs: ${total}`);
console.log("  by category: " + Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(" "));
console.log(`  blocked: ${blocked.length} (expected lookalikes only)`);
for (const line of blocked.slice(0, 12)) console.log("    - " + line);
if (blocked.length > 12) console.log(`    … ${blocked.length - 12} more`);

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s)`);
  for (const line of failures) console.error("  " + line);
  process.exit(1);
}
console.log("\nPASS — no throws, no private/internal blocks, no legitimate site blocked");
