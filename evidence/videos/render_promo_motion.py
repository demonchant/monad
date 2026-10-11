from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parents[1]
W, H, FPS, DURATION = 1280, 720, 24, 30
BG = (245, 246, 238)
INK = (23, 37, 34)
MUTED = (102, 119, 109)
GREEN = (66, 112, 70)
LIME = (178, 224, 112)
PALE = (229, 235, 220)
WHITE = (255, 255, 250)
FONT_REG = r"C:\Windows\Fonts\segoeui.ttf"
FONT_BOLD = r"C:\Windows\Fonts\seguisb.ttf"

def font(size: int, bold: bool = False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size)

def ease(t: float) -> float:
    t = max(0, min(1, t))
    return 1 - (1 - t) ** 3

def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def background():
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    for x in range(26, W, 36):
        for y in range(25, H, 36):
            d.ellipse((x, y, x + 2, y + 2), fill=(223, 229, 216))
    d.ellipse((900, -370, 1530, 260), fill=(232, 240, 218))
    d.ellipse((-380, 515, 240, 1145), fill=(232, 239, 225))
    return im

BASE = background()
LOGO = Image.open(PROJECT / "public" / "order-steward-logo.png").convert("RGBA")
LOGO.thumbnail((260, 72), Image.Resampling.LANCZOS)
APP = Image.open(ROOT / "promo-app-frame.png").convert("RGB")
APP = APP.resize((800, 479), Image.Resampling.LANCZOS)

def brand(im, draw, t):
    mark = LOGO.copy()
    alpha = int(255 * ease(t / 0.4))
    mark.putalpha(mark.getchannel("A").point(lambda p: p * alpha // 255))
    im.alpha_composite(mark, (54, 35))
    draw.text((W - 54, 52), "MONAD  /  KURU", font=font(17, True), fill=MUTED, anchor="ra")

def label(draw, x, y, text, fill=GREEN):
    rounded(draw, (x, y, x + 215, y + 39), 19, fill)
    draw.text((x + 16, y + 9), text.upper(), font=font(15, True), fill=WHITE)

def frame(t: float) -> Image.Image:
    im = BASE.copy().convert("RGBA")
    d = ImageDraw.Draw(im)
    local = t % DURATION
    scene = min(5, int(local // 5))
    st = local - scene * 5
    brand(im, d, st)

    if scene == 0:
        # Kinetic opening: the line draws across the product lifecycle.
        p = ease(st / 1.8)
        y = 250 + int((1 - ease(st / 0.55)) * 34)
        d.text((68, y), "A LIMIT ORDER IS", font=font(57, True), fill=INK)
        d.text((68, y + 72), "MORE THAN A CLICK.", font=font(57, True), fill=GREEN)
        x0, x1, yy = 70, 1140, 510
        d.line((x0, yy, x0 + (x1 - x0) * p, yy), fill=GREEN, width=5)
        for i, name in enumerate(("INTENT", "WALLET", "KURU BOOK", "ON-CHAIN STATE")):
            x = (x0, 415, 760, x1)[i]
            active = p >= i / 3
            d.ellipse((x - 11, yy - 11, x + 11, yy + 11), fill=LIME if active else PALE, outline=GREEN, width=2)
            d.text((x, yy + 31), name, font=font(15, True), fill=INK if active else MUTED, anchor="ma")
        d.text((70, 623), "Every step should have follow-through.", font=font(24), fill=MUTED)

    elif scene == 1:
        d.text((68, 150), "ONE CLEAR TRADING FLOW", font=font(18, True), fill=GREEN)
        d.text((68, 190), "From market to order.", font=font(48, True), fill=INK)
        cards = [(70, "01", "MARKET", "Explore Kuru spot markets"), (460, "02", "MARGIN", "See wallet + Kuru balances"), (850, "03", "ORDER", "Review before you sign")]
        p = ease(st / 1.3)
        for i, (x, num, title, body) in enumerate(cards):
            yy = 330 + int((1 - ease(max(0, st - i * .25) / .5)) * 28)
            rounded(d, (x, yy, x + 335, yy + 215), 22, WHITE, PALE, 2)
            d.text((x + 24, yy + 22), num, font=font(17, True), fill=GREEN)
            d.text((x + 24, yy + 76), title, font=font(35, True), fill=INK)
            d.text((x + 24, yy + 142), body, font=font(17), fill=MUTED)
            if i < 2:
                x1 = x + 348
                d.line((x1, yy + 107, x1 + 33 * p, yy + 107), fill=GREEN, width=4)
                d.polygon([(x1 + 33 * p, yy + 99), (x1 + 45 * p, yy + 107), (x1 + 33 * p, yy + 115)], fill=GREEN)
        d.text((70, 610), "Live market context. Clear balances. A deliberate wallet signature.", font=font(21), fill=MUTED)

    elif scene == 2:
        d.text((68, 112), "YOUR TRADING DESK", font=font(18, True), fill=GREEN)
        d.text((68, 147), "The details, together.", font=font(43, True), fill=INK)
        # Floating app frame uses an actual project screen, with the browser extension cropped out.
        shadow = Image.new("RGBA", (838, 497), (0, 0, 0, 0))
        sd = ImageDraw.Draw(shadow)
        rounded(sd, (9, 9, 829, 486), 22, (32, 48, 42, 55))
        shadow = shadow.filter(ImageFilter.GaussianBlur(15))
        im.alpha_composite(shadow, (210, 208))
        rounded(d, (216, 203, 1054, 700), 18, WHITE, (208, 218, 204), 2)
        app_rgba = APP.convert("RGBA")
        mask = Image.new("L", APP.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, 799, 478), radius=13, fill=255)
        im.paste(app_rgba, (235, 219), mask)
        label(d, 68, 615, "LIVE KURU MARKET", GREEN)
        rounded(d, (798, 640, 1080, 680), 20, (236, 245, 225), (199, 218, 186), 1)
        d.text((939, 652), "MONAD MAINNET  ·  143", font=font(13, True), fill=GREEN, anchor="ma")

    elif scene == 3:
        d.text((68, 150), "REVIEW. SIGN. TRACK.", font=font(18, True), fill=GREEN)
        d.text((68, 190), "Order state you can follow.", font=font(43, True), fill=INK)
        nodes = [(90, "WALLET", "You approve"), (385, "RECEIPT", "Kuru order event"), (680, "CONTRACT", "State read-back"), (975, "LEDGER", "Reload + reconcile")]
        progress = ease(st / 2.0)
        for i, (x, title, desc) in enumerate(nodes):
            x = x + int((1 - ease(max(0, st - i * .28) / .4)) * 24)
            rounded(d, (x, 340, x + 226, 480), 20, WHITE, (206, 219, 196), 2)
            d.ellipse((x + 20, 363, x + 54, 397), fill=LIME if progress >= i / 3 else PALE, outline=GREEN, width=2)
            d.text((x + 72, 364), title, font=font(21, True), fill=INK)
            d.text((x + 20, 425), desc, font=font(16), fill=MUTED)
            if i < 3:
                endx = x + 238
                length = 48 * max(0, min(1, progress * 3 - i))
                d.line((endx, 410, endx + length, 410), fill=GREEN, width=4)
        d.text((90, 560), "Fund  →  Place  →  Read back  →  Reload  →  Cancel", font=font(22, True), fill=GREEN)
        d.text((90, 606), "Verified end to end on Monad. Every transaction is signed by the trader.", font=font(19), fill=MUTED)

    elif scene == 4:
        d.text((68, 155), "CONTROL STAYS WITH YOU", font=font(18, True), fill=GREEN)
        d.text((68, 200), "Your wallet. Your order.", font=font(46, True), fill=INK)
        d.text((68, 276), "Order Steward keeps the lifecycle clear,", font=font(25), fill=MUTED)
        d.text((68, 316), "while every action stays yours to approve.", font=font(25), fill=MUTED)
        # Circular order lifecycle motif.
        cx, cy = 900, 425
        d.arc((cx - 205, cy - 205, cx + 205, cy + 205), start=192, end=510, fill=(196, 214, 186), width=7)
        orbit = (st / 5) * 2 * math.pi
        px, py = cx + int(math.cos(orbit) * 205), cy + int(math.sin(orbit) * 205)
        for a in range(0, 360, 90):
            x = cx + int(math.cos(math.radians(a)) * 205)
            y = cy + int(math.sin(math.radians(a)) * 205)
            d.ellipse((x - 12, y - 12, x + 12, y + 12), fill=LIME, outline=GREEN, width=2)
        d.ellipse((px - 17, py - 17, px + 17, py + 17), fill=GREEN)
        rounded(d, (cx - 145, cy - 56, cx + 145, cy + 56), 24, WHITE, PALE, 2)
        d.text((cx, cy - 20), "POST-ONLY LIMIT ORDER", font=font(20, True), fill=INK, anchor="mm")
        d.text((cx, cy + 18), "CONNECTED WALLET SIGNATURE", font=font(13, True), fill=GREEN, anchor="mm")

    else:
        # Strong branded closing with animated accent sweep.
        logo = LOGO.copy()
        logo.thumbnail((385, 110), Image.Resampling.LANCZOS)
        im.alpha_composite(logo, (72, 190))
        d.text((72, 340), "Trade with follow-through.", font=font(40, True), fill=INK)
        d.text((74, 408), "Kuru spot trading on Monad.", font=font(24), fill=MUTED)
        rounded(d, (72, 502, 440, 566), 32, GREEN)
        d.text((256, 535), "OPEN THE SPOT DESK", font=font(17, True), fill=WHITE, anchor="mm")
        d.text((72, 603), "demonchant.github.io/monad", font=font(19, True), fill=GREEN)
        # Animated chart-like slash on the right.
        d.line((660, 590, 820, 500, 925, 540, 1110, 310), fill=(181, 211, 155), width=9, joint="curve")
        for x, y in ((660, 590), (820, 500), (925, 540), (1110, 310)):
            d.ellipse((x - 12, y - 12, x + 12, y + 12), fill=LIME, outline=GREEN, width=3)

    # Small progress indicator makes this feel like a designed product spot.
    seg = W / 6
    for i in range(6):
        x0 = i * seg + 4
        amt = max(0, min(1, (local - i * 5) / 5))
        d.rectangle((x0, H - 6, x0 + seg - 8, H - 2), fill=(218, 225, 210))
        if i < scene:
            d.rectangle((x0, H - 6, x0 + seg - 8, H - 2), fill=GREEN)
        elif i == scene:
            d.rectangle((x0, H - 6, x0 + (seg - 8) * amt, H - 2), fill=GREEN)
    return im.convert("RGB")

def main():
    frames = ROOT / "promo-frames"
    frames.mkdir(exist_ok=True)
    for n in range(FPS * DURATION):
        frame(n / FPS).save(frames / f"frame{n:05d}.png", optimize=False)
    print(frames)

if __name__ == "__main__":
    main()
