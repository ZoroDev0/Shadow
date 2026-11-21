from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

ROOT = Path(__file__).resolve().parents[1]
RULES_PATH = ROOT / "src" / "detection" / "rules.json"
with RULES_PATH.open("r", encoding="utf-8") as f:
    RULES = json.load(f)

APP_NAME = "ScamShield"
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", os.getenv("CORS_ORIGINS", "http://localhost:5173"))
RATE_LIMIT_PER_MINUTE = max(1, int(os.getenv("RATE_LIMIT_PER_MINUTE", "30")))
MAX_REQUEST_BYTES = max(1024, int(os.getenv("MAX_REQUEST_BYTES", "64000")))
MAX_TEXT_LENGTH = max(1, int(os.getenv("MAX_TEXT_LENGTH", "5000")))
ML_ENABLED = os.getenv("ML_ENABLED", "false").strip().lower() in {"1", "true", "yes", "on"}
SHADOW_MODEL_PATH = os.getenv("SHADOW_MODEL_PATH", "").strip()
ML_POSITIVE_MAX = 10
ML_NEGATIVE_MAX = 5
ML_THRESHOLD = 0.27

URL_FEATURE_NAMES = [
    "url_length", "hostname_length", "path_length", "query_length",
    "shannon_entropy", "digit_ratio", "special_char_ratio", "subdomain_depth",
    "is_ip_address", "suspicious_keyword_count", "has_url_encoding",
    "has_at_symbol", "has_double_slash_redirect", "num_subdirectories",
    "num_query_params", "is_https", "has_punycode", "tld_length",
    "hyphen_count_hostname", "vowel_consonant_ratio",
]

ADVICE = {
    "scam": [
        {"text_en": "Do not click the link or call any number in this message.", "text_hi": "इस संदेश का लिंक न खोलें और इसमें दिए नंबर पर कॉल न करें।"},
        {"text_en": "Never share OTP, PIN, CVV or KYC details — real banks never ask for them.", "text_hi": "OTP, PIN, CVV या KYC की जानकारी किसी को न दें — असली बैंक कभी नहीं मांगते।"},
        {"text_en": "Call your bank yourself on the number printed on your card or passbook.", "text_hi": "अपने कार्ड या पासबुक पर छपे नंबर पर खुद बैंक को कॉल करें।"},
        {"text_en": "Report it at cybercrime.gov.in or call 1930 (free, 24×7).", "text_hi": "cybercrime.gov.in पर रिपोर्ट करें या 1930 पर कॉल करें (मुफ़्त, 24×7)।"},
    ],
    "suspicious": [
        {"text_en": "Do not act on the message yet — no clicks, no calls, no codes.", "text_hi": "अभी इस संदेश पर कोई कदम न उठाएँ — न लिंक, न कॉल, न कोई कोड।"},
        {"text_en": "Open your bank’s official app yourself, or call the number printed on your card.", "text_hi": "बैंक का आधिकारिक ऐप खुद खोलें, या कार्ड पर छपे नंबर पर कॉल करें।"},
        {"text_en": "If it turns out to be fake, report it at cybercrime.gov.in or call 1930.", "text_hi": "फर्ज़ी निकले तो cybercrime.gov.in पर रिपोर्ट करें या 1930 पर कॉल करें।"},
    ],
    "safe": [
        {"text_en": "No action needed for this message.", "text_hi": "इस संदेश के लिए कुछ करने की ज़रूरत नहीं है।"},
        {"text_en": "Remember: banks and government offices never ask for OTP or PIN over calls or messages.", "text_hi": "याद रखें: बैंक या सरकारी दफ़्तर कभी कॉल या संदेश में OTP या PIN नहीं मांगते।"},
        {"text_en": "Share ScamShield with your family to keep them safe too.", "text_hi": "अपने परिवार को भी सुरक्षित रखने के लिए ScamShield उनके साथ साझा करें।"},
    ],
}

REAL_DOMAINS = RULES["realDomains"]
BRAND_TOKENS = RULES["brandTokens"]
SHORTENERS = set(RULES["shorteners"])
BAD_TLDS = set(RULES["badTlds"])
HOMOGLYPH_PASSES = RULES["homoglyphPasses"]
CAPS_OK = set(RULES["capsOk"])

def rx(name: str, flags: int = re.I) -> re.Pattern[str]:
    return re.compile(RULES["regexes"][name], flags)

RE_URG = rx("urgency")
RE_THREAT = rx("threat")
RE_CRED_HARD = rx("credentialHard")
RE_CRED_HARD_HI = rx("credentialHardHi")
RE_CRED_SOFT = rx("credentialSoft")
RE_CRED_NOUNFIRST = rx("credentialNounFirst")
RE_CRED_EXPIRE = rx("credentialExpire")
RE_CRED_UPDATE = rx("credentialUpdate")
RE_GOV_IMP = rx("governmentImpersonation")
RE_CONSUMER_IMP = rx("consumerImpersonation")
RE_REWARD = rx("reward")
RE_JOB = rx("job")
RE_LOAN_APP = re.compile(r"(instant\s+loan|pre-?approved\s+loan|loan\s+approved)[\s\S]{0,120}?(no\s+documents?|without\s+documents?|zero\s+documents?|processing\s+(?:fee|charges)|\.apk)", re.I)
RE_LOAN_APP2 = re.compile(r"\bloan\b[^.!?\n]{0,40}\bapproved\b[\s\S]{0,120}?(no\s+documents?|without\s+documents?|zero\s+documents?|\.apk|\bpay\b[^.!?\n]{0,30}processing\s+(?:fee|charges))", re.I)
RE_REMOTE = rx("remote")
RE_SAFE_ACCT = rx("safeAccount")
RE_DA_AUTH = rx("digitalArrestAuthority")
RE_DA_COERCE = rx("digitalArrestCoerce")
RE_COURIER_FEE = re.compile(r"(?:(?:courier|parcel|shipment|customs)[^.!?\n]{0,80}(?:fee|duty|charge|payment|pay|held|seized)|(?:fee|duty|charge|payment|pay)[^.!?\n]{0,80}(?:courier|parcel|shipment|customs))", re.I)
RE_SEX_MEDIA = rx("sextortionMedia")
RE_SEX_DEMAND = rx("sextortionDemand")
RE_PRESS = re.compile(r"(press\s*(?:\d|one|two|nine|ek)\b|दबाएं|दबाओ)", re.I)
RE_CALL_WORD = re.compile(r"(\bcall\b|\bwhatsapp\b|whats\s?app|\bmsg\b|\bmessage\b|\bcontact\b|\breach\b|\bdial\b|कॉल|संपर्क)", re.I)
RE_MOBILE = re.compile(r"(?:\+?91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b")
RE_CONTACT_LINK = re.compile(r"(?:^|[./])(?:wa\.me|t\.me|telegram\.me|chat\.whatsapp\.com|api\.whatsapp\.com)(?:[./]|$)", re.I)
RE_CHALLAN = re.compile(r"(challan|चालान)", re.I)
RE_PENDING_PAY = rx("pendingPayment")
OTP_TO_YOU_RE = rx("otpToYou")
NEG_SHARE_RE = rx("negShare")
NEG_BEFORE_RE = re.compile(r"\b(?:never|do\s+not|don't|dont|won't|not|mat|nahi|kabhi)\b|कभी|मत|नहीं|न\s+कर", re.I)
NEG_BETWEEN_RE = re.compile(r"कभी|मत|नहीं|न\s+कर|न\s+दें|\b(?:mat|nahi|kabhi)\b", re.I)
RE_DELIVERY = rx("delivery")
RE_NO_ACTION = rx("noAction")

TLD_SRC = "(?:com|in|net|org|xyz|top|click|info|io|app|gov|edu|tk|ml|ga|cf|gq|me|co|biz|live|shop|online|site|link|icu|sbs|cfd|rest|quest|ly|gy|to|cc|ms|gg|be|tv|sbi)"
URL_RE = re.compile(r"(?:https?://|www\.)[^\s<>\"`]+|(?:[a-z0-9][\w-]*\.)+" + TLD_SRC + r"(?![\w-])(?:/[^\s<>\"`]*)?", re.I)

class AnalyzeRequest(BaseModel):
    text: str = Field(max_length=MAX_TEXT_LENGTH)

def extract_urls(text: str) -> list[str]:
    found: list[str] = []
    for match in URL_RE.finditer(text):
        url = match.group(0).rstrip(".,!?;:)\\]")
        if match.start() > 0 and text[match.start() - 1] == "@":
            continue
        if len(url) > 4 and url not in found:
            found.append(url)
        if len(found) >= 8:
            break
    return found

def url_host(url: str) -> str:
    try:
        h = re.sub(r"^[a-z]+://", "", url.lower()).split("/")[0]
        if "@" in h:
            h = h.rsplit("@", 1)[1]
        h = h.split(":")[0]
        if h.startswith("www."):
            h = h[4:]
        return h
    except Exception:
        return ""

def real_domain_of(host: str) -> str | None:
    if host in REAL_DOMAINS:
        return host
    for domain in REAL_DOMAINS:
        if host.endswith("." + domain):
            return domain
    return None

def levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (0 if ca == cb else 1)))
        prev = cur
    return prev[-1]

def find_lookalike(host: str) -> dict[str, Any] | None:
    if real_domain_of(host):
        return None
    labels = host.split(".")
    for label in labels:
        if label.startswith("xn--"):
            return {"kind": "punycode", "real": None, "brand": label}
    for domain in REAL_DOMAINS:
        if domain in host:
            return {"kind": "embedded", "real": domain, "brand": domain}
    for pass_index, pass_pairs in enumerate([None] + HOMOGLYPH_PASSES):
        for label in labels:
            if len(label) < 3:
                continue
            form = label
            if pass_pairs:
                for pair in pass_pairs:
                    form = form.replace(pair[0], pair[1])
            segs = [x for x in re.split(r"[^a-z0-9]+", form) if x]
            for brand in BRAND_TOKENS:
                hit = False
                tok = brand["tok"]
                mode = brand.get("mode")
                if mode == "eq":
                    hit = tok in segs
                elif mode == "seg":
                    hit = tok in segs or any(seg.startswith(tok) for seg in segs)
                else:
                    hit = any(tok in seg for seg in segs)
                if hit:
                    return {"kind": "homoglyph" if pass_index else "lookalike", "real": brand["real"], "brand": tok}
    for label in labels:
        if len(label) < 6 or len(label) > 30 or re.search(r"\d", label):
            continue
        for domain in REAL_DOMAINS:
            core = ".".join(domain.split(".")[:-1])
            if len(core) >= 6 and levenshtein(label, core) <= 2:
                return {"kind": "typo", "real": domain, "brand": core}
    return None

def worst_verdict(a: str, b: str) -> str:
    order = {"safe": 0, "suspicious": 1, "scam": 2}
    return b if order[b] > order[a] else a

def analyze_link(url: str) -> dict[str, Any]:
    host = url_host(url)
    out = {"url": url, "host": host, "verdict": "safe", "reason": None, "lookalike_of": None, "pts": 0}
    if not host or "." not in host:
        return out
    real = real_domain_of(host)
    if real:
        out["pts"] = -20
        out["reason"] = {"en": f"The link points to the real official website {host}.", "hi": f"लिंक असली आधिकारिक वेबसाइट {host} पर जाता है।"}
        return out
    look = find_lookalike(host)
    tld = host.split(".")[-1]
    is_ip = bool(re.fullmatch(r"\d{1,3}(?:\.\d{1,3}){3}", host))
    is_short = host in SHORTENERS
    hyphens = host.count("-")
    if is_ip:
        out["pts"] += 30
        out["verdict"] = "scam"
        out["reason"] = {"en": "The link is just a raw number address (IP) — real banks never send these.", "hi": "लिंक सिर्फ एक नंबर-पता (IP) है — असली बैंक कभी ऐसा पता नहीं भेजते।"}
    elif look:
        if look["kind"] == "punycode":
            out["pts"] += 30
            out["verdict"] = "scam"
            out["reason"] = {"en": "The link uses foreign-character (punycode) tricks to imitate a real website.", "hi": "लिंक विदेशी-अक्षर (punycode) की चाल से असली वेबसाइट की नकल करता है।"}
        elif look["kind"] == "embedded":
            out["pts"] += 38
            out["verdict"] = "scam"
            out["lookalike_of"] = look["real"]
            out["reason"] = {"en": f"The real website “{look['real']}” is hidden inside a longer fake address — only the ending counts.", "hi": f"असली वेबसाइट “{look['real']}” लंबे फर्ज़ी पते के अंदर छिपी है — असली पहचान पते के अंतिम हिस्से से होती है।"}
        elif not look["real"]:
            out["pts"] += 26
            out["verdict"] = "scam"
            out["reason"] = {"en": f"The address puts an official body (“{look['brand'].upper()}”) inside a website that is not its official site.", "hi": f"पते में आधिकारिक निकाय (“{look['brand'].upper()}”) का नाम है, पर वह उसकी आधिकारिक साइट नहीं है।"}
        else:
            out["pts"] += 38
            out["verdict"] = "scam"
            out["lookalike_of"] = look["real"]
            if look["kind"] in ("homoglyph", "typo"):
                out["reason"] = {"en": f"“{host}” uses look-alike letters to imitate the real website “{look['real']}”.", "hi": f"“{host}” एक जैसे दिखने वाले अक्षरों से असली वेबसाइट “{look['real']}” की नकल है।"}
            else:
                out["reason"] = {"en": f"The link “{host}” is a fake copy of the real website “{look['real']}”.", "hi": f"लिंक “{host}” असली वेबसाइट “{look['real']}” की नकल है।"}
    if is_short:
        out["pts"] += 24
        out["verdict"] = worst_verdict(out["verdict"], "suspicious")
        if not out["reason"]:
            out["reason"] = {"en": f"The link is shortened ({host}) to hide where it really leads.", "hi": f"लिंक छोटा किया गया है ({host}) ताकि असली पता छिप जाए।"}
    elif tld in BAD_TLDS:
        out["pts"] += 24
        out["verdict"] = worst_verdict(out["verdict"], "suspicious")
        if not out["reason"]:
            out["reason"] = {"en": f"The link ends in “.{tld}” — a cheap domain type that scammers often use.", "hi": f"लिंक का अंत “.{tld}” में है — ऐसे सस्ते डोमेन अक्सर ठग इस्तेमाल करते हैं।"}
    if hyphens >= 2:
        out["pts"] += 14
        out["verdict"] = worst_verdict(out["verdict"], "suspicious")
        if not out["reason"]:
            out["reason"] = {"en": f"The address has many hyphens ({host}) — a trick to look official.", "hi": f"पते में कई हाइफन (-) हैं ({host}) — आधिकारिक दिखने की चाल है।"}
    if url.lower().startswith("http://"):
        out["pts"] += 8
    if not out["reason"]:
        out["pts"] += 4
        out["reason"] = {"en": "An ordinary website link. Nothing obviously wrong, but stay alert if the message felt scary.", "hi": "सामान्य वेबसाइट लिंक। कुछ भी गलत नहीं दिखता — संदेश डरावना लगे तो सावधान रहें।"}
    return out

def collect_hits(pattern: re.Pattern[str], text: str, cap: int = 12) -> list[str]:
    hits: list[str] = []
    for match in pattern.finditer(text):
        value = match.group(0)
        if value not in hits:
            hits.append(value)
        if len(hits) >= cap:
            break
    return hits

def negated_before(text: str, index: int, span: int = 55) -> bool:
    window = text[max(0, index - span):index].lower()
    return bool(NEG_BEFORE_RE.search(window))

def detect_local(raw_text: str) -> dict[str, Any]:
    text = str(raw_text or "")[:4000]
    low = text.lower()
    score = 0
    hard = False
    groups: set[str] = set()
    risk_reasons: list[dict[str, Any]] = []
    safe_reasons: list[dict[str, str]] = []
    highlights: list[str] = []
    links: list[dict[str, Any]] = []

    def add_risk(rank: int, icon: str, en: str, hi: str, hl: list[str] | None = None):
        risk_reasons.append({"icon": icon, "text_en": en, "text_hi": hi, "rank": rank})
        if hl:
            for value in hl:
                if value:
                    highlights.append(str(value)[:60])

    def add_safe(icon: str, en: str, hi: str):
        safe_reasons.append({"icon": icon, "text_en": en, "text_hi": hi})

    urls = extract_urls(text)
    risky_link = False
    saw_real_domain = False
    for url in urls:
        link = analyze_link(url)
        score += link["pts"]
        links.append({"url": link["url"], "verdict": link["verdict"], "reason": link["reason"], "lookalike_of": link["lookalike_of"]})
        if link["verdict"] != "safe":
            risky_link = True
            if link["lookalike_of"]:
                add_risk(0, "link", link["reason"]["en"], link["reason"]["hi"], [link["host"]])
            elif link["verdict"] == "scam":
                add_risk(0, "link", link["reason"]["en"], link["reason"]["hi"], [link["host"]])
            else:
                add_risk(4, "link", link["reason"]["en"], link["reason"]["hi"], [link["host"]])
        elif real_domain_of(link["host"]):
            saw_real_domain = True
            add_safe("link", link["reason"]["en"], link["reason"]["hi"])
    if risky_link:
        groups.add("riskyLink")
    if urls and len(re.sub(r"\s+", " ", text).strip()) <= len(urls[0]) + 12:
        score += 10
        add_risk(12, "link", "The message is only a link, with no explanation — be careful.", "संदेश सिर्फ एक लिंक है, कोई और जानकारी नहीं — सावधान रहें।")

    cred_fired = False
    cred_negated = False
    for match in RE_CRED_HARD.finditer(text):
        if negated_before(text, match.start(), 55):
            cred_negated = True
            continue
        verb = (match.group(1) or "").lower() if match.lastindex else ""
        if re.fullmatch(r"(enter|type|confirm)", verb.strip()) and OTP_TO_YOU_RE.search(text):
            continue
        hard = True
        cred_fired = True
        highlights.append(match.group(0)[:40])
    for match in RE_CRED_HARD_HI.finditer(text):
        after = text[match.end():match.end() + 14]
        if NEG_BETWEEN_RE.search(match.group(0)) or re.search(r"न\s*(?:करें|करना|देना|बताना|भेजना)|मत|नहीं|कभी", after):
            cred_negated = True
            continue
        hard = True
        cred_fired = True
        highlights.append(match.group(0)[:40])
    if cred_fired:
        score += 30
        groups.add("credential")
        add_risk(0, "key", "It asks you to share an OTP, PIN, CVV or UPI PIN — no real bank, app or government office will ever ask for these.", "यह आपसे OTP, PIN, CVV या UPI PIN मांगता है — कोई असली बैंक, ऐप या सरकारी दफ़्तर कभी नहीं मांगते।")
    else:
        soft_hits = collect_hits(RE_CRED_SOFT, text, 3)
        nf_hits = collect_hits(RE_CRED_NOUNFIRST, text, 3)
        ex_hits = collect_hits(RE_CRED_EXPIRE, text, 3)
        upd_hits = collect_hits(RE_CRED_UPDATE, text, 3)
        if soft_hits:
            score += 20
            cred_fired = True
            add_risk(1, "key", "It asks for KYC, Aadhaar, password or card/bank details — a classic phishing hook.", "यह KYC, आधार, पासवर्ड या कार्ड/बैंक की जानकारी मांगता है — फ़िशिंग की सबसे आम चाल।", soft_hits[:2])
        if nf_hits:
            score += 20
            cred_fired = True
            add_risk(1, "key", "It pushes a “KYC/Aadhaar update” — banks never run KYC updates through message links.", "यह “KYC/आधार अपडेट” की बात करता है — बैंक कभी संदेश-लिंक से KYC अपडेट नहीं करवाते।", nf_hits[:2])
        if ex_hits and not cred_fired:
            score += 20
            cred_fired = True
            add_risk(1, "key", "It says your OTP/KYC/Aadhaar has “expired” or is “pending” and pushes you to act — a standard phishing opener.", "यह कहता है कि आपका OTP/KYC/आधार “समाप्त” या “बाकी” है और जल्दी करने को दबाव बनाता है — फ़िशिंग की आम शुरुआत।", ex_hits[:2])
        if upd_hits and not cred_fired:
            score += 12
            cred_fired = True
            add_risk(1, "key", "It pushes you to “update/verify your details, payment or bill” through it — never do that from a message.", "यह आपको उसी संदेश से “जानकारी/भुगतान अपडेट या सत्यापित” करने पर मजबूर करता है — संदेश से ऐसा कभी न करें।", upd_hits[:2])
    if cred_fired:
        groups.add("credential")
    if cred_negated:
        add_safe("key", "It clearly tells you NOT to share the OTP or PIN — something only genuine senders say.", "इसमें साफ़ कहा गया है कि OTP/PIN किसी से साझा न करें — यह असली भेजने वाले ही कहते हैं।")

    text_no_links = text
    for url in urls:
        text_no_links = text_no_links.replace(url, " ")
    low_no_links = text_no_links.lower()
    gov_hit = collect_hits(RE_GOV_IMP, low_no_links, 1)
    gov_hit = gov_hit[0] if gov_hit else None
    consumer_hit = collect_hits(RE_CONSUMER_IMP, low_no_links, 1)
    consumer_hit = consumer_hit[0] if consumer_hit else None
    if gov_hit:
        score += 12
        groups.add("impersonation")
        add_risk(3, "bank", f"It speaks in the name of a bank or government body (“{gov_hit.upper()}”) — scammers hide behind big names.", f"यह किसी बैंक या सरकारी विभाग (“{gov_hit.upper()}”) के नाम से आया है — ठग बड़े नाम के पीछे छिपते हैं।", [gov_hit])
    elif consumer_hit:
        score += 6
        groups.add("impersonation")

    threat_hits = collect_hits(RE_THREAT, text, 6)
    threat_fired = bool(threat_hits)
    if threat_fired:
        score += min(25, 16 + 3 * (len(threat_hits) - 1))
        groups.add("threat")
        add_risk(2, "siren", "It threatens you with arrest, legal action, seizure or SIM blocking — real authorities never warn like this over SMS.", "इसमें गिरफ़्तारी, कानूनी कार्रवाई, ज़ब्ती या SIM बंद करने की धमकी है — असली सरकारी अधिकारी कभी SMS में ऐसी चेतावनी नहीं देते।", threat_hits[:3])

    urg_hits = collect_hits(RE_URG, text, 6)
    urg_fired = bool(urg_hits)
    if urg_fired:
        score += min(17, 9 + 2 * (len(urg_hits) - 1))
        groups.add("urgency")
        add_risk(5, "clock", f"It creates panic with words like “{', '.join(urg_hits[:2])}” so you act without thinking.", f"यह “{'”, “'.join(urg_hits[:2])}” जैसे शब्दों से घबराहट पैदा करता है ताकि आप बिना सोचे-समझे कोई कदम उठाएँ।", urg_hits[:3])

    press_hits = collect_hits(RE_PRESS, text, 2)
    call_hits = collect_hits(RE_CALL_WORD, low, 2)
    mobile_hits = collect_hits(RE_MOBILE, text, 3)
    has_mobile = bool(mobile_hits)
    contact_link = False
    for url in urls:
        if RE_CONTACT_LINK.search(url_host(url)):
            contact_link = True
            break
    callback_fired = bool(press_hits) or ((bool(call_hits) or contact_link) and has_mobile)
    if press_hits:
        score += 10
        groups.add("callback")
        add_risk(9, "phone", "It tells you to press a key to “speak to an officer” — a classic call-back scam trick.", "यह किसी बटन दबाकर “अफ़सर से बात” करने को कहता है — कॉल-बैक घोटाले की पुरानी चाल।", press_hits[:2])
    elif callback_fired:
        score += 10
        groups.add("callback")
        add_risk(9, "phone", "It pushes you to call or message an unknown number — real notices come through official channels, not private numbers.", "यह आपसे किसी अनजान नंबर पर कॉल या मैसेज कराना चाहता है — असली सूचनाएँ आधिकारिक रास्ते से आती हैं, निजी नंबरों से नहीं।", mobile_hits[:2])
    elif contact_link:
        score += 10
        groups.add("callback")
        add_risk(9, "phone", "It moves the chat to WhatsApp or Telegram — the favourite corner of scam gangs.", "यह बातचीत को WhatsApp या Telegram पर ले जाता है — ठगों का पसंदीदा ठिकाना।")
    if has_mobile:
        score += 6
        highlights.append(mobile_hits[0])

    reward_hits = collect_hits(RE_REWARD, text, 3)
    reward_fired = bool(reward_hits)
    if reward_fired:
        score += 14
        groups.add("reward")
        if risky_link or callback_fired or has_mobile:
            score += 8
        add_risk(6, "gift", "It offers a prize or reward that is too good to be true — because it is.", "यह ऐसा इनाम या लॉटरी का लालच देता है जो सच हो ही नहीं सकता।", reward_hits[:2])

    job_hits = collect_hits(RE_JOB, text, 3)
    job_fired = bool(job_hits)
    if job_fired:
        score += 22
        groups.add("job")
        add_risk(7, "gift", "It offers easy money — a part-time “liking videos” / “typing work” job. This is how task scams begin.", "यह आसान पैसे का लालच देता है — “वीडियो लाइक करने” / “टाइपिंग वर्क” वाली पार्ट-टाइम नौकरी। टास्क-घोटाला यहीं से शुरू होता है।", job_hits[:2])

    if RE_REMOTE.search(low):
        hard = True
        score += 30
        groups.add("remote")
        add_risk(0, "monitor", "It asks you to install a remote-control app (AnyDesk, TeamViewer, QuickSupport…) — that hands your entire phone to a stranger. No real bank or officer ever asks this.", "यह आपसे रिमोट-कंट्रोल ऐप (AnyDesk, TeamViewer, QuickSupport…) इंस्टॉल करने को कहता है — इससे आपका पूरा फ़ोन किसी अजनबी के हाथ चला जाता है। कोई असली बैंक या अफ़सर कभी ऐसा नहीं कहता।")
    if RE_COURIER_FEE.search(low) and (risky_link or callback_fired):
        hard = True
        score += 30
        groups.add("courierFee")
        add_risk(0, "link", "It asks for a customs or courier fee through an unofficial payment link or callback — legitimate deliveries do not use a separate fee funnel.", "यह गैर-आधिकारिक भुगतान लिंक या कॉल के जरिए कूरियर/कस्टम्स शुल्क माँगता है — असली डिलीवरी अलग से इस तरह शुल्क नहीं माँगती।")
    if RE_LOAN_APP.search(low) or RE_LOAN_APP2.search(low):
        hard = True
        score += 30
        groups.add("loanApp")
        add_risk(0, "siren", "It promises instant approval with no documents, then pushes an APK or demands a processing fee. Real lenders do not collect fees this way.", "यह बिना दस्तावेज़ तुरंत लोन मंज़ूर होने का वादा करके APK या प्रोसेसिंग फीस माँगता है। असली लोनदाता ऐसे शुल्क नहीं लेते।")
    if RE_SAFE_ACCT.search(low):
        hard = True
        score += 30
        groups.add("safeAccount")
        add_risk(0, "siren", "It wants you to move money to a “safe account” or RBI account — the signature trick of the “digital arrest” scam. No real authority ever parks your money like this.", "यह आपसे पैसे “सेफ खाते” या RBI खाते में डालने को कहता है — “डिजिटल अरेस्ट” घोटाले की पहचान यही है। कोई भी असली अधिकारी ऐसा कभी नहीं करता।")
    if RE_DA_AUTH.search(low) and RE_DA_COERCE.search(low):
        hard = True
        score += 30
        groups.add("digitalArrest")
        add_risk(0, "siren", "This has the fingerprints of a “digital arrest” scam: a fake officer, a video call, secrecy and pressure. Police and agencies never work like this.", "इसमें “डिजिटल अरेस्ट” घोटाले के सारे निशान हैं: नकली अफ़सर, वीडियो कॉल, गोपनीयता और दबाव। पुलिस या कोई भी एजेंसी कभी ऐसे काम नहीं करती।")
    if RE_SEX_MEDIA.search(low) and RE_SEX_DEMAND.search(low):
        hard = True
        score += 30
        groups.add("sextortion")
        add_risk(0, "chat", "This is blackmail: it claims to have a private video or photos and demands money. Do not pay, do not reply — report it to the police or at cybercrime.gov.in.", "यह ब्लैकमेल है: निजी वीडियो या फोटो होने का दावा करके पैसे मांगे जा रहे हैं। न भुगतान करें, न जवाब दें — पुलिस या cybercrime.gov.in पर रिपोर्ट करें।")
    if job_fired and has_mobile:
        hard = True
        score += 30
        groups.add("funnel")
        add_risk(0, "phone", "It funnels you to a personal WhatsApp/Telegram number — exactly how “task scam” gangs recruit victims.", "यह आपको किसी निजी WhatsApp/Telegram नंबर तक ले जाता है — “टास्क स्कैम” गैंग शिकार यहीं से करते हैं।", mobile_hits[:1])
    lottery_docs = re.search(r"(?:\b(?:send|share|upload|submit|pay|bhejo|bhej)\b[^.!?\n]{0,45}\b(?:aadhaar|aadhar|adhar|bank\s+details?|documents?|id\s+proof|fee|registration|processing)\b|(?:भेजें|साझा)[^.!?\n]{0,45}(?:आधार|कागज़ात|बैंक\s+विवरण))", low)
    if reward_fired and lottery_docs:
        hard = True
        score += 30
        groups.add("lotteryDocs")
        add_risk(0, "key", "A prize you never entered, asking for Aadhaar, bank details or a “fee” to claim it — that is the trap.", "जिस इनाम में आपने हिस्सा ही नहीं लिया, उसे पाने के लिए आधार, बैंक विवरण या “फ़ीस” मांगी जा रही है — यही जाल है।")
    if reward_fired and contact_link:
        hard = True
        score += 30
        groups.add("rewardContact")
        add_risk(0, "phone", "A free reward or subscription is being pushed through a private Telegram or WhatsApp link — that is a common bait-and-payment funnel.", "मुफ़्त इनाम या सब्सक्रिप्शन को निजी Telegram/WhatsApp लिंक पर ले जाया जा रहा है — यह लालच और भुगतान की आम चाल है।")
    if cred_fired and contact_link:
        hard = True
        score += 30
        groups.add("credContact")
        add_risk(0, "phone", "It moves a KYC/OTP/details conversation to WhatsApp or Telegram — real banks and government offices never verify you there.", "यह KYC/OTP/जानकारी की बातचीत को WhatsApp या Telegram पर ले जाता है — असली बैंक या सरकारी दफ़्तर कभी वहीं सत्यापन नहीं करते।")

    has_refund_word = bool(re.search(r"\b(?:refund|रिफंड)\b", low))
    has_pin_ask = cred_fired or bool(re.search(r"\bupi\s*pin\b|\benter\s+your\s+pin\b|pin\s+डाल", low))
    has_collect = bool(re.search(r"\bcollect\s+(?:request|money)\b|scan\s+(?:the\s+|this\s+)?(?:qr|code)\s+(?:to\s+)?(?:receive|get)|कलेक्ट\s+रिक्वेस्ट", low))
    if (has_refund_word and (has_pin_ask or has_collect)) or has_collect:
        score += 18
        groups.add("upiTrick")
        if has_collect and not cred_fired:
            hard = True
            score += 30
            groups.add("collectRequest")
        add_risk(1, "key", "It offers a “refund” that needs your UPI PIN, a QR scan or a collect request — money coming IN never needs a PIN.", "यह “रिफंड” देने के बहाने UPI PIN, QR स्कैन या कलेक्ट रिक्वेस्ट मांगता है — पैसे आने के लिए PIN कभी नहीं चाहिए।")

    challan_fired = bool(RE_CHALLAN.search(low))
    if challan_fired:
        if risky_link or callback_fired:
            score += 24
            groups.add("challan")
            add_risk(0, "link", "A traffic e-challan that avoids the official government portal — real challans are only paid at echallan.parivahan.gov.in.", "ट्रैफ़िक ई-चालान जो आधिकारिक सरकारी पोर्टल से हटकर भुगतान मांगे — असली चालान सिर्फ़ echallan.parivahan.gov.in पर भरा जाता है।")
        elif saw_real_domain and not risky_link:
            add_safe("checkCircle", "This is a genuine government challan notice pointing to the official parivahan website.", "यह सरकारी चालान की असली सूचना है जो आधिकारिक parivahan वेबसाइट पर ले जाती है।")

    pend_hits = collect_hits(RE_PENDING_PAY, text, 2)
    if pend_hits:
        score += 10
        add_risk(11, "clock", "It builds pressure over a “pending/due” bill or challan — pay only inside the official app or website.", "यह “बाकी/due” बिल या चालान का दबाव बनाता है — भुगतान सिर्फ़ आधिकारिक ऐप या वेबसाइट से करें।", pend_hits[:1])

    if (urg_fired or threat_fired) and (callback_fired or has_mobile):
        score += 15
        add_risk(10, "phone", "First it creates panic, then it gives you a personal number to call — that combination is the scammer’s script.", "पहले घबराहट पैदा करता है, फिर कॉल के लिए निजी नंबर देता है — ठग की कहानी इसी क्रम में चलती है।")

    caps_words = [word for word in re.findall(r"\b[A-Z]{3,}\b", text) if word not in CAPS_OK]
    bangs = text.count("!")
    if len(caps_words) >= 3 or bangs >= 3:
        score += 6
        add_risk(11, "type", "SHOUTING in CAPITAL LETTERS and warnings to create panic.", "पूरे CAPITALS में लिखकर घबराहट पैदा करने की कोशिश की गई है।", caps_words[:4])

    if NEG_SHARE_RE.search(low):
        score -= 12
        add_safe("checkCircle", "It clearly reminds you to keep your OTP/PIN private — a sign of a genuine message.", "यह याद दिलाता है कि OTP/PIN निजी रखें — असली संदेश की निशानी।")
    if RE_DELIVERY.search(low):
        score -= 8
        add_safe("checkCircle", "This is a routine delivery update about your own order.", "यह आपके ही ऑर्डर की आम डिलीवरी सूचना है।")
    if RE_NO_ACTION.search(low):
        score -= 8
        add_safe("checkCircle", "It explicitly says no action or no reply is needed — scam messages never do that.", "इसमें साफ़ कहा गया है कि कुछ करने या जवाब देने की ज़रूरत नहीं — घोटाले वाले संदेश ऐसा कभी नहीं कहते।")
    if not cred_fired and OTP_TO_YOU_RE.search(text):
        add_safe("key", "This looks like a routine OTP or code sent TO you — nobody is asking you for one.", "यह आपको भेजा गया आम OTP या कोड लगता है — कोई आपसे मांग नहीं रहा।")

    if len(groups) >= 2:
        score += 14 if len(groups) >= 3 else 8
    if len(groups) >= 2:
        score = max(score, 30)
    if hard:
        score = max(score, 70)
    score = max(3, min(100, round(score)))

    verdict = "scam" if score > 65 else "suspicious" if score >= 30 else "safe"
    if verdict == "safe":
        if not safe_reasons:
            add_safe("checkCircle", "No requests for money, OTP or personal details.", "पैसे, OTP या निजी जानकारी की कोई मांग नहीं है।")
        if len(safe_reasons) == 1:
            add_safe("checkCircle", "No threatening or panic-creating language.", "न धमकी है, न घबराहट पैदा करने वाली भाषा।")
        if len(safe_reasons) == 2:
            add_safe("checkCircle", "Nothing here pressures you to act quickly.", "इसमें कहीं भी जल्दी करने का दबाव नहीं है।")
        reasons = [{"icon": r["icon"], "text_en": r["text_en"], "text_hi": r["text_hi"]} for r in safe_reasons[:4]]
    else:
        if not gov_hit and consumer_hit and risk_reasons:
            add_risk(8, "bank", f"It references “{consumer_hit.upper()}” — scammers often imitate well-known companies.", f"इसमें “{consumer_hit.upper()}” का नाम है — ठग अक्सर मशहूर कंपनियों का नाटक करते हैं।")
        risk_reasons.sort(key=lambda r: r["rank"])
        reasons = [{"icon": r["icon"], "text_en": r["text_en"], "text_hi": r["text_hi"]} for r in risk_reasons[:5 if verdict == "scam" else 4]]
        if not reasons:
            add_risk(5, "alertTri", "Something about this message felt off — treat it with caution.", "इस संदेश में कुछ गड़बड़ लगी — सावधानी से पेश आएँ।")
            reasons = [{"icon": r["icon"], "text_en": r["text_en"], "text_hi": r["text_hi"]} for r in risk_reasons[:3]]

    seen: set[str] = set()
    hl: list[str] = []
    for value in highlights:
        value = str(value).strip()
        key = value.lower()
        if 3 <= len(value) <= 60 and not re.search(r'[<>&"]', value) and key not in seen:
            seen.add(key)
            hl.append(value)
        if len(hl) >= 10:
            break
    return {"verdict": verdict, "score": score, "reasons": reasons, "links": links, "advice": ADVICE[verdict], "highlights": hl}

_ML_MODEL = None
_ML_MODEL_LOADED = False
_ML_URL_EXTRACTOR = None

def _load_url_extractor():
    global _ML_URL_EXTRACTOR
    if _ML_URL_EXTRACTOR is not None:
        return _ML_URL_EXTRACTOR
    try:
        import tldextract
        _ML_URL_EXTRACTOR = tldextract.TLDExtract(suffix_list_urls=None)
    except Exception:
        _ML_URL_EXTRACTOR = False
    return _ML_URL_EXTRACTOR

def load_shadow_model():
    global _ML_MODEL, _ML_MODEL_LOADED
    if _ML_MODEL_LOADED:
        return _ML_MODEL
    _ML_MODEL_LOADED = True
    if not ML_ENABLED or not SHADOW_MODEL_PATH:
        return None
    try:
        import lightgbm
        model = lightgbm.Booster(model_file=SHADOW_MODEL_PATH)
        names = list(model.feature_name())
        if names != URL_FEATURE_NAMES:
            return None
        _ML_MODEL = model
    except Exception:
        _ML_MODEL = None
    return _ML_MODEL

def shannon_entropy(value: str) -> float:
    if not value:
        return 0.0
    counts: dict[str, int] = {}
    for char in value:
        counts[char] = counts.get(char, 0) + 1
    length = len(value)
    return -sum((count / length) * __import__("math").log2(count / length) for count in counts.values())

def extract_url_features(url: str) -> dict[str, float | int] | None:
    if not isinstance(url, str) or not url.strip():
        return None
    from urllib.parse import parse_qs, urlparse
    raw = url.strip()
    parsed = urlparse(raw)
    extractor = _load_url_extractor()
    if extractor is False:
        return None
    extracted = extractor(raw)
    hostname = parsed.netloc or ""
    path = parsed.path or ""
    query = parsed.query or ""
    total = len(raw)
    digits = sum(char.isdigit() for char in raw)
    special = sum(not char.isalnum() for char in raw)
    subdomains = [value for value in extracted.subdomain.split(".") if value] if extracted.subdomain else []
    ip_regex = re.compile(r"^(?:https?://)?(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?(?:/.*)?$")
    is_ip = 1 if ip_regex.match(raw) or ip_regex.match(hostname) else 0
    suspicious_keywords = {
        "login", "signin", "verify", "verification", "secure", "security",
        "account", "banking", "update", "wallet", "confirm", "service",
        "support", "password", "credential", "auth", "billing", "recovery",
    }
    lower = raw.lower()
    keyword_count = sum(1 for keyword in suspicious_keywords if keyword in lower)
    domain_chars = [char.lower() for char in extracted.domain if char.isalpha()]
    vowels = sum(char in "aeiou" for char in domain_chars)
    consonants = len(domain_chars) - vowels
    vowel_ratio = vowels / consonants if consonants > 0 else float(vowels)
    return {
        "url_length": total,
        "hostname_length": len(hostname),
        "path_length": len(path),
        "query_length": len(query),
        "shannon_entropy": shannon_entropy(raw),
        "digit_ratio": digits / total if total else 0.0,
        "special_char_ratio": special / total if total else 0.0,
        "subdomain_depth": len(subdomains),
        "is_ip_address": is_ip,
        "suspicious_keyword_count": keyword_count,
        "has_url_encoding": 1 if "%" in raw else 0,
        "has_at_symbol": 1 if "@" in raw else 0,
        "has_double_slash_redirect": 1 if "//" in path else 0,
        "num_subdirectories": len([part for part in path.split("/") if part]),
        "num_query_params": len(parse_qs(query)),
        "is_https": 1 if parsed.scheme.lower() == "https" else 0,
        "has_punycode": 1 if "xn--" in hostname.lower() else 0,
        "tld_length": len(extracted.suffix) if extracted.suffix else 0,
        "hyphen_count_hostname": hostname.count("-"),
        "vowel_consonant_ratio": round(vowel_ratio, 4),
    }

def hard_signal_detected(text: str) -> bool:
    low = text.lower()
    cred_hard = False
    for match in RE_CRED_HARD.finditer(text):
        if not negated_before(text, match.start(), 55):
            cred_hard = True
            break
    for match in RE_CRED_HARD_HI.finditer(text):
        after = text[match.end():match.end() + 14]
        if not (NEG_BETWEEN_RE.search(match.group(0)) or re.search(r"न\s*(?:करें|करना|देना|बताना|भेजना)|मत|नहीं|कभी", after)):
            cred_hard = True
            break
    job_fired = bool(RE_JOB.search(text))
    mobile_fired = bool(RE_MOBILE.search(text))
    reward_fired = bool(RE_REWARD.search(text))
    urls = extract_urls(text)
    contact_link = any(RE_CONTACT_LINK.search(url_host(url)) for url in urls)
    has_collect = bool(re.search(r"\bcollect\s+(?:request|money)\b|scan\s+(?:the\s+|this\s+)?(?:qr|code)\s+(?:to\s+)?(?:receive|get)|कलेक्ट\s+रिक्वेस्ट", low))
    cred_soft_or_hard = bool(
        cred_hard or RE_CRED_SOFT.search(text) or RE_CRED_NOUNFIRST.search(text)
        or RE_CRED_EXPIRE.search(text) or RE_CRED_UPDATE.search(text)
    )
    return bool(
        cred_hard
        or RE_REMOTE.search(low)
        or RE_LOAN_APP.search(low)
        or RE_LOAN_APP2.search(low)
        or RE_SAFE_ACCT.search(low)
        or (RE_COURIER_FEE.search(low) and (bool(urls)))
        or (reward_fired and contact_link)
        or has_collect
        or (RE_DA_AUTH.search(low) and RE_DA_COERCE.search(low))
        or (RE_SEX_MEDIA.search(low) and RE_SEX_DEMAND.search(low))
        or (job_fired and mobile_fired)
        or (reward_fired and re.search(
            r"(?:\b(?:send|share|upload|submit|pay|bhejo|bhej)\b[^.!?\n]{0,45}\b(?:aadhaar|aadhar|adhar|bank\s+details?|documents?|id\s+proof|fee|registration|processing)\b|(?:भेजें|साझा)[^.!?\n]{0,45}(?:आधार|कागज़ात|बैंक\s+विवरण))",
            low,
        ))
        or (cred_soft_or_hard and contact_link)
    )

def _model_probability(url: str) -> float | None:
    model = load_shadow_model()
    if model is None:
        return None
    features = extract_url_features(url)
    if features is None:
        return None
    try:
        import numpy as np
        vector = np.array([[features[name] for name in URL_FEATURE_NAMES]], dtype=np.float32)
        probability = float(model.predict(vector)[0])
        if not 0.0 <= probability <= 1.0:
            return None
        return probability
    except Exception:
        return None

def detect_with_ml(raw_text: str) -> dict[str, Any]:
    result = detect_local(raw_text)
    text = str(raw_text or "")[:4000]
    if not ML_ENABLED:
        return result
    if hard_signal_detected(text):
        return result
    urls = extract_urls(text)
    if not urls:
        return result
    if any(real_domain_of(url_host(url)) for url in urls):
        return result

    probabilities = [value for url in urls if (value := _model_probability(url)) is not None]
    if not probabilities:
        return result
    probability = max(probabilities)
    contribution = 0
    if probability >= ML_THRESHOLD:
        contribution = min(
            ML_POSITIVE_MAX,
            max(0, round((probability - ML_THRESHOLD) / (1.0 - ML_THRESHOLD) * ML_POSITIVE_MAX)),
        )
    elif result["verdict"] == "suspicious":
        contribution = -min(
            ML_NEGATIVE_MAX,
            max(0, round((ML_THRESHOLD - probability) / ML_THRESHOLD * ML_NEGATIVE_MAX)),
        )
    if contribution == 0:
        return result

    score = max(3, min(100, round(result["score"] + contribution)))
    if hard_signal_detected(text):
        score = max(score, 70)
    verdict = "scam" if score > 65 else "suspicious" if score >= 30 else "safe"
    model_reason = {
        "icon": "link",
        "text_en": "A computer model that studies web addresses also found this link suspicious.",
        "text_hi": "वेब पते की जानकारी पढ़ने वाला कंप्यूटर मॉडल इस लिंक को संदिग्ध मानता है.",
    }
    if contribution < 0:
        model_reason = {
            "icon": "link",
            "text_en": "A computer model that studies web addresses found this link less suspicious.",
            "text_hi": "वेब पते की जानकारी पढ़ने वाला कंप्यूटर मॉडल इस लिंक को कम संदिग्ध मानता है.",
        }
    reasons = list(result["reasons"])
    limit = 4 if verdict == "scam" else 3
    reasons = reasons[:limit]
    reasons.append(model_reason)
    result = dict(result)
    result["score"] = score
    result["verdict"] = verdict
    result["reasons"] = reasons
    return result

class RequestGuardMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.request_times: dict[str, list[float]] = {}

    async def dispatch(self, request: Request, call_next):
        if request.headers.get("content-length"):
            try:
                if int(request.headers["content-length"]) > MAX_REQUEST_BYTES:
                    return JSONResponse(status_code=413, content={"detail": "Request too large"})
            except ValueError:
                pass
        if request.url.path == "/analyze" and request.method == "POST":
            import time
            forwarded = request.headers.get("x-forwarded-for", "")
            client = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
            now = time.monotonic()
            window = [stamp for stamp in self.request_times.get(client, []) if now - stamp < 60]
            if len(window) >= RATE_LIMIT_PER_MINUTE:
                return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})
            window.append(now)
            self.request_times[client] = window
        return await call_next(request)

app = FastAPI(title="ScamShield Backend", version="1.0")
cors_origins = [origin.strip() for origin in ALLOWED_ORIGINS.split(",") if origin.strip()]
app.add_middleware(RequestGuardMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|chrome-extension://.*",
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "app": APP_NAME}

@app.post("/analyze")
def analyze(request: AnalyzeRequest) -> dict[str, Any]:
    return detect_with_ml(request.text)
