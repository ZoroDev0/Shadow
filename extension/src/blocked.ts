import { api } from "./api";
import { checkUrl } from "./detect";
import { getSettings } from "./settings";
import { applyStaticText, mountMark, renderResult } from "./ui";

const $ = (id: string) => document.getElementById(id) as HTMLElement;

async function init(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const url = params.get("url") || "";
  const settings = await getSettings();

  mountMark($("mark"));
  applyStaticText(document, settings.lang);

  const result = checkUrl(url);
  const host = String(url).replace(/^[a-z]+:\/\//i, "").split("/")[0] || url;
  $("host").textContent = host;
  renderResult($("result"), result, settings.lang);
  document.title = `${host} — ScamShield`;

  $("btnBack").addEventListener("click", () => {
    if (history.length > 1) history.back();
    else location.replace("about:blank");
  });

  $("btnProceed").addEventListener("click", async () => {
    const c = api();
    try {
      if (c?.runtime?.sendMessage) {
        await c.runtime.sendMessage({ type: "allow-session", host });
      }
    } catch {
      /* the worker may be waking up; navigating still works */
    }
    if (/^https?:\/\//i.test(url)) location.replace(url);
    else if (history.length > 1) history.back();
  });
}

void init();
