"""Builds SHADOW-3.pptx by reusing the slide code in make_deck.py with python-pptx drawing primitives."""
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Emu, Pt

src = (Path(__file__).parent / "make_deck.py").read_text().splitlines()
head = [l for l in src[:30] if "pymupdf" not in l]
body = src[71:85] + src[91:377]  # skips make_deck.py's own stroke()

prs = Presentation()
prs.slide_width, prs.slide_height = Pt(960), Pt(540)

ALIGN = {0: PP_ALIGN.LEFT, 1: PP_ALIGN.CENTER, 2: PP_ALIGN.RIGHT}


def rgb(c):
    return RGBColor(*[round(v * 255) for v in c])


def new_page(bg=None):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = rgb(bg or (0.98, 0.98, 0.97))
    return s


def _rounded(p, x, y, w, h, radius, fill, line=None, lw=0.8):
    sh = p.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Pt(x), Pt(y), Pt(w), Pt(h))
    sh.adjustments[0] = radius
    sh.fill.solid()
    sh.fill.fore_color.rgb = rgb(fill)
    if line:
        sh.line.color.rgb = rgb(line)
        sh.line.width = Pt(lw)
    else:
        sh.line.fill.background()
    sh.shadow.inherit = False
    return sh


def text(p, x, y, w, h, s, size=14, bold=False, color=(0.13, 0.13, 0.13), align=0, lh=1.25):
    tb = p.shapes.add_textbox(Pt(x), Pt(y), Pt(w), Pt(h + size * 2))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.TOP
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    for i, line in enumerate(s.split("\n")):
        para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        para.alignment = ALIGN[align]
        para.line_spacing = lh * 0.9
        r = para.add_run()
        r.text = line
        r.font.name = "Arial"
        r.font.size = Pt(size)
        r.font.bold = bold
        r.font.color.rgb = rgb(color)


def card(p, x, y, w, h, fill=(1, 1, 1), outline=(0.88, 0.88, 0.88), elev=2):
    for i in range(elev, 0, -1):
        _rounded(p, x + 0.5, y + i * 1.5, w, h, 0.06, (0.93, 0.93, 0.92))
    _rounded(p, x, y, w, h, 0.06, fill, outline)


def chip(p, x, y, w, label, color):
    _rounded(p, x, y, w, 20, 0.5, PALE[color])
    text(p, x, y + 4.5, w, 14, label, 9, True, color, 1)


def stroke(p, pts, color=(0.13, 0.13, 0.13), width=1.8, fill=None, close=False):
    e = [(round(x * 12700), round(y * 12700)) for x, y in pts]
    fb = p.shapes.build_freeform(e[0][0], e[0][1], scale=1.0)
    fb.add_line_segments(e[1:], close=close)
    sh = fb.convert_to_shape()
    if fill:
        sh.fill.solid()
        sh.fill.fore_color.rgb = rgb(fill)
    else:
        sh.fill.background()
    if color:
        sh.line.color.rgb = rgb(color)
        sh.line.width = Pt(width)
    else:
        sh.line.fill.background()
    sh.shadow.inherit = False


exec("\n".join(head + body))
prs.save("SHADOW-3.pptx")
print("saved")
