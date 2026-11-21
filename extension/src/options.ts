import { api } from "./api";
import { t, type Lang } from "./i18n";
import {
  getSettings,
  normalizeApiBase,
  normalizeDomain,
  saveSettings,
  type Settings
} from "./settings";
import { applyStaticText, clear, el, mountMark } from "./ui";

let settings: Settings;
const $ = (id: string) => document.getElementById(id) as HTMLElement;

function say(message: string): void {
  $("toast").textContent = message;
}

function paint(): void {
  applyStaticText(document, settings.lang);
  ($("enabled") as HTMLInputElement).checked = settings.enabled;
  document.querySelectorAll<HTMLButtonElement>("#segLang button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.lang === settings.lang));
  });
  ($("apiBase") as HTMLInputElement).value = settings.apiBase;
  renderAllowlist();
}

function renderAllowlist(): void {
  const list = $("allowList");
  clear(list);
  settings.allowlist.forEach((domain) => {
    const item = el("li");
    item.appendChild(el("span", "", domain));
    const remove = el("button", "btn btn-text", t(settings.lang, "ext_remove"));
    remove.type = "button";
    remove.setAttribute("data-remove", domain);
    remove.setAttribute("aria-label", `${t(settings.lang, "ext_remove")}: ${domain}`);
    item.appendChild(remove);
    list.appendChild(item);
  });
  ($("allowEmpty") as HTMLElement).hidden = settings.allowlist.length > 0;
}

function showError(id: string, message: string): void {
  const node = $(id);
  node.textContent = message;
  node.hidden = !message;
}

/** Ask for the optional host permission for this exact origin only. */
async function requestOrigin(apiBase: string): Promise<boolean> {
  const c = api();
  if (!c?.permissions?.request) return false;
  const origin = new URL(apiBase).origin + "/*";
  return !!(await c.permissions.request({ origins: [origin] }));
}

async function releaseOrigin(apiBase: string): Promise<void> {
  const c = api();
  if (!apiBase || !c?.permissions?.remove) return;
  try {
    await c.permissions.remove({ origins: [new URL(apiBase).origin + "/*"] });
  } catch {
    /* permission never granted — nothing to release */
  }
}

async function init(): Promise<void> {
  settings = await getSettings();
  mountMark($("mark"));
  paint();

  ($("enabled") as HTMLInputElement).addEventListener("change", async (event) => {
    settings = await saveSettings({ enabled: (event.target as HTMLInputElement).checked });
    say(t(settings.lang, "ext_saved"));
  });

  document.querySelectorAll<HTMLButtonElement>("#segLang button").forEach((button) => {
    button.addEventListener("click", async () => {
      settings = await saveSettings({ lang: button.dataset.lang as Lang });
      paint();
      say(t(settings.lang, "ext_saved"));
    });
  });

  $("allowForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    showError("allowErr", "");
    const input = $("allowInput") as HTMLInputElement;
    const domain = normalizeDomain(input.value);
    if (!domain) {
      showError("allowErr", t(settings.lang, "ext_allow_bad"));
      return;
    }
    if (settings.allowlist.indexOf(domain) === -1) {
      settings = await saveSettings({ allowlist: [...settings.allowlist, domain] });
    }
    input.value = "";
    renderAllowlist();
    say(t(settings.lang, "ext_saved"));
  });

  $("allowList").addEventListener("click", async (event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>("[data-remove]");
    if (!button) return;
    const domain = button.dataset.remove as string;
    settings = await saveSettings({ allowlist: settings.allowlist.filter((d) => d !== domain) });
    renderAllowlist();
    say(t(settings.lang, "ext_saved"));
  });

  $("btnApiSave").addEventListener("click", async () => {
    showError("apiErr", "");
    const raw = ($("apiBase") as HTMLInputElement).value;
    if (!raw.trim()) {
      await releaseOrigin(settings.apiBase);
      settings = await saveSettings({ apiBase: "" });
      say(t(settings.lang, "ext_saved"));
      return;
    }
    const apiBase = normalizeApiBase(raw);
    if (!apiBase) {
      showError("apiErr", t(settings.lang, "ext_api_bad"));
      return;
    }
    if (apiBase !== settings.apiBase) {
      const granted = await requestOrigin(apiBase);
      if (!granted) {
        showError("apiErr", t(settings.lang, "ext_api_denied"));
        return;
      }
      await releaseOrigin(settings.apiBase);
    }
    settings = await saveSettings({ apiBase });
    say(t(settings.lang, "ext_saved"));
  });

  $("btnApiClear").addEventListener("click", async () => {
    showError("apiErr", "");
    await releaseOrigin(settings.apiBase);
    settings = await saveSettings({ apiBase: "" });
    ($("apiBase") as HTMLInputElement).value = "";
    say(t(settings.lang, "ext_saved"));
  });
}

void init();
