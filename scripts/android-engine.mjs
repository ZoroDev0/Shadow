/* Shared esbuild configuration for the Android copy of the detection engine.
   The same options are used by scripts/build-android-engine.mjs (writes the
   asset) and by src/native/androidEngineGolden.test.ts (builds in memory), so
   the artefact and the tested bundle cannot drift. */

export const ENGINE_ENTRY = "scripts/android-engine-entry.ts";
export const ENGINE_ASSET = "android/app/src/main/assets/engine/engine.js";

/* The Android runtime is QuickJS, which has no ICU. The Kotlin bridge already
   normalises text with java.text.Normalizer (exact NFKC, ICU-backed) before it
   calls in, and NFKC is idempotent, so a missing `normalize` only needs to be
   identity. An engine that has it keeps its native implementation. */
export const NORMALIZE_SHIM = `(function () {
  var ok = typeof String.prototype.normalize === "function";
  if (ok) { try { ok = "\\uFB01".normalize("NFKC") === "fi"; } catch (e) { ok = false; } }
  if (!ok) { String.prototype.normalize = function () { return String(this); }; }
})();`;

export function engineBuildOptions() {
  return {
    entryPoints: [ENGINE_ENTRY],
    bundle: true,
    write: false,
    format: "iife",
    globalName: "ShadowEngine",
    platform: "neutral",
    target: "es2020",
    banner: { js: NORMALIZE_SHIM },
    legalComments: "none",
    logLevel: "silent",
  };
}
