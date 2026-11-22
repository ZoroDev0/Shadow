/* Extension strings. Shared product wording comes from src/i18n (the web app's
   own EN/HI dictionary); only the extension-only labels are added here. */

import { en as sharedEn, hi as sharedHi } from "../../src/i18n";

const extEn = {
  ext_name: "Shadow",
  ext_tagline: "Check a message or link for scam signs — on this device.",
  ext_label: "Paste or type the message",
  ext_placeholder: "Paste the SMS, WhatsApp message or link you are unsure about…",
  ext_checking: "Checking on this device…",
  ext_ondevice: "On-device check · nothing is uploaded",
  ext_options: "Settings",
  ext_why: "Why we think so",
  ext_score_n: "Risk level {n} of 3",
  ext_check_selection: "Check with Shadow",
  ext_check_link: "Check this link with Shadow",
  ext_result_for: "Result for the selected link",
  ext_blocked_title: "This link looks like a scam",
  ext_blocked_sub: "Shadow stopped this page before it could open.",
  ext_go_back: "Go back — keep me safe",
  ext_proceed: "Proceed anyway",
  ext_session_note: "“Proceed anyway” allows this domain for this browser session only.",
  ext_allow_title: "Always allowed sites",
  ext_allow_desc: "Sites on this list are never blocked or flagged.",
  ext_allow_placeholder: "example.com",
  ext_allow_add: "Add a site you trust",
  ext_add: "Add",
  ext_remove: "Remove",
  ext_allow_empty: "No sites added yet.",
  ext_allow_bad: "Enter a domain like example.com",
  ext_enabled: "Protection on",
  ext_enabled_d: "Warn me before a scam link opens, and check links I right-click.",
  ext_lang: "Language",
  ext_api_title: "Optional server check",
  ext_api_desc:
    "Leave this empty to keep every check on this device. If you set your own server, pasted messages are sent there and the on-device check is used if it fails.",
  ext_api_placeholder: "https://your-server.example.com",
  ext_api_save: "Save server",
  ext_api_clear: "Use this device only",
  ext_api_denied: "Permission was not granted, so nothing will be sent. Checks stay on this device.",
  ext_api_bad: "Enter a full http:// or https:// address.",
  ext_saved: "Saved",
  ext_req_failed: "Your server did not answer — checked on this device instead.",
  ext_no_result: "Nothing checked yet. Paste a message above, or right-click text or a link on any page.",
  ext_perm_note:
    "Permissions: right-click menu, local storage and page navigation only. No page content is read, and no host permission is requested unless you set a server.",
  ext_footer: "Unpacked build · v1.3.0",
  ext_badge_scam: "Scam link — blocked",
  ext_badge_susp: "Be careful with this link",
  ext_lang_aria: "Language",
  ext_close: "Close",
  ext_help: "Scam? Report it",
  ext_advice: "What to do now",
  ext_msg_links: "Links found in this message",
  ext_selected: "Selected text",
  ext_score: "Risk score",
  ext_why_short: "Reasons",
  ext_blocked_stays: "You can close this tab.",
  ext_loading: "Reading the link…",
  ext_viaserver: "Checked by your server",
  ext_onselection: "Selected text"
};

const extHi = {
  ext_name: "Shadow",
  ext_tagline: "किसी संदेश या लिंक में ठगी के संकेत जाँचें — इसी डिवाइस पर।",
  ext_label: "संदेश पेस्ट करें या लिखें",
  ext_placeholder: "जिस SMS, WhatsApp संदेश या लिंक पर भरोसा न हो, उसे यहाँ पेस्ट करें…",
  ext_checking: "इसी डिवाइस पर जाँच हो रही है…",
  ext_ondevice: "डिवाइस पर जाँच · कुछ भी अपलोड नहीं होता",
  ext_options: "सेटिंग्स",
  ext_why: "हमें ऐसा क्यों लगा",
  ext_score_n: "जोखिम स्तर 3 में से {n}",
  ext_check_selection: "Shadow से जाँचें",
  ext_check_link: "इस लिंक को Shadow से जाँचें",
  ext_result_for: "चुने गए लिंक का नतीजा",
  ext_blocked_title: "यह लिंक ठगी जैसा लगता है",
  ext_blocked_sub: "Shadow ने इस पेज को खुलने से पहले रोक दिया।",
  ext_go_back: "वापस जाएँ — मैं सुरक्षित रहूँ",
  ext_proceed: "फिर भी खोलें",
  ext_session_note: "“फिर भी खोलें” इस डोमेन को सिर्फ इसी ब्राउज़र सत्र के लिए खोल देता है।",
  ext_allow_title: "हमेशा अनुमत साइटें",
  ext_allow_desc: "इस सूची की साइटें कभी नहीं रोकी जातीं और न ही चिह्नित होती हैं।",
  ext_allow_placeholder: "example.com",
  ext_allow_add: "भरोसेमंद साइट जोड़ें",
  ext_add: "जोड़ें",
  ext_remove: "हटाएँ",
  ext_allow_empty: "अभी कोई साइट नहीं जोड़ी गई।",
  ext_allow_bad: "example.com जैसा डोमेन लिखें",
  ext_enabled: "सुरक्षा चालू",
  ext_enabled_d: "ठगी वाला लिंक खुलने से पहले चेतावनी दें, और राइट-क्लिक किए लिंक जाँचें।",
  ext_lang: "भाषा",
  ext_api_title: "वैकल्पिक सर्वर जाँच",
  ext_api_desc:
    "इसे खाली रखें तो हर जाँच इसी डिवाइस पर रहती है। अपना सर्वर सेट करें तो पेस्ट किए संदेश वहाँ भेजे जाते हैं, और जवाब न मिलने पर डिवाइस की जाँच काम आती है।",
  ext_api_placeholder: "https://your-server.example.com",
  ext_api_save: "सर्वर सहेजें",
  ext_api_clear: "सिर्फ इस डिवाइस पर जाँचें",
  ext_api_denied: "अनुमति नहीं मिली, इसलिए कुछ नहीं भेजा जाएगा। जाँच इसी डिवाइस पर रहेगी।",
  ext_api_bad: "पूरा http:// या https:// पता लिखें।",
  ext_saved: "सहेजा गया",
  ext_req_failed: "आपका सर्वर जवाब नहीं दे सका — इसलिए इसी डिवाइस पर जाँच की गई।",
  ext_no_result: "अभी कुछ जाँचा नहीं गया। ऊपर संदेश पेस्ट करें, या किसी पेज पर टेक्स्ट या लिंक पर राइट-क्लिक करें।",
  ext_perm_note:
    "अनुमतियाँ: राइट-क्लिक मेन्यू, स्थानीय स्टोरेज और पेज नेविगेशन ही। पेज की सामग्री नहीं पढ़ी जाती, और सर्वर सेट किए बिना कोई होस्ट अनुमति नहीं मांगी जाती।",
  ext_footer: "अनपैक्ड बिल्ड · v1.3.0",
  ext_badge_scam: "ठगी वाला लिंक — रोका गया",
  ext_badge_susp: "इस लिंक में सावधानी रखें",
  ext_lang_aria: "भाषा",
  ext_close: "बंद करें",
  ext_help: "ठगी हुई? रिपोर्ट करें",
  ext_advice: "अब क्या करें",
  ext_msg_links: "इस संदेश में मिले लिंक",
  ext_selected: "चुना गया टेक्स्ट",
  ext_score: "जोखिम स्कोर",
  ext_why_short: "कारण",
  ext_blocked_stays: "आप यह टैब बंद कर सकते हैं।",
  ext_loading: "लिंक पढ़ा जा रहा है…",
  ext_viaserver: "आपके सर्वर से जाँचा गया",
  ext_onselection: "चुना गया टेक्स्ट"
};

export type Lang = "en" | "hi";

const dicts: Record<Lang, Record<string, string>> = {
  en: { ...(sharedEn as Record<string, string>), ...extEn },
  hi: { ...(sharedHi as Record<string, string>), ...extHi }
};

export function t(lang: Lang, key: string): string {
  const dict = dicts[lang] || dicts.en;
  return dict[key] ?? (dicts.en[key] ?? key);
}

export function verdictLabel(lang: Lang, verdict: string): string {
  if (verdict === "scam") return t(lang, "v_scam");
  if (verdict === "suspicious") return t(lang, "v_susp");
  return t(lang, "v_safe");
}

export function verdictSentence(lang: Lang, verdict: string): string {
  if (verdict === "scam") return t(lang, "sent_scam");
  if (verdict === "suspicious") return t(lang, "sent_susp");
  return t(lang, "sent_safe");
}

export function severityOf(verdict: string): number {
  return verdict === "scam" ? 3 : verdict === "suspicious" ? 2 : 1;
}

export function fmt(lang: Lang, key: string, vars: Record<string, string | number>): string {
  return Object.keys(vars).reduce(
    (out, k) => out.replace(`{${k}}`, String(vars[k])),
    t(lang, key)
  );
}

export { extEn, extHi };
