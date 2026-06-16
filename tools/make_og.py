"""Generate a 1200x630 Open Graph / social share image in the brand style."""
from PIL import Image, ImageDraw, ImageFont
import os

IMG = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "assets", "img"))
W, H = 1200, 630
BG = (10, 10, 11)


def font(names, size):
    for n in names:
        for base in ("C:/Windows/Fonts/", ""):
            try:
                return ImageFont.truetype(base + n, size)
            except Exception:
                continue
    return ImageFont.load_default()


F_NAME = font(["segoeuisb.ttf", "seguisb.ttf", "arialbd.ttf"], 70)
F_TAG = font(["segoeuil.ttf", "segoeui.ttf", "arial.ttf"], 33)
F_LABEL = font(["segoeui.ttf", "arial.ttf"], 21)


def tracked(draw, xy, text, fnt, fill, spacing):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        w = draw.textbbox((0, 0), ch, font=fnt)[2]
        x += w + spacing
    return x


# base
img = Image.new("RGB", (W, H), BG)

# headshot, grayscale, cover right
face = Image.open(os.path.join(IMG, "face-wide.png")).convert("L").convert("RGB")
ratio = max(W / face.width, H / face.height)
face = face.resize((int(face.width * ratio), int(face.height * ratio)), Image.LANCZOS)
fx = W - face.width  # anchor right
fy = (H - face.height) // 2
img.paste(face, (fx, fy))

# darken overall a touch
img = Image.eval(img, lambda v: int(v * 0.86))

# left-to-right scrim so text area is solid
scrim = Image.new("L", (W, H), 0)
sp = scrim.load()
for x in range(W):
    f = x / W
    if f < 0.42:
        a = 255
    elif f < 0.80:
        a = int(255 * (1 - (f - 0.42) / 0.38))
    else:
        a = 0
    for y in range(H):
        sp[x, y] = a
black = Image.new("RGB", (W, H), BG)
img = Image.composite(black, img, scrim)

# bottom gradient
bscrim = Image.new("L", (W, H), 0)
bp = bscrim.load()
for y in range(H):
    f = y / H
    a = 0 if f < 0.62 else int(255 * (f - 0.62) / 0.38)
    for x in range(W):
        bp[x, y] = a
img = Image.composite(black, img, bscrim)

# faint skyline along the very bottom-left
grid = Image.open(os.path.join(IMG, "grid-white.png")).convert("RGBA")
gw = 620
grid = grid.resize((gw, int(grid.height * gw / grid.width)), Image.LANCZOS)
grid.putalpha(grid.split()[3].point(lambda v: int(v * 0.18)))
img = img.convert("RGBA")
img.alpha_composite(grid, (64, H - grid.height - 28))

draw = ImageDraw.Draw(img)

MARGIN = 72
# mark
mark = Image.open(os.path.join(IMG, "mark-white.png")).convert("RGBA")
mh = 60
mark = mark.resize((int(mark.width * mh / mark.height), mh), Image.LANCZOS)
img.alpha_composite(mark, (MARGIN, 150))

# eyebrow label
tracked(draw, (MARGIN + mark.width + 22, 150 + mh // 2 - 12),
        "FOUNDER & CEO", F_LABEL, (166, 166, 168), 3)

# name
draw.text((MARGIN, 250), "Caleb Wieman", font=F_NAME, fill=(244, 244, 242))

# tagline
draw.text((MARGIN, 348), "Modern AI systems —", font=F_TAG, fill=(244, 244, 242))
draw.text((MARGIN, 392), "mapped, built, and run.", font=F_TAG, fill=(166, 166, 168))

# bottom brand line
tracked(draw, (MARGIN, 540), "WIEMAN SYSTEMS", F_LABEL, (110, 110, 114), 6)

# hairline frame
draw.rectangle([24, 24, W - 25, H - 25], outline=(255, 255, 255), width=1)
# re-darken the frame to subtle
frame_overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
fo = ImageDraw.Draw(frame_overlay)
fo.rectangle([24, 24, W - 25, H - 25], outline=(255, 255, 255, 28), width=1)

img = img.convert("RGB")
img.save(os.path.join(IMG, "og-image.png"))
print("wrote og-image.png", img.size, f"{os.path.getsize(os.path.join(IMG,'og-image.png'))/1024:.0f}KB")
