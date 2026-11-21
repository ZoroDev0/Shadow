/* Golden parity for the Android copy of the engine.

   The Android app does not run a WebView: it evaluates the esbuild bundle of
   src/detection with QuickJS. QuickJS has no ICU, so `String.prototype.normalize`
   is absent there. This test reproduces that exact environment on the host:
   normalization is removed inside QuickJS, the text is pre-normalized with the
   host's exact NFKC (what Android's java.text.Normalizer does), and every one of
   the 102 golden entries must return the same verdict and score as the web app. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildSync } from "esbuild";
import { getQuickJS } from "quickjs-emscripten";
import { engineBuildOptions } from "../../scripts/android-engine.mjs";

type Golden = { id: string; text: string; expect: string; result: { verdict: string; score: number } };

const golden = JSON.parse(readFileSync("backend/golden.json", "utf8")) as Golden[];

describe("Android engine bundle under QuickJS", () => {
  it("matches golden verdict and score on every entry without ICU normalization", async () => {
    const js = buildSync(engineBuildOptions()).outputFiles[0].text;
    const QJS = await getQuickJS();
    const rt = QJS.newRuntime();
    rt.setMemoryLimit(128 * 1024 * 1024);
    const ctx = rt.newContext();

    try {
      ctx.unwrapResult(ctx.evalCode("String.prototype.normalize = undefined;"));
      ctx.unwrapResult(ctx.evalCode(js));
      expect(ctx.unwrapResult(ctx.evalCode("typeof ShadowEngine.detectLocal")).value).toBeTruthy();

      const failures: string[] = [];
      for (const entry of golden) {
        const input = ctx.newString(entry.text.normalize("NFKC"));
        ctx.setProp(ctx.global, "SHADOW_INPUT", input);
        input.dispose();
        const out = ctx.unwrapResult(
          ctx.evalCode("JSON.stringify(ShadowEngine.detectLocal(SHADOW_INPUT))")
        );
        const text = ctx.getString(out);
        out.dispose();
        const got = JSON.parse(text);
        if (got.verdict !== entry.result.verdict || got.score !== entry.result.score) {
          failures.push(`${entry.id}: expected ${entry.result.verdict}/${entry.result.score}, got ${got.verdict}/${got.score}`);
        }
      }
      expect(failures).toEqual([]);
      expect(golden.length).toBe(102);
    } finally {
      ctx.dispose();
      rt.dispose();
    }
  }, 60_000);
});
