/* Small DOM helpers shared by the popup, options and interstitial pages.
   All user-supplied text goes in through textContent — never innerHTML. */

import type { CheckedResult } from "./detect";
import { fmt, severityOf, t, verdictLabel, verdictSentence, type Lang } from "./i18n";

export const SHIELD_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M12 2.8 4.4 5.9v5.6c0 4.6 3.2 8.2 7.6 9.7 4.4-1.5 7.6-5.1 7.6-9.7V5.9L12 2.8Z"/>' +
  '<path d="m8.6 11.9 2.3 2.3 4.5-4.7"/></svg>';

export const ALERT_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M12 3.2 21 20H3L12 3.2Z"/><path d="M12 9.4v5"/><path d="M12 17.6h.01"/></svg>';

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function mountMark(node: Element | null): void {
  if (node) node.innerHTML = SHIELD_SVG;
}

/** Fill every [data-i18n] / [data-i18n-aria] / [data-i18n-placeholder] node. */
export function applyStaticText(root: ParentNode, lang: Lang): void {
  document.documentElement.lang = lang;
  root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((node) => {
    node.textContent = t(lang, node.dataset.i18n as string);
  });
  root.querySelectorAll<HTMLElement>("[data-i18n-aria]").forEach((node) => {
    node.setAttribute("aria-label", t(lang, node.dataset.i18nAria as string));
  });
  root.querySelectorAll<HTMLElement>("[data-i18n-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", t(lang, node.dataset.i18nPlaceholder as string));
  });
}

export function clear(node: Element): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function verdictBanner(result: CheckedResult, lang: Lang): HTMLElement {
  const wrap = el("div", "verdict v-" + result.verdict);
  const icon = el("span", "v-ic");
  icon.innerHTML = result.verdict === "safe" ? SHIELD_SVG : ALERT_SVG;
  const body = el("div", "v-body");
  body.appendChild(el("div", "v-label", verdictLabel(lang, result.verdict)));
  body.appendChild(el("div", "v-sub", verdictSentence(lang, result.verdict)));
  const sev = el("div", "sev");
  sev.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 3; i++) sev.appendChild(el("i"));
  sev.setAttribute("role", "img");
  sev.setAttribute("aria-label", fmt(lang, "ext_score_n", { n: severityOf(result.verdict) }));
  body.appendChild(sev);
  wrap.append(icon, body);
  return wrap;
}

function scoreBlock(result: CheckedResult, lang: Lang): HTMLElement {
  const box = el("div", "score");
  const top = el("div", "score-top");
  top.appendChild(el("span", "", t(lang, "ext_score")));
  top.appendChild(el("span", "", String(result.score)));
  const meter = el("div", "meter");
  meter.setAttribute("role", "progressbar");
  meter.setAttribute("aria-label", t(lang, "ext_score"));
  meter.setAttribute("aria-valuemin", "0");
  meter.setAttribute("aria-valuemax", "100");
  meter.setAttribute("aria-valuenow", String(result.score));
  const fill = el("i");
  fill.style.width = Math.max(2, Math.min(100, result.score)) + "%";
  meter.appendChild(fill);
  box.append(top, meter);
  return box;
}

function reasonsList(result: CheckedResult, lang: Lang): HTMLElement {
  const section = el("section", "sec");
  section.appendChild(el("h3", "", lang === "hi" ? t(lang, "ext_why") : t(lang, "why_title")));
  const list = el("ul", "reasons");
  const label = result.verdict === "safe" ? "✓" : "!";
  result.reasons.slice(0, 5).forEach((reason: any) => {
    const li = el("li");
    const bullet = el("span", "bullet", label);
    bullet.setAttribute("aria-hidden", "true");
    li.append(bullet, el("span", "", lang === "hi" ? reason.text_hi || reason.text_en : reason.text_en));
    list.appendChild(li);
  });
  section.appendChild(list);
  return section;
}

function linkCards(result: CheckedResult, lang: Lang): HTMLElement | null {
  if (!result.links || !result.links.length) return null;
  const section = el("section", "sec");
  section.appendChild(el("h3", "", t(lang, "links_title")));
  const list = el("div", "links");
  result.links.slice(0, 3).forEach((link: any) => {
    const card = el("article", "link-card");
    card.appendChild(el("div", "link-verdict", verdictLabel(lang, link.verdict)));
    card.appendChild(el("div", "link-host", String(link.url || "").slice(0, 120)));
    if (link.lookalike_of) {
      const diff = el("dl", "diff");
      const fake = el("div", "diff-row fake");
      fake.appendChild(el("dt", "", t(lang, "vs_msg")));
      fake.appendChild(el("dd", "", String(link.url || "").replace(/^[a-z]+:\/\//i, "").split("/")[0]));
      const real = el("div", "diff-row");
      real.appendChild(el("dt", "", t(lang, "vs_real")));
      real.appendChild(el("dd", "", link.lookalike_of));
      diff.append(fake, real);
      card.appendChild(diff);
    } else if (link.reason) {
      card.appendChild(
        el("p", "muted", lang === "hi" ? link.reason.hi || link.reason.en : link.reason.en || link.reason.hi)
      );
    }
    list.appendChild(card);
  });
  section.appendChild(list);
  return section;
}

function adviceList(result: CheckedResult, lang: Lang): HTMLElement {
  const section = el("section", "sec");
  section.appendChild(el("h3", "", t(lang, "advice_title")));
  const list = el("ol", "advice");
  result.advice.slice(0, 4).forEach((item: any) => {
    list.appendChild(el("li", "", lang === "hi" ? item.text_hi || item.text_en : item.text_en));
  });
  section.appendChild(list);

  const help = el("div", "help");
  help.appendChild(el("span", "", "1930"));
  help.appendChild(el("span", "muted", t(lang, "helpline_t")));
  const link = el("a", "btn btn-outline", "cybercrime.gov.in");
  link.setAttribute("href", "https://cybercrime.gov.in");
  link.setAttribute("target", "_blank");
  link.setAttribute("rel", "noopener noreferrer");
  help.appendChild(link);
  section.appendChild(help);
  return section;
}

/** Render a complete result into `root`. */
export function renderResult(root: Element, result: CheckedResult, lang: Lang): void {
  clear(root);
  root.appendChild(verdictBanner(result, lang));
  root.appendChild(scoreBlock(result, lang));
  root.appendChild(reasonsList(result, lang));
  const links = linkCards(result, lang);
  if (links) root.appendChild(links);
  root.appendChild(adviceList(result, lang));
  const status = el("p", "status");
  status.appendChild(el("span", "dot"));
  status.lastElementChild?.setAttribute("aria-hidden", "true");
  status.appendChild(
    el("span", "", result.source === "api" ? t(lang, "ext_viaserver") : t(lang, "ext_ondevice"))
  );
  root.appendChild(status);
}
