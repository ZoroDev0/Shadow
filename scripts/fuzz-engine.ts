/* Engine robustness fuzz: identical adversarial inputs through the TypeScript
   engine (src/detection/engine.ts) and the Python mirror (backend/app.py).
   Fails on any exception, any verdict/score mismatch, or any call >= 100 ms.

   Run: npx tsx scripts/fuzz-engine.ts */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectLocal } from "../src/detection/engine";

const BUDGET_MS = 100;

const hand: string[] = [
  "",
  " ",
  "\n\t \r\n ",
  "\u00a0\u00a0\u00a0",
  "a".repeat(4000),
  "A".repeat(4000),
  "1".repeat(4000),
  "!".repeat(2000),
  ".".repeat(2000),
  " -_ ".repeat(1000),
  "😀".repeat(300),
  "🔒🏦💳".repeat(500),
  "مرحبا بالعالم".repeat(200),
  "שלום مرحبا".repeat(200),
  "\u200b".repeat(800),
  "\ufeffabc",
  "abc\u0000def",
  "\u0000".repeat(200),
  "आपका OTP 123456 है, https://sbi.co.in पर जाएँ. ".repeat(40),
  "HDFC KYC तुरंत करें https://hdfcbank-secure.com ".repeat(60),
  "https://" + "a".repeat(2000) + ".com/x",
  "https://" + "a.".repeat(500) + "com",
  "http://" + "9".repeat(300),
  "https://[::1]:8443/x",
  "https://[",
  "https://exa mple.com/login",
  "((((((((((",
  "]]]]]]]]",
  "https://sbi-kyc-update.xyz/" + "?".repeat(1000),
  "%20".repeat(1200),
  "@".repeat(500),
  "a@b".repeat(300),
  "xn--".repeat(400),
  "https://sbi-kyc.xyz/x ".repeat(300),
  "HDFC ".repeat(800),
  "Rs 199 pay ".repeat(400),
  "https://" + "a".repeat(3000) + "@" + "b".repeat(500) + ".com/",
  "http://" + "1.2.3.4.5.6.7.8.".repeat(60),
  "\u0007\u0008\u000b\u000c".repeat(200),
  "OTP 123456, never share it. ".repeat(150),
];

const tokens = [
  "https://", "http://", "hdfc", "sbi", "jio", "ajio", "bank.in", ".xyz", ".com",
  "केवाईसी", "तुरंत", "OTP", "123456", "😀", "\u200b", "\u0000", "[", "]", "@",
  "a", "1", " ", ".", "-", "_", "%", "/", "?", "&", "=", "रु", "Rs",
];
const gen: string[] = [];
for (let i = 0; i < 300; i++) {
  let s = "";
  let seed = (i * 2654435761) % 2147483647;
  const parts = 1 + (i % 12);
  for (let k = 0; k < parts; k++) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    s += tokens[seed % tokens.length];
    if (i % 17 === 0) s += "x".repeat(200);
  }
  gen.push(s);
}

const cases = [...hand, ...gen];

const ts: { verdict: string; score: number; ms: number }[] = [];
let slow: { text: string; ms: number }[] = [];
for (const text of cases) {
  const t0 = performance.now();
  try {
    const r = detectLocal(text);
    ts.push({ verdict: r.verdict, score: r.score, ms: performance.now() - t0 });
  } catch (e: any) {
    console.error("TS THROW:", JSON.stringify(text.slice(0, 60)), e?.message);
    process.exit(1);
  }
  const ms = ts[ts.length - 1].ms;
  if (ms >= BUDGET_MS) slow.push({ text, ms });
}

const dir = mkdtempSync(join(tmpdir(), "shadow-engine-fuzz-"));
const file = join(dir, "inputs.json");
writeFileSync(file, JSON.stringify(cases));

const pyDriver = `
import json, sys, time
sys.path.insert(0, "backend")
import app
cases = json.load(open(sys.argv[1], encoding="utf-8"))
out = []
for text in cases:
    t0 = time.perf_counter()
    r = app.detect_local(text)
    out.append({"verdict": r["verdict"], "score": int(r["score"]), "ms": (time.perf_counter() - t0) * 1000})
json.dump(out, sys.stdout)
`;
const py = JSON.parse(
  execFileSync("python3", ["-c", pyDriver, file], { maxBuffer: 64 * 1024 * 1024 }).toString()
) as { verdict: string; score: number; ms: number }[];

let mismatches = 0;
let pyOver = 0;
for (let i = 0; i < cases.length; i++) {
  const a = ts[i], b = py[i];
  if (!b) { console.error("PYTHON missing result at", i); process.exit(1); }
  if (a.verdict !== b.verdict || a.score !== b.score) {
    mismatches++;
    if (mismatches <= 10)
      console.error(`MISMATCH #${i} TS=${a.verdict}/${a.score} PY=${b.verdict}/${b.score} :: ${JSON.stringify(cases[i].slice(0, 60))}`);
  }
  if (b.ms >= BUDGET_MS) pyOver++;
}

const worst = (rows: { ms: number }[], arr: string[]) =>
  rows.map((r, i) => ({ ms: r.ms, len: arr[i].length })).sort((x, y) => y.ms - x.ms).slice(0, 5);
const fmt = (label: string, top: { ms: number; len: number }[]) =>
  `${label} slowest: ${top.map((t) => `${t.ms.toFixed(2)}ms/${t.len}ch`).join(", ")}`;

console.log(`engine fuzz: ${cases.length} inputs through TS and Python`);
console.log(fmt("TS", worst(ts, cases)));
console.log(fmt("PY", worst(py, cases)));
console.log(`mismatches: ${mismatches} | TS >= ${BUDGET_MS}ms: ${slow.length} | PY >= ${BUDGET_MS}ms: ${pyOver}`);

if (mismatches || pyOver || slow.length) {
  console.error("FAIL");
  process.exit(1);
}
console.log("PASS — no throws, identical verdict and score, every call under " + BUDGET_MS + "ms");
