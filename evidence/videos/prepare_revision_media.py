from __future__ import annotations

import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parents[1]
SIZE = (1920, 1080)
BG, INK, MUTED, GREEN = "#f5f6ee", "#172522", "#66776d", "#427046"
FONT = r"C:\Windows\Fonts\segoeui.ttf"
BOLD = r"C:\Windows\Fonts\seguisb.ttf"

def card(name: str, kicker: str, title: str, body: str, footer: str) -> None:
    im = Image.new("RGB", SIZE, BG)
    d = ImageDraw.Draw(im)
    d.ellipse((1500, -220, 2200, 480), outline="#dce5d6", width=4)
    d.ellipse((-350, 760, 250, 1360), outline="#dce5d6", width=4)
    logo = Image.open(PROJECT / "public" / "order-steward-logo.png").convert("RGBA")
    logo.thumbnail((470, 100), Image.Resampling.LANCZOS)
    im.paste(logo, (140, 85), logo)
    d.line((140, 235, 214, 235), fill=GREEN, width=6)
    d.text((140, 270), kicker.upper(), font=ImageFont.truetype(BOLD, 24), fill=MUTED)
    d.multiline_text((136, 355), title, font=ImageFont.truetype(BOLD, 78), fill=INK, spacing=10)
    d.text((142, 600), body, font=ImageFont.truetype(FONT, 34), fill=MUTED)
    d.line((140, 935, 1780, 935), fill="#dce3d9", width=2)
    d.text((140, 972), footer, font=ImageFont.truetype(FONT, 24), fill=INK)
    d.text((1575, 972), "MONAD  ·  KURU", font=ImageFont.truetype(BOLD, 19), fill=MUTED)
    im.save(HERE / f"{name}.png")

def write_subs(stem: str, duration: float, offset: float, blocks: list[str]) -> None:
    weights = [max(1, len(s.split())) for s in blocks]
    pause_total = min(1.6, 0.22 * (len(blocks) - 1))
    speaking = duration - pause_total
    total = sum(weights)
    cursor = offset
    rows = []
    for i, (sentence, weight) in enumerate(zip(blocks, weights)):
        part = speaking * weight / total
        start, end = cursor, cursor + part
        rows.append(f"{i + 1}\n{stamp(start)} --> {stamp(end)}\n{sentence}\n")
        cursor = end + (pause_total / max(1, len(blocks) - 1) if i < len(blocks) - 1 else 0)
    content = "\n".join(rows)
    (HERE / f"{stem}.srt").write_text(content, encoding="utf-8")
    vtt = "WEBVTT\n\n" + re.sub(r"(\d{2}):(\d{2}):(\d{2}),(\d{3})", r"\1:\2:\3.\4", content)
    vtt = re.sub(r"^\d+\n", "", vtt, flags=re.M)
    (HERE / f"{stem}.vtt").write_text(vtt, encoding="utf-8")

def stamp(seconds: float) -> str:
    milliseconds = round(seconds * 1000)
    h, milliseconds = divmod(milliseconds, 3_600_000)
    m, milliseconds = divmod(milliseconds, 60_000)
    s, ms = divmod(milliseconds, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"

card("OrderSteward_Pitch-title", "Monad · Kuru · Product Pitch", "Trade with\nfollow-through.", "One clear lifecycle for every spot order.", "demonchant.github.io/monad")
card("OrderSteward_Pitch_end", "Order Steward", "Your order.\nYour signature.", "A clearer path from intent to on-chain outcome.", "demonchant.github.io/monad")
card("OrderSteward_Technical_Demo-title", "Product walkthrough · Technical Demo", "The complete\norder lifecycle.", "Kuru spot trading on Monad.", "demonchant.github.io/monad")
card("OrderSteward_Technical_Demo_end", "Verified on Monad", "Fund. Place.\nRead back. Cancel.", "Verified end to end. Signed by the trader.", "demonchant.github.io/monad")

pitch = [
    "On Monad, placing a spot order is only the beginning.",
    "Traders need to fund margin, sign with confidence, and know what happened to an order after it leaves the form.",
    "Order Steward brings that journey into one Kuru trading desk.",
    "Browse the market. See wallet funds and Kuru margin side by side.",
    "Review a post-only limit order, sign it in your wallet, and follow its receipt and on-chain state.",
    "From placing an order to checking its status or cancelling it, the workflow has been verified end to end.",
    "Your wallet stays in your hands. Every action is yours to approve.",
    "Order Steward. A clearer path from trade intent to on-chain outcome, built for Monad.",
]
technical = [
    "Welcome to Order Steward, a Kuru spot trading desk on Monad.",
    "I open the spot desk and select a live market. The order book and market details load directly into the trading view.",
    "The account panel keeps wallet balances and Kuru margin balances separate.",
    "When more margin is needed, I review the amount, approve the token, deposit, and confirm the updated balance.",
    "For this MON-USDC order, I choose a side, enter a limit price and size, and review the post-only order before signing.",
    "The connected wallet authorizes the transaction.",
    "Order Steward reads the mined receipt, matches the Kuru order event, and checks the order state on chain.",
    "The order ledger keeps the trade intent available after refresh and reconciles it against the contract.",
    "To cancel, I review the order and sign the cancellation in my wallet.",
    "The cancellation event and updated order state confirm the result.",
    "The complete order lifecycle has been verified: fund, place, read back, reload, and cancel.",
    "Order Steward keeps the workflow clear while the trader keeps control of every signature.",
]
promo = [
    "A limit order is more than a click.",
    "Order Steward brings Kuru spot trading on Monad into one clear flow:",
    "explore the market, see wallet and margin balances, review your order, sign with your wallet, and track the on-chain result.",
    "Place it. Follow it. Cancel with confidence.",
    "Your keys stay yours.",
    "Order Steward: trade with follow-through.",
]

write_subs("pitch-revised", 45.952, 3, pitch)
write_subs("technical-demo-revised", 73.832, 3, technical)
write_subs("promo-revised", 26.281, 0, promo)
print("Revised title cards and caption tracks generated.")
