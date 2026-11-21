import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeText } from "./engine";

/* Dedicated normalisation contract test. The same fixture file is asserted
   by backend/test_parity.py, so TS and Python must normalise identically. */
describe("normalisation parity contract", () => {
  const fixtures = JSON.parse(
    readFileSync(join(process.cwd(), "src/detection/normalizeFixtures.json"), "utf8"),
  ) as { name: string; input: string; expected: string }[];

  for (const fixture of fixtures) {
    it(`normalises ${fixture.name}`, () => {
      expect(normalizeText(fixture.input)).toBe(fixture.expected);
    });
  }
});
