import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..");
const raw = readFileSync(join(root, "manifest.json"), "utf8");
const manifest = JSON.parse(raw);

describe("manifest.json", () => {
  it("is a valid Manifest V3 extension with a module service worker", () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe("ScamShield");
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(manifest.background.service_worker).toBe("background.js");
    expect(manifest.background.type).toBe("module");
    expect(manifest.action.default_popup).toBe("popup.html");
    expect(manifest.options_page).toBe("options.html");
  });

  it("requests only the three documented permissions", () => {
    expect([...manifest.permissions].sort()).toEqual(["contextMenus", "storage", "webNavigation"]);
    expect(manifest.permissions).not.toContain("tabs");
    expect(manifest.permissions).not.toContain("<all_urls>");
    expect(manifest.permissions).not.toContain("scripting");
    expect(manifest.permissions).not.toContain("activeTab");
  });

  it("has no broad host permissions and only optional runtime host access", () => {
    expect(manifest.host_permissions).toBeUndefined();
    expect(manifest.content_scripts).toBeUndefined();
    expect(raw).not.toContain("<all_urls>");
    expect(manifest.optional_host_permissions).toEqual(["https://*/*", "http://*/*"]);
  });

  it("declares a strict extension CSP without remote or eval sources", () => {
    const csp = manifest.content_security_policy.extension_pages;
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toMatch(/https?:\/\//);
  });

  it("points at files that exist in the source tree", () => {
    for (const page of [manifest.action.default_popup, manifest.options_page]) {
      expect(existsSync(join(root, "src", page)), page).toBe(true);
    }
    for (const icon of Object.values(manifest.icons)) {
      expect(existsSync(join(root, "src", icon as string)), icon as string).toBe(true);
    }
    expect(existsSync(join(root, "src", "blocked.html"))).toBe(true);
  });
});

const dist = join(root, "dist");
describe.skipIf(!existsSync(dist))("built extension/dist", () => {
  it("ships no inline scripts and no remote code", () => {
    for (const page of ["popup.html", "options.html", "blocked.html"]) {
      const html = readFileSync(join(dist, page), "utf8");
      expect(html).not.toMatch(/<script(?![^>]*\bsrc=)/i);
      expect(html).not.toMatch(/\son[a-z]+\s*=/i);
      expect(html).not.toMatch(/https?:\/\/[^"']*\.js/i);
    }
    for (const script of ["background.js", "popup.js", "options.js", "blocked.js"]) {
      const js = readFileSync(join(dist, script), "utf8");
      expect(js).not.toMatch(/\beval\s*\(/);
      expect(js).not.toMatch(/new\s+Function\s*\(/);
    }
  });

  it("copies the manifest unchanged", () => {
    expect(JSON.parse(readFileSync(join(dist, "manifest.json"), "utf8"))).toEqual(manifest);
  });
});
