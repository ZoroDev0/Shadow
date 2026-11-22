"""Builds SHADOW-3.pdf: plain solid backgrounds, Helvetica, hand-drawn diagrams, material-style cards."""
import math
import random

import pymupdf as fitz

W, H = 960, 540
OUT = "SHADOW-3.pdf"

INK = (0.13, 0.13, 0.13)
GREY = (0.38, 0.38, 0.38)
LINE = (0.88, 0.88, 0.88)
WHITE = (1, 1, 1)
BG = (0.98, 0.98, 0.97)
INDIGO = (0.247, 0.318, 0.71)
RED = (0.898, 0.224, 0.208)
AMBER = (0.98, 0.69, 0.0)
GREEN = (0.22, 0.56, 0.24)
TEAL = (0.0, 0.59, 0.53)
PALE = {
    INDIGO: (0.91, 0.92, 0.97),
    RED: (0.99, 0.91, 0.9),
    AMBER: (1.0, 0.96, 0.84),
    GREEN: (0.91, 0.96, 0.91),
    TEAL: (0.88, 0.96, 0.95),
}

FR = "/System/Library/Fonts/Supplemental/Arial.ttf"
FB = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
rnd = random.Random(7)
doc = fitz.open()


def new_page(bg=BG):
    p = doc.new_page(width=W, height=H)
    p.draw_rect(p.rect, color=None, fill=bg)
    return p


# ---------- text ----------
def text(p, x, y, w, h, s, size=14, bold=False, color=INK, align=0, lh=1.25):
    r = fitz.Rect(x, y, x + w, y + h + size * 2)
    left = p.insert_textbox(
        r, s, fontsize=size, fontname="arb" if bold else "ar",
        fontfile=FB if bold else FR, color=color, align=align, lineheight=lh,
    )
    if left < 0:
        print("OVERFLOW:", s[:40], left)


# ---------- material bits ----------
def card(p, x, y, w, h, fill=WHITE, outline=LINE, elev=2):
    for i in range(elev, 0, -1):
        sh = p.new_shape()
        sh.draw_rect(fitz.Rect(x + 0.5, y + i * 1.5, x + w + 0.5, y + h + i * 1.5), radius=0.06)
        sh.finish(color=None, fill=(0.8, 0.8, 0.8), fill_opacity=0.18)
        sh.commit()
    sh = p.new_shape()
    sh.draw_rect(fitz.Rect(x, y, x + w, y + h), radius=0.06)
    sh.finish(color=outline, fill=fill, width=0.8)
    sh.commit()


def chip(p, x, y, w, label, color):
    sh = p.new_shape()
    sh.draw_rect(fitz.Rect(x, y, x + w, y + 20), radius=0.5)
    sh.finish(color=None, fill=PALE[color])
    sh.commit()
    text(p, x, y + 4.5, w, 14, label, 9, True, color, 1)


def title(p, tag, head, color=INDIGO):
    chip(p, 48, 34, len(tag) * 7 + 24, tag, color)
    text(p, 48, 64, 860, 80, head, 30, True, INK, lh=1.1)


def pageno(p, n):
    text(p, W - 70, H - 32, 30, 14, str(n), 10, False, GREY, 2)


# ---------- hand drawn ----------
def wob(pts, amt=1.6):
    return [(x + rnd.uniform(-amt, amt), y + rnd.uniform(-amt, amt)) for x, y in pts]


def stroke(p, pts, color=INK, width=1.8, fill=None, close=False):
    sh = p.new_shape()
    sh.draw_polyline(pts)
    sh.finish(color=color, fill=fill, width=width, closePath=close, lineCap=1, lineJoin=1)
    sh.commit()


def seg(a, b, n=None, amt=1.2):
    d = math.dist(a, b)
    n = n or max(2, int(d / 18))
    return [
        (a[0] + (b[0] - a[0]) * t / n + (rnd.uniform(-amt, amt) if 0 < t < n else 0),
         a[1] + (b[1] - a[1]) * t / n + (rnd.uniform(-amt, amt) if 0 < t < n else 0))
        for t in range(n + 1)
    ]


def hline(p, a, b, color=INK, width=1.8):
    stroke(p, seg(a, b), color, width)


def sbox(p, x, y, w, h, color=INK, fill=None, width=1.8, tint=True):
    """sketchy rectangle: soft fill, then two slightly-off outlines"""
    if fill:
        r = [(x + 2, y + 2), (x + w - 2, y + 2), (x + w - 2, y + h - 2), (x + 2, y + h - 2)]
        stroke(p, wob(r, 1.5), None, 0, fill, True)
    for _ in range(2):
        o = rnd.uniform(-1.5, 1.5)
        c = [(x + o, y + o), (x + w + o * 1.5, y - o), (x + w - o, y + h + o), (x - o, y + h - o), (x + o + 1, y + o - 2)]
        pts = []
        for a, b in zip(c, c[1:]):
            pts += seg(a, b, amt=1.0)[:-1]
        pts.append(c[-1])
        stroke(p, pts, color, width)


def sarrow(p, a, b, color=INK, width=1.9, curve=0):
    if curve:
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1
        cx, cy = mx - dy / L * curve, my + dx / L * curve
        pts = []
        for i in range(0, 17):
            t = i / 16
            pts.append(((1 - t) ** 2 * a[0] + 2 * (1 - t) * t * cx + t * t * b[0],
                        (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * cy + t * t * b[1]))
        pts = wob(pts, 0.5)
        pts[0], pts[-1] = a, b
        ang = math.atan2(b[1] - pts[-3][1], b[0] - pts[-3][0])
    else:
        pts = seg(a, b)
        ang = math.atan2(b[1] - a[1], b[0] - a[0])
    stroke(p, pts, color, width)
    for s in (0.5, -0.5):
        e = (b[0] - 12 * math.cos(ang + s) + rnd.uniform(-1, 1), b[1] - 12 * math.sin(ang + s) + rnd.uniform(-1, 1))
        stroke(p, [b, e], color, width)


def scircle(p, cx, cy, r, color=INK, fill=None, width=1.8):
    pts = []
    for i in range(0, 38):
        a = i / 36 * 2 * math.pi + 0.1
        rr = r + rnd.uniform(-1, 1) + i * 0.03
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    if fill:
        stroke(p, pts, None, 0, fill, True)
    stroke(p, pts, color, width)


def underline(p, x, y, w, color=AMBER):
    stroke(p, [(x, y), (x + w * 0.3, y - 2), (x + w * 0.6, y + 1.5), (x + w, y - 1)], color, 3.2)
    stroke(p, [(x + 12, y + 5), (x + w * 0.5, y + 3), (x + w * 0.9, y + 6)], color, 2)


def shield(p, cx, cy, s, color=INDIGO, fill=None):
    pts = [(cx - s, cy - s * .8), (cx, cy - s), (cx + s, cy - s * .8), (cx + s * .9, cy + s * .2),
           (cx, cy + s * 1.1), (cx - s * .9, cy + s * .2), (cx - s, cy - s * .8)]
    full = []
    for a, b in zip(pts, pts[1:]):
        full += seg(a, b, 4, 1.2)[:-1]
    full.append(pts[-1])
    if fill:
        stroke(p, full, None, 0, fill, True)
    stroke(p, full, color, 2.4)
    stroke(p, wob([(cx - s * .4, cy), (cx - s * .1, cy + s * .35), (cx + s * .5, cy - s * .35)], 1), color, 3)


def node(p, x, y, w, h, label, color, sub=None, size=13):
    sbox(p, x, y, w, h, color, PALE[color])
    if sub:
        text(p, x + 6, y + h / 2 - size - 2, w - 12, size + 6, label, size, True, INK, 1)
        text(p, x + 8, y + h / 2 + 1, w - 16, h / 2 - 2, sub, size - 3.5, False, GREY, 1, 1.15)
    else:
        text(p, x + 6, y + h / 2 - size / 2 - 1, w - 12, size + 6, label, size, True, INK, 1)


# ================= 1 TITLE =================
p = new_page(INDIGO)
text(p, 70, 120, 600, 24, "AI web security project", 16, False, (0.85, 0.88, 1))
text(p, 66, 150, 700, 110, "SHADOW", 92, True, WHITE)
underline(p, 70, 262, 330, AMBER)
text(p, 70, 290, 560, 70, "A tool that spots dodgy websites and phishing\nbefore you click on them.", 21, False, WHITE, lh=1.3)
text(p, 70, 400, 620, 24, "See the threat. Understand the risk. Stay protected.", 14, True, (0.85, 0.88, 1))
text(p, 70, 428, 620, 20, "real-time detection  /  AI analysis  /  proactive protection", 11, False, (0.78, 0.82, 1))
shield(p, 790, 270, 85, WHITE, INDIGO)
for a, b in [((690, 150), (720, 180)), ((880, 140), (860, 175)), ((900, 370), (870, 350))]:
    stroke(p, wob([a, b], 1), AMBER, 3)

# ================= 2 PROBLEM =================
p = new_page()
title(p, "THE PROBLEM", "Bad websites hide in plain sight")
pts = [
    "Fake sites copy trusted ones and trick people into giving away their info.",
    "Dodgy URLs, fake login pages and brand new phishing domains slip past normal checks and the old blocklists.",
    "People need to be warned BEFORE they use a sketchy site, and without loads of false alarms.",
]
y = 160
for t in pts:
    scircle(p, 62, y + 8, 4, RED, RED, 1)
    text(p, 78, y, 370, 80, t, 15, False, INK, lh=1.3)
    y += 92 if len(t) > 80 else 70
# browser mockups
def browser(x, y, w, h, url, color, label, ok):
    card(p, x, y, w, h, WHITE, LINE, 3)
    sbox(p, x + 12, y + 12, w - 24, 22, GREY, (0.96, 0.96, 0.96), 1.2)
    text(p, x + 20, y + 17, w - 40, 14, url, 10, False, INK)
    sbox(p, x + 12, y + 48, w - 24, h - 90, color, PALE[color], 1.6)
    text(p, x + 12, y + 60, w - 24, 20, "Log in", 14, True, INK, 1)
    for i in range(2):
        sbox(p, x + 40, y + 88 + i * 28, w - 80, 20, GREY, WHITE, 1.1)
    text(p, x, y + h - 30, w, 18, label, 11, True, color, 1)
browser(500, 150, 190, 215, "paypal.com", GREEN, "the real one", True)
browser(730, 150, 190, 215, "paypa1-secure.xyz", RED, "the fake one", False)
sarrow(p, (700, 235), (722, 235), AMBER, 2.4)
text(p, 500, 392, 420, 20, "they look identical, only the URL is different", 13, True, INK, 1)
text(p, 500, 414, 420, 40, "so you can't just trust how a page looks", 12, False, GREY, 1)
stroke(p, wob([(560, 440), (640, 444), (730, 439), (850, 443)], 1), AMBER, 2)
pageno(p, 2)

# ================= 3 PRODUCT =================
p = new_page()
title(p, "THE PRODUCT", "One smart layer between users and web threats", TEAL)
cols = [
    ("1", "Browser extension", "Chrome extension. Watches for\nsuspicious stuff and warns or\nblocks the page live.", INDIGO),
    ("2", "AI engine", "Backend that checks the URL,\nthe page, behaviour and\nthreat intel.", TEAL),
    ("3", "Dashboard", "Website showing detections,\nwhy something was flagged,\nhistory and stats.", AMBER),
]
xs = [48, 357, 666]
for (n, h_, d, c), x in zip(cols, xs):
    card(p, x, 190, 246, 200, WHITE, LINE, 3)
    scircle(p, x + 36, 232, 18, c, PALE[c], 2)
    text(p, x + 18, 224, 36, 20, n, 16, True, INK, 1)
    text(p, x + 66, 224, 170, 20, h_, 16, True, INK)
    text(p, x + 22, 276, 205, 100, d, 13, False, GREY, lh=1.35)
sarrow(p, (298, 290), (350, 290), INK, 2.2)
sarrow(p, (607, 290), (659, 290), INK, 2.2)
text(p, 48, 430, 864, 30, "basically: extension catches it, engine decides, dashboard explains it.", 14, True, INK, 1)
pageno(p, 3)

# ================= 4 FOUR LAYERS =================
p = new_page()
title(p, "THE INTELLIGENCE MODEL", "Four layers, one risk score", INDIGO)
text(p, 48, 118, 800, 20, "SHADOW puts all the evidence together before deciding what the user sees.", 14, False, GREY)
layers = [("URL", INDIGO), ("Webpage", TEAL), ("Behaviour", AMBER), ("Threat intel", RED)]
for i, (l, c) in enumerate(layers):
    y = 165 + i * 78
    node(p, 60, y, 190, 56, l, c)
    sarrow(p, (252, y + 28), (400, 300 + (i - 1.5) * 18), INK, 1.6)
node(p, 405, 245, 190, 110, "Hybrid risk\nassessment", INDIGO, size=15)
outs = [("LOW RISK", GREEN, "all good"), ("UNCERTAIN", AMBER, "be careful"), ("HIGH RISK", RED, "block it")]
for i, (l, c, s) in enumerate(outs):
    y = 175 + i * 78
    sarrow(p, (597, 300 + (i - 1) * 20), (708, y + 28), INK, 1.6)
    sbox(p, 712, y, 200, 58, c, PALE[c])
    text(p, 712, y + 12, 200, 18, l, 14, True, c, 1)
    text(p, 712, y + 33, 200, 16, s, 11, False, GREY, 1)
pageno(p, 4)

# ================= 5 SHADOW-HF =================
p = new_page()
title(p, "SHADOW-HF", "How the engine turns signals into a risk score", TEAL)
steps = [("Extract", "pull out URL, page and\nbehaviour features", INDIGO),
         ("Analyze", "run 4 different models and\ncompare what they say", TEAL),
         ("Fuse", "mix model results with\nany threat intel we have", AMBER),
         ("Explain", "show the reasons behind\nthe final decision", GREEN)]
for i, (l, d, c) in enumerate(steps):
    x = 48 + i * 224
    node(p, x, 165, 170, 52, f"{i + 1}. {l}", c, size=15)
    text(p, x - 4, 228, 180, 50, d, 12, False, GREY, 1, 1.3)
    if i < 3:
        sarrow(p, (x + 174, 191), (x + 220, 191), INK, 2)
text(p, 262, 292, 180, 16, "models used in step 2:", 11, True, GREY)
models = ["Logistic regression", "Random forest", "Gradient boosting", "Neural network"]
for i, m in enumerate(models):
    x = 262 + (i % 2) * 190
    y = 316 + (i // 2) * 40
    sbox(p, x, y, 175, 30, TEAL, PALE[TEAL], 1.3)
    text(p, x, y + 8, 175, 14, m, 11, False, INK, 1)
sarrow(p, (350, 298), (310, 268), TEAL, 1.6, 12)
card(p, 48, 410, 864, 82, WHITE, LINE, 2)
text(p, 70, 422, 300, 16, "HOW WE'LL CHECK IT WORKS", 10, True, INDIGO)
text(p, 70, 441, 820, 44, "Ablation studies, unseen data, false-positive rate, precision, recall, F1, PR-AUC and how fast it runs (inference latency).", 13, False, INK, lh=1.3)
pageno(p, 5)

# ================= 6 BUILD PATH =================
p = new_page()
title(p, "BUILD PATH", "From research to a working product", AMBER)
stages = [("Research", "labelled phishing + legit\nURL data, cleaning,\nfeatures, baselines", INDIGO),
          ("Engine", "SHADOW-HF pipeline,\nchosen models, risk\nlevels, explainability", TEAL),
          ("Product", "FastAPI backend, Next.js\ndashboard, PostgreSQL,\nbrowser extension", AMBER),
          ("Validate", "test legit + phishing\nexamples, false positives,\nextension responses", GREEN)]
ys = [200, 250, 200, 250]
for i, (l, d, c) in enumerate(stages):
    x = 48 + i * 224
    y = ys[i]
    node(p, x, y, 180, 44, l, c, size=15)
    text(p, x, y + 54, 180, 70, d, 12, False, GREY, 1, 1.3)
    if i < 3:
        sarrow(p, (x + 184, y + 22), (x + 220, ys[i + 1] + 22), INK, 2, 6 if i % 2 == 0 else -6)
card(p, 48, 410, 864, 80, WHITE, LINE, 2)
text(p, 70, 422, 400, 16, "SHADOW CYBER RANGE", 10, True, AMBER)
text(p, 70, 441, 820, 44, "A safe test area with fake login pages, redirects, blocking and auto-generated test reports.", 13, False, INK, lh=1.3)
pageno(p, 6)

# ================= 7 BUSINESS =================
p = new_page()
title(p, "REVENUE & BUSINESS MODEL", "How SHADOW makes money", GREEN)
text(p, 48, 104, 860, 20, "Everything runs on the device, so no cloud cost per scan. Break-even floor is only Rs 3L.", 13, False, GREY)
# pricing card
card(p, 40, 140, 300, 250, WHITE, LINE, 2)
text(p, 56, 150, 260, 16, "PRICING", 10, True, GREEN)
rows = [("Individual trial (mo 1-6)", "Rs 0", "full access, web + mobile"),
        ("Personal renewal (mo 7+)", "Rs 399/yr", "66% above B2B so firms don't freeload"),
        ("Family plan (mo 7+)", "Rs 799/yr", "up to 4 people, Rs 199.75 each"),
        ("Institutional B2B", "Rs 240/seat/yr", "unis, IT, industry + admin console")]
for i, (a, b, c) in enumerate(rows):
    y = 174 + i * 53
    text(p, 56, y, 170, 14, a, 10.5, True, INK)
    text(p, 226, y, 100, 14, b, 11, True, GREEN, 2)
    text(p, 56, y + 16, 270, 28, c, 9.5, False, GREY)
    if i < 3:
        hline(p, (56, y + 43), (324, y + 43), LINE, 1)
# flywheel
text(p, 360, 140, 240, 16, "GROWTH FLYWHEEL (B2B2C)", 10, True, GREEN, 1)
cxy = [(480, 190), (400, 330), (550, 330)]
labs = [("Upfront B2B cash", "bulk contracts pay for year 1", INDIGO),
        ("Zero-CAC spillover", "staff + students use it at home for free", AMBER),
        ("WhatsApp loop", "1-tap share warning to family", TEAL)]
for (cx, cy), (l, s, c) in zip(cxy, labs):
    sbox(p, cx - 66, cy - 30, 132, 62, c, PALE[c])
    text(p, cx - 64, cy - 22, 128, 14, l, 10.5, True, INK, 1)
    text(p, cx - 60, cy - 6, 120, 36, s, 9.5, False, GREY, 1, 1.15)
sarrow(p, (530, 214), (560, 296), INK, 1.8, -14)
sarrow(p, (482, 362), (468, 362), INK, 1.8)
sarrow(p, (400, 296), (436, 224), INK, 1.8, -14)
# projections chart
card(p, 620, 140, 300, 250, WHITE, LINE, 2)
text(p, 636, 150, 260, 16, "3-YEAR ARR (Rs CRORE)", 10, True, GREEN)
bars = [("Yr 1", 0.38, "Rs 38 L"), ("Yr 2", 1.54, "Rs 1.54 Cr"), ("Yr 3", 4.80, "Rs 4.80 Cr")]
base = 340
for i, (yr, v, lab) in enumerate(bars):
    x = 655 + i * 85
    hh = max(10, v / 4.8 * 140)
    sbox(p, x, base - hh, 50, hh, GREEN, PALE[GREEN], 1.6)
    text(p, x - 15, base - hh - 17, 80, 14, lab, 10, True, INK, 1)
    text(p, x - 5, base + 6, 60, 14, yr, 10, False, GREY, 1)
hline(p, (640, base), (900, base), INK, 1.8)
text(p, 636, 362, 270, 26, "B2B seats 10k, 41.2k, 1.24L. Paid users 2,880, 11,000, 36,300", 9, False, GREY, 1, 1.2)
# bottom
card(p, 40, 408, 880, 84, GREEN, GREEN, 2)
text(p, 60, 418, 400, 16, "GROSS MARGIN", 10, True, (0.8, 0.95, 0.8))
text(p, 60, 436, 300, 40, "92% to 94.7%", 24, True, WHITE)
text(p, 60, 468, 300, 16, "Rs 6.34 Cr gross profit over 3 years", 10, False, (0.85, 0.95, 0.85))
text(p, 400, 418, 500, 16, "ZERO-LOSS BREAK-EVEN (fixed cost Rs 3,00,000 in year 1)", 10, True, (0.8, 0.95, 0.8))
text(p, 400, 436, 500, 50, "1,305 B2B seats  OR  768 paid users (4.8% conversion)\nOR  1,000 seats + 180 users", 14, True, WHITE, lh=1.3)
pageno(p, 7)

# ================= 8 CLOSING =================
p = new_page(INDIGO)
text(p, 56, 40, 700, 20, "WRAPPING UP", 11, True, (0.85, 0.88, 1))
text(p, 56, 66, 840, 120, "Make web protection smart,\nexplainable and easy to use.", 38, True, WHITE, lh=1.15)
underline(p, 58, 170, 260, AMBER)
text(p, 56, 190, 700, 20, "See the threat. Understand the risk. Stay protected.", 15, False, (0.85, 0.88, 1))
boxes = [("WHY SHADOW", "Multi-layer detection, our own hybrid setup, real-time protection, explainable results, research-based testing and a safe Cyber Range.", 56),
         ("WHAT WE'RE DELIVERING", "Browser extension, central dashboard, ML detection pipeline, SHADOW-HF prototype, threat reports, Cyber Range demo and a model comparison.", 346),
         ("TEAM ANNHILATORS", "Riya Gholap: research, SHADOW-HF architecture and integration.\nKuatubh Chamankar, Sasanka Sekhar Kundu, Bishwajeet Rout: roles to confirm.", 636)]
for h_, d, x in boxes:
    card(p, x, 260, 270, 220, WHITE, WHITE, 3)
    text(p, x + 18, 276, 240, 16, h_, 10, True, INDIGO)
    text(p, x + 18, 304, 236, 170, d, 13, False, INK, lh=1.4)
pageno(p, 8)
for pg in doc:
    pass
doc.save(OUT)
print("saved", OUT)
