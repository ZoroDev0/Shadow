# ScamShield browser extension (Manifest V3)

Checks a message or a link for scam signs **on your device**, using the same
detection engine as the Shadow web app (`src/detection`). The engine is
imported, never copied: `npm run build:ext` bundles it into the extension.

Unpacked build only. It is **not** published to the Chrome Web Store, Edge
Add-ons or the Firefox add-on site.

## Build

```bash
npm ci
npm run build:ext          # → extension/dist  (+ extension/scamshield-extension.zip)
```

`extension/dist` and the zip are git-ignored. The build is deterministic: the
same sources produce the same bytes, and no timestamp is written. The only
build dependency is `esbuild`, pinned to an exact version in `package.json`.

## Load unpacked

**Chrome** — `chrome://extensions` → enable *Developer mode* → *Load unpacked* →
select `extension/dist`.

**Edge** — `edge://extensions` → *Developer mode* → *Load unpacked* → `extension/dist`.

**Brave** — `brave://extensions` → *Developer mode* → *Load unpacked* → `extension/dist`.

Then open the toolbar popup (the shield icon). A right-click on selected text or
on a link offers “Check with ScamShield”. The options page is reachable from the
popup footer or the extensions page (*Details → Extension options*).

## Permissions, and why

| Permission | Why it is needed |
| --- | --- |
| `contextMenus` | Adds the “Check with ScamShield” right-click entries for selected text and links. |
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
npm test                                   # 53 tests, includes extension/tests/*.test.ts
npm run build:ext                          # then the dist/ manifest checks run too
npx tsx scripts/fuzz-ext-policy.ts         # URL-policy fuzz: 273 URLs
cd backend && python -m pytest -q          # 12 tests, 101-entry engine parity
```

The extension suite (38 of the 53 tests) covers the navigation guard (SCAM
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
- Unpacked builds are unsigned. Chrome may show a developer-mode warning, and
  the extension does not auto-update.
- **Firefox and Safari are not supported.** The code targets the Chrome MV3
  service-worker model; there is no `manifest.firefox.json` because that port
  has not been written or tested.

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
