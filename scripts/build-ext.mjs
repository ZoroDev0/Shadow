#!/usr/bin/env node
/**
 * Builds the ScamShield MV3 extension into extension/dist.
 *
 * Detection code is NOT duplicated: every bundle imports the shared engine
 * from src/detection/*.ts, so the web app and the extension always agree.
 *
 * Output is deterministic (no timestamps, no hashed file names) so two runs
 * of the same source produce the same bytes.
 */
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const src = join(root, "extension", "src");
const out = join(root, "extension", "dist");

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

/* ── Bundle the four pages/worker from the shared source ─────────────── */
await build({
  absWorkingDir: root,
  entryPoints: {
    background: join(src, "background.ts"),
    popup: join(src, "popup.ts"),
    options: join(src, "options.ts"),
    blocked: join(src, "blocked.ts"),
  },
  outdir: out,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["chrome110"],
  minify: true,
  sourcemap: false,
  legalComments: "none",
  logLevel: "info",
  // import.meta.env is not defined in a native extension module; make sure the
  // bundler leaves it alone instead of inlining a define.
  supported: { "import-meta": true },
});

/* ── Static files ────────────────────────────────────────────────────── */
cpSync(join(root, "extension", "manifest.json"), join(out, "manifest.json"));
const statics = ["popup.html", "options.html", "blocked.html"];
for (const file of statics) cpSync(join(src, file), join(out, file));
cpSync(join(src, "ext.css"), join(out, "ext.css"));
cpSync(join(src, "icons"), join(out, "icons"), { recursive: true });

/* ── Sanity checks: no remote code, no inline scripts, no eval ───────── */
const htmlFiles = statics.filter((f) => f.endsWith(".html"));
for (const file of htmlFiles) {
  const html = readFileSync(join(out, file), "utf8");
  if (/<script(?![^>]*\bsrc=)/i.test(html)) throw new Error(`${file}: inline <script> is not allowed by the CSP`);
  if (/\son[a-z]+\s*=/i.test(html)) throw new Error(`${file}: inline event handler found`);
}
for (const file of ["background.js", "popup.js", "options.js", "blocked.js"]) {
  const js = readFileSync(join(out, file), "utf8");
  if (/\beval\s*\(/.test(js)) throw new Error(`${file}: eval() found`);
  if (/new\s+Function\s*\(/.test(js)) throw new Error(`${file}: new Function() found`);
}

/* ── Shareable zip (git-ignored) ─────────────────────────────────────── */
const zipPath = join(root, "extension", "scamshield-extension.zip");
rmSync(zipPath, { force: true });
try {
  execFileSync("zip", ["-qr", zipPath, "."], { cwd: out, stdio: "ignore" });
  console.log(`zip: extension/scamshield-extension.zip`);
} catch {
  console.log("zip: skipped (the `zip` command is not available on this machine)");
}

const manifest = JSON.parse(readFileSync(join(out, "manifest.json"), "utf8"));
writeFileSync(join(out, "BUILD_INFO.txt"), `ScamShield ${manifest.version} — Manifest V3 unpacked build\n`);

console.log(`built extension/dist (MV3 ${manifest.version})`);
if (!existsSync(join(out, "icons", "icon-128.png"))) throw new Error("icons missing from dist");
