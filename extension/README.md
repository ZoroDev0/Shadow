# Shadow browser extension (Manifest V3)

Checks a message or a link for scam signs **on your device**, using the same
detection engine as the Shadow web app (`src/detection`). The engine is
imported, never copied: `npm run build:ext` bundles it into the extension.

Unpacked build only. It is **not** published to the Chrome Web Store, Edge
Add-ons, the Firefox add-on site or the Apple App Store.

## Build

```bash
npm ci
npm run build:ext          # → extension/dist  (+ extension/shadow-extension.zip)
```

`extension/dist` and the zip are git-ignored. The build is deterministic: the
same sources produce the same bytes, and no timestamp is written. The only
build dependency is `esbuild`, pinned to an exact version in `package.json`.

## Load unpacked / install

The same `extension/dist` folder loads in Chrome, Firefox and Safari.

### Chrome (and Edge, Brave)

1. Open `chrome://extensions` (`edge://extensions` or `brave://extensions`).
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select `extension/dist`.
4. The Shadow shield appears in the toolbar. Right-click text or a link →
   "Check with Shadow". Open the popup from the toolbar icon; the options
   page is at *Details → Extension options*.

Chrome marks unpacked extensions as "developer mode" and does not auto-update
them; reload `extension/dist` after rebuilding.

### Firefox

Firefox 109+ supports Manifest V3. The manifest declares a fixed Gecko ID
(`shadow@shadow.app`) so Firefox recognizes it as the same extension
across loads.

1. Open `about:debugging#/addons/this-firefox`.
2. Click **Load Temporary Add-on…** and select `extension/dist/manifest.json`.
3. The extension loads for this session. Right-click text or a link →
   "Check with Shadow". Options page: *Add-ons → Shadow → Options* or
   the popup footer.

Temporary add-ons are dropped when Firefox restarts. Reload the add-on from
`extension/dist` after rebuilding. To keep it across restarts, package the
`extension/dist` folder into a `.xpi` and sign it via addons.mozilla.org
(AMO), or load it as a permanent unsigned add-on in Firefox Nightly/Developer
Edition with the appropriate dev setting enabled.

### Safari

Safari supports WebExtensions, but Apple requires extensions to be signed with
an Apple Developer Program certificate to install in the release version of
Safari.

**Unsigned local install (Safari Technology Preview or Developer setting):**
1. In Safari, open **Safari → Settings → Advanced** and enable "Show features
   for web developers" (or use Safari Technology Preview).
2. Open **Develop → Allow Unsigned Extensions** and check it.
3. Open `safari://extensions` (or the Extensions pane in Settings → Extensions
   in newer builds) and load `extension/dist/manifest.json`.
4. Grant the extension access and pin it to the toolbar.

**Signed install (release Safari):** submit the `extension/dist` bundle to
Apple for signing/distribution through the Apple Developer Program. The same
MV3 source builds for Safari; no separate manifest is required.

> Safari support note: `webNavigation` (main-frame navigation guard) and the
> service worker are used where Safari's WebExtensions implementation allows
> them. Pop-up windows and context menus work. If a Safari build does not
> intercept a navigation, the popup and right-click menu still check links and
> text on demand.

## Permissions, and why

| Permission | Why it is needed |
| --- | --- |
| `contextMenus` | Adds the “Check with Shadow” right-click entries for selected text and links. |
| `storage` | Saves your language, on/off switch, allowlist and optional server address (`storage.local`), plus the session-only “Proceed anyway” list and last result (`storage.session`). |
| `webNavigation` | Reads the address of a main-frame navigation so a lookalike domain can be stopped **before** the page loads. |
| `optional_host_permissions` (`http://*/*`, `https://*/*`) | Requested at runtime, for your server's exact origin only, and only if you type an API base URL. |

There is **no** `<all_urls>` host permission, no `tabs`, no `scripting`, no
`activeTab`, no content script, and no `webRequest`. The extension never reads
page content, never injects into pages, and makes no network request while the
API base URL is empty.

The extension pages declare a strict CSP:

```
script-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
```

No inline scripts, no remote code, no `eval`, no analytics.

## Data flow (on-device by default)

```
paste / right-click / navigation
        │
        ▼
popup.ts · background.ts · blocked.ts
        │  src/detection/engine.ts  (detectLocal / analyzeUrl / analyzeLink)
        ▼
verdict + score + reasons + links + advice
        │
        ├── popup / result window  → rendered locally
        ├── blocked.html           → tab redirected before the page loads
        └── toolbar badge          → “!” scam · “?” be careful · none safe
```

1. **Pasted or typed text** — the popup calls `checkText()`. With no server
   configured this is `detectLocal()` from `src/detection/engine.ts`; nothing
   leaves the device.
2. **Right-click on text or a link** — the service worker runs the same engine,
   stores the result in `chrome.storage.session`, sets the badge and opens the
   result in a small extension window.
3. **Main-frame navigation** — `webNavigation.onBeforeNavigate` → URL policy
   (`extension/src/policy.ts`). Browser-internal pages, local/private addresses,
   official domains from `rules.json`, user-allowlisted domains and the
   session allowlist are ignored first. A **SCAM** link redirects the tab to
   `blocked.html`; **BE CAREFUL** only sets the badge and never blocks.
4. **Optional server** — only if you save an API base URL. The popup then POSTs
   `{"text": "..."}` to `${API_BASE}/analyze` with an 8-second timeout, and any
   failure, non-200 answer or unexpected response shape falls back to the local
   engine. Navigation checks are always local, because they run before the page
   loads.

Allowlist and settings live in `chrome.storage.local`. “Proceed anyway” lives in
`chrome.storage.session`, so it is forgotten when the browser closes.

## Tests

```bash
npm test                                   # 57 tests, includes extension/tests/*.test.ts
npm run build:ext                          # then the dist/ manifest checks run too
npx tsx scripts/fuzz-ext-policy.ts         # URL-policy fuzz: 273 URLs
cd backend && python -m pytest -q          # 12 tests, 101-entry engine parity
```

The extension suite (38 of the 57 tests) covers the navigation guard (SCAM
redirected, BE CAREFUL not redirected), allowlisted/official/internal/local
URLs, the global switch, the session “Proceed anyway”, context-menu results, API
failure → local fallback, the manifest, and a false-positive guard over 140
popular legitimate sites. The fuzz run reuses that same 140-site list among 273
malformed, unicode, punycode, userinfo, IPv6, port and scheme URLs, and fails
if the policy throws, blocks a private/internal address, blocks a guarded site,
or stops blocking lookalikes.

Fixed in Phase 12: `hdfc.bank.in`, `ajio.com` and `sbilife.co.in` were once
flagged as lookalikes. The embedded-domain check now needs a label boundary and
the banks' own `.bank.in` and subsidiary domains are in `realDomains`, so those
three load normally while `hdfc.bank.in.evil.com`, `ajio.com.evil.xyz` and
`sbilife-kyc.top` still block. Seven dead or unverifiable domains are listed as
known limitations in `docs/AUDIT_REPORT.md` §I8.

## Limits — read this before trusting it

- It checks **URLs and text you select or paste**. It does **not** read page
  content, form fields, chat apps or SMS.
- The navigation warning only covers top-level (main-frame) navigations. Links
  opened inside an app, a webview or a same-page route change are not
  intercepted.
- Lookalike detection is rule-based. A novel scam domain that imitates no known
  brand, or a scam hosted on a legitimate service, will not be blocked.
- Official domains are treated as safe from `src/detection/rules.json`. That
  list is finite and manually maintained.
- Unpacked builds are unsigned. Chrome shows a developer-mode warning; Firefox
  treats it as a temporary add-on until signed; Safari requires an Apple
  Developer signature for the release browser (unsigned works via "Allow
  Unsigned Extensions" in Safari Technology Preview / developer builds). The
  extension does not auto-update.

## Files

```
extension/
├── manifest.json          # source manifest (copied to dist unchanged)
├── src/
│   ├── background.ts      # service worker: menus, navigation guard, badge
│   ├── popup.ts/.html     # paste-and-check, plus context-menu result view
│   ├── options.ts/.html   # language, on/off, allowlist, optional server
│   ├── blocked.ts/.html   # warning interstitial
│   ├── policy.ts          # pure URL policy (block / badge / ignore)
│   ├── detect.ts          # engine entry + optional API with local fallback
│   ├── settings.ts        # chrome.storage schema and normalisers
│   ├── i18n.ts            # shared web-app strings + extension-only labels
│   ├── ui.ts              # shared rendering (verdict, reasons, diff, advice)
│   ├── ext.css            # shared monochrome styles
│   └── icons/             # 16/32/48/128, from public/icons
├── tests/                 # vitest with a mocked chrome API
└── dist/                  # build output (git-ignored)
```
