import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { detectLocal } from "./engine";

/* The legacy standalone engine still embedded in index_9.html is a frozen
   reference artifact. The shipped UI does NOT run it (index.html loads
   src/main.tsx -> initLegacy() -> src/detection/analyze.ts -> engine.ts).

   This test fails whenever the two implementations disagree on any case
   except the documented, intentional audit-gap fixes below. */
const KNOWN_DIFFERENCES = [
  "U01", "U02", "U03", "U04", "U05", "U06", "U07",
  "R01", "R02", "R03", "R04", "R05", "R06", "R07", "R08", "R09", "R10", "R11",
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

    const golden = JSON.parse(readFileSync("backend/golden.json", "utf8"));
    const differences: string[] = [];
    for (const item of golden) {
      const oldResult = oldDetect(item.text);
      const newResult = detectLocal(item.text);
      if (oldResult.verdict !== newResult.verdict || oldResult.score !== newResult.score) {
        differences.push(item.id);
      }
    }
    expect(differences.sort()).toEqual([...KNOWN_DIFFERENCES].sort());
  });
});
