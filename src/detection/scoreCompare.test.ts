import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { detectLocal } from "./engine";
import { CASES } from "./selfTests";

/* The legacy standalone engine still embedded in index_9.html is a frozen
   reference artifact. The shipped UI does NOT run it (index.html loads
   src/main.tsx -> initLegacy() -> src/detection/analyze.ts -> engine.ts).

   This test fails whenever the two implementations disagree on any case
   except the documented, intentional audit-gap fixes below. */
const KNOWN_DIFFERENCES = [
  "U01", "U02", "U03", "U04", "U05", "U06", "U07",
  "R01", "R02", "R03", "R04", "R05", "R06", "R07", "R08", "R09", "R10", "R11",
  // Phase 7 general-rule additions: delivery hand-over, release fee, loan fee,
  // joining deposit, webcam blackmail, parcel contraband, cheap-TLD benefit link.
  "R12", "R13", "R14", "R15", "R16", "R17", "R18", "R19",
  "S19", "S27", "X10",
];

describe("legacy reference engine vs modular engine", () => {
  it("differs only on the documented audit-gap cases", () => {
    const source = readFileSync("index_9.html", "utf8");
    const start = source.indexOf("/*DETECTION-START*/");
    const end = source.indexOf("/*DETECTION-END*/");
    let detection = source.slice(start, end);
    const selfStart = detection.indexOf("/* ── 10 · Self-test suite");
    if (selfStart >= 0) detection = detection.slice(0, selfStart);
    detection += "\nconst sleep = ms => new Promise(r => setTimeout(r, ms));\nglobalThis.__oldEngine = { detectLocal };";

    const context: any = { console, Set, URL, AbortController, globalThis: {} };
    vm.runInNewContext(detection, context);
    const oldDetect: (text: string) => any = context.__oldEngine?.detectLocal
      || context.globalThis.__oldEngine?.detectLocal;

    /* Case list comes from the suite itself, not from golden.json: that file is
       rewritten by another test file and may be stale when this one runs. */
    const cases = new Map<string, string>();
    for (const c of CASES) cases.set(c.id, c.text);
    for (const item of JSON.parse(readFileSync("backend/golden.json", "utf8"))) {
      if (!cases.has(item.id)) cases.set(item.id, item.text);
    }
    const differences: string[] = [];
    for (const [id, text] of cases) {
      const oldResult = oldDetect(text);
      const newResult = detectLocal(text);
      if (oldResult.verdict !== newResult.verdict || oldResult.score !== newResult.score) {
        differences.push(id);
      }
    }
    expect(differences.sort()).toEqual([...KNOWN_DIFFERENCES].sort());
  });
});
