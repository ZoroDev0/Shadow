import { api } from "./api";
import { checkText } from "./detect";
import { t, type Lang } from "./i18n";
import { getLastResult, getSettings, saveSettings, type Settings } from "./settings";
import { applyStaticText, clear, el, mountMark, renderResult } from "./ui";

let settings: Settings;
let lastRendered: any = null;

const $ = (id: string) => document.getElementById(id) as HTMLElement;

function paint(): void {
  applyStaticText(document, settings.lang);
  document.querySelectorAll<HTMLButtonElement>("#segLang button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.lang === settings.lang));
  });
  if (lastRendered) renderResult($("result"), lastRendered, settings.lang);
}

function showError(message: string): void {
  const err = $("err");
  err.textContent = message;
  err.hidden = !message;
}

async function submit(text: string): Promise<void> {
  showError("");
  if (!text.trim()) {
    showError(t(settings.lang, "err_empty"));
    return;
  }
  const button = $("btnCheck") as HTMLButtonElement;
  button.disabled = true;
  try {
    lastRendered = await checkText(text, { apiBase: settings.apiBase });
    renderResult($("result"), lastRendered, settings.lang);
  } catch {
    showError(t(settings.lang, "err_generic"));
  } finally {
    button.disabled = false;
  }
}

async function showLastResult(): Promise<void> {
  const stored = await getLastResult();
  clear($("result"));
  if (!stored) {
    $("result").appendChild(el("p", "muted", t(settings.lang, "ext_no_result")));
    return;
  }
  lastRendered = stored;
  const host = String(stored.url || "").replace(/^[a-z]+:\/\//i, "").split("/")[0];
  if (host) $("result").appendChild(el("p", "muted", host));
  renderResult($("result"), stored, settings.lang);
}

async function init(): Promise<void> {
  settings = await getSettings();
  mountMark($("mark"));
  paint();

  document.querySelectorAll<HTMLButtonElement>("#segLang button").forEach((button) => {
    button.addEventListener("click", async () => {
      const lang = button.dataset.lang as Lang;
      if (lang === settings.lang) return;
      settings = await saveSettings({ lang });
      paint();
    });
  });

  $("form").addEventListener("submit", (event) => {
    event.preventDefault();
    void submit(($("text") as HTMLTextAreaElement).value);
  });

  $("btnOptions").addEventListener("click", () => {
    const c = api();
    if (c?.runtime?.openOptionsPage) c.runtime.openOptionsPage();
    else window.open("options.html", "_blank");
  });

  if (new URLSearchParams(location.search).get("view") === "result") await showLastResult();
}

void init();
