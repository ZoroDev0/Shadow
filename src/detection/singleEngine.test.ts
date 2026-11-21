import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/* Guards the "one engine" rule: the UI module must delegate to the shared
   detection package and must not grow its own detection implementation. */
describe("single detection engine", () => {
  const legacy = readFileSync(join(process.cwd(), "src/legacy.ts"), "utf8");

  it("legacy UI delegates to src/detection/analyze.ts", () => {
    expect(legacy).toMatch(/import\s*{\s*analyze as analyzeShared\s*}\s*from\s*['"]\.\/detection\/analyze['"]/);
    expect(legacy).toMatch(/return analyzeShared\(input\)/);
  });

  it("legacy UI contains no local detection implementation", () => {
    expect(legacy).not.toMatch(/function\s+detectLocal\s*\(/);
    expect(legacy).not.toMatch(/function\s+analyzeLink\s*\(/);
    expect(legacy).not.toMatch(/DETECTION-START/);
  });
});
