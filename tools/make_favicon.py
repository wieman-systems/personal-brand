"""
Favicon: white simple mark on a black CIRCLE, zoomed to match wiemansystems.com
(mark fills ~62% of the icon height). Browser/tab icons use a transparent-corner
circle; the apple-touch icon uses a solid black square (iOS rounds it).
Run from repo root:  python tools/make_favicon.py
"""
from PIL import Image, ImageDraw
import os

IMG = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "assets", "img"))
SS = 4                 # supersample for clean anti-aliased edges
MARK_H = 0.70          # mark height as a fraction of the icon (a touch larger than wiemansystems.com)

# Crop to the SOLID mark only. The source has faint sub-alpha stray pixels in the
# lower-left that inflate a naive getbbox(), which would shove the real mark
# up-and-right and shrink it. Threshold the alpha first so we center the true mark.
_mk = Image.open(os.path.join(IMG, "mark-white.png")).convert("RGBA")
_solid = _mk.split()[3].point(lambda v: 255 if v > 60 else 0)
MARK = _mk.crop(_solid.getbbox())


def _placed_mark(s):
    h = int(MARK_H * s)
    w = max(1, round(MARK.width * h / MARK.height))
    return MARK.resize((w, h), Image.LANCZOS), w, h


def circle_icon(size):
    s = size * SS
    out = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, s - 1, s - 1], fill=255)
    disc = Image.new("RGBA", (s, s), (10, 10, 11, 255))  # brand near-black
    out = Image.composite(disc, out, mask)
    m, w, h = _placed_mark(s)
    out.alpha_composite(m, ((s - w) // 2, (s - h) // 2))
    return out.resize((size, size), Image.LANCZOS)


def square_icon(size):
    s = size * SS
    out = Image.new("RGBA", (s, s), (10, 10, 11, 255))
    m, w, h = _placed_mark(s)
    out.alpha_composite(m, ((s - w) // 2, (s - h) // 2))
    return out.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    circle_icon(32).save(os.path.join(IMG, "favicon-32.png"))
    circle_icon(512).save(os.path.join(IMG, "favicon-512.png"))
    square_icon(180).save(os.path.join(IMG, "favicon-180.png"))   # apple-touch
    Image.open(os.path.join(IMG, "favicon-512.png")).save(
        os.path.join(IMG, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48), (64, 64)]
    )
    print("favicons rebuilt:", "mark bbox", MARK.size, "@", MARK_H)
