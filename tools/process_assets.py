"""
Asset pipeline for the personal brand page.
Generates dark-theme (white) logo variants, optimized WebP headshots,
a white-on-transparent grid texture, and a branded favicon set.
Run from repo root:  python tools/process_assets.py
"""
from PIL import Image, ImageDraw
import os

IMG = os.path.join(os.path.dirname(__file__), "..", "assets", "img")
IMG = os.path.abspath(IMG)


def whiten_keep_alpha(src, dst):
    """Black-on-transparent artwork -> white-on-transparent, anti-aliasing preserved."""
    im = Image.open(os.path.join(IMG, src)).convert("RGBA")
    r, g, b, a = im.split()
    white = Image.new("L", im.size, 255)
    out = Image.merge("RGBA", (white, white, white, a))
    out.save(os.path.join(IMG, dst))
    print("  ->", dst, out.size)


def whiten_from_white_bg(src, dst):
    """Black-on-white art -> white-on-transparent (alpha = darkness)."""
    im = Image.open(os.path.join(IMG, src)).convert("RGB")
    r, g, b = im.split()
    # luminance
    lum = Image.eval(r, lambda x: x)  # placeholder, recompute below
    px = im.load()
    w, h = im.size
    alpha = Image.new("L", im.size, 0)
    apx = alpha.load()
    for y in range(h):
        for x in range(w):
            rr, gg, bb = px[x, y]
            l = (0.299 * rr + 0.587 * gg + 0.114 * bb)
            apx[x, y] = int(255 - l)
    white = Image.new("L", im.size, 255)
    out = Image.merge("RGBA", (white, white, white, alpha))
    out.save(os.path.join(IMG, dst))
    print("  ->", dst, out.size)


def to_webp(src, dst, max_w=None, quality=82):
    im = Image.open(os.path.join(IMG, src)).convert("RGB")
    if max_w and im.width > max_w:
        h = round(im.height * max_w / im.width)
        im = im.resize((max_w, h), Image.LANCZOS)
    im.save(os.path.join(IMG, dst), "WEBP", quality=quality, method=6)
    kb = os.path.getsize(os.path.join(IMG, dst)) / 1024
    print("  ->", dst, im.size, f"{kb:.0f}KB")


def make_favicon():
    """Branded favicon: white mark on a solid black tile (visible on light & dark tabs)."""
    mark = Image.open(os.path.join(IMG, "mark-white.png")).convert("RGBA")
    sizes = {"favicon-32.png": 32, "favicon-180.png": 180, "favicon-512.png": 512}
    icos = []
    for name, s in sizes.items():
        tile = Image.new("RGBA", (s, s), (0, 0, 0, 255))
        pad = int(s * 0.18)
        inner = s - 2 * pad
        m = mark.copy()
        # fit mark within inner box, preserve aspect
        ratio = min(inner / m.width, inner / m.height)
        m = m.resize((max(1, int(m.width * ratio)), max(1, int(m.height * ratio))), Image.LANCZOS)
        ox = (s - m.width) // 2
        oy = (s - m.height) // 2
        tile.alpha_composite(m, (ox, oy))
        tile.save(os.path.join(IMG, name))
        print("  ->", name, tile.size)
        if s in (32,):
            icos.append(tile)
    # multi-res .ico
    base = Image.open(os.path.join(IMG, "favicon-512.png")).convert("RGBA")
    base.save(os.path.join(IMG, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print("  -> favicon.ico")


if __name__ == "__main__":
    print("Logos -> white:")
    whiten_keep_alpha("logo.png", "logo-white.png")
    whiten_keep_alpha("logo-mark.png", "mark-white.png")
    print("Grid texture -> white:")
    whiten_from_white_bg("grid.png", "grid-white.png")
    print("Headshots -> webp:")
    to_webp("face-pfp.jpeg", "face-pfp.webp", max_w=1100, quality=84)
    to_webp("face-pfp.jpeg", "face-pfp-sm.webp", max_w=560, quality=82)
    to_webp("face-wide.png", "face-wide.webp", max_w=1600, quality=82)
    print("Favicons:")
    make_favicon()
    print("Done.")
