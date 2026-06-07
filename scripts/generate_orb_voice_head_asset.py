#!/usr/bin/env python3
"""Generate soft luminous ORB voice head/bust base asset (PNG + WebP)."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

W, H = 480, 560
OUT_DIR = Path(__file__).resolve().parents[1] / "frontend-next/public/assets/orb"


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def rgba(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    return (r, g, b, a)


def soft_ellipse(
    base: Image.Image,
    cx: float,
    cy: float,
    rx: float,
    ry: float,
    color: tuple[int, int, int, int],
    blur: float,
) -> Image.Image:
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=color)
    if blur > 0:
        layer = layer.filter(ImageFilter.GaussianBlur(blur))
    return Image.alpha_composite(base, layer)


def build_silhouette_mask_idle() -> Image.Image:
    """Wider, rounder 3/4 head/bust alpha mask — organic fade at shoulders."""
    mask = Image.new("L", (W, H), 0)
    draw = ImageDraw.Draw(mask)

    # Wider cranium — soft ORB glass dome (3/4 left-facing)
    draw.ellipse((58, 12, 418, 258), fill=255)
    # Back of head / crown — rounder, fuller
    draw.ellipse((228, 8, 438, 228), fill=245)
    # Left face plane — gentle silhouette, not anatomical
    draw.ellipse((28, 98, 188, 288), fill=228)
    # Forehead / brow plane
    draw.ellipse((68, 48, 228, 178), fill=238)
    # Chin softness
    draw.ellipse((98, 218, 238, 322), fill=205)
    # Right ear hint — stylised glass fold, not realistic
    draw.ellipse((318, 128, 392, 218), fill=168)
    # Neck — narrow, mist-like
    draw.ellipse((172, 268, 308, 398), fill=178)
    # Shoulders — wide, dissolving base
    draw.ellipse((18, 348, 462, 508), fill=128)
    draw.ellipse((42, 388, 438, 548), fill=82)

    mask = mask.filter(ImageFilter.GaussianBlur(16))
    mask = mask.point(lambda p: min(255, int(p * 1.05)))
    return mask


def build_silhouette_mask_engaged() -> Image.Image:
    """Slightly more front-facing bust — attentive toward the adult."""
    mask = Image.new("L", (W, H), 0)
    draw = ImageDraw.Draw(mask)

    # Fuller cranium — turned a little toward viewer
    draw.ellipse((72, 10, 408, 256), fill=255)
    draw.ellipse((208, 6, 432, 224), fill=248)
    # Front face plane — centred, softer 3/4
    draw.ellipse((72, 92, 248, 296), fill=238)
    draw.ellipse((108, 46, 262, 182), fill=242)
    # Cheek volume — both sides visible
    draw.ellipse((48, 112, 168, 282), fill=212)
    draw.ellipse((248, 118, 368, 272), fill=198)
    # Chin
    draw.ellipse((118, 214, 252, 318), fill=210)
    # Ears — subtle glass folds
    draw.ellipse((42, 132, 108, 218), fill=152)
    draw.ellipse((332, 132, 398, 218), fill=152)
    # Neck
    draw.ellipse((178, 264, 302, 394), fill=182)
    # Shoulders
    draw.ellipse((22, 346, 458, 506), fill=132)
    draw.ellipse((48, 386, 432, 546), fill=86)

    mask = mask.filter(ImageFilter.GaussianBlur(16))
    mask = mask.point(lambda p: min(255, int(p * 1.05)))
    return mask


def build_color_field(face_x: float = 118.0, face_y: float = 182.0) -> Image.Image:
    """Internal luminous glass colour — cyan/blue/violet/magenta, no dark shadows."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    # Base luminous wash
    for y in range(H):
        for x in range(W):
            nx = x / W
            ny = y / H
            # Soft vertical gradient: cyan lower, violet upper, magenta crown
            cyan = (56, 189, 248)
            blue = (47, 125, 255)
            violet = (124, 92, 255)
            magenta = (236, 72, 153)
            white = (240, 249, 255)

            t_y = ny**0.85
            if t_y < 0.28:
                t = t_y / 0.28
                r = lerp(magenta[0], violet[0], t * 0.6 + 0.2)
                g = lerp(magenta[1], violet[1], t * 0.6 + 0.2)
                b = lerp(magenta[2], violet[2], t * 0.6 + 0.2)
            elif t_y < 0.55:
                t = (t_y - 0.28) / 0.27
                r = lerp(violet[0], blue[0], t)
                g = lerp(violet[1], blue[1], t)
                b = lerp(violet[2], blue[2], t)
            else:
                t = (t_y - 0.55) / 0.45
                r = lerp(blue[0], cyan[0], t * 0.85)
                g = lerp(blue[1], cyan[1], t * 0.85)
                b = lerp(blue[2], cyan[2], t * 0.85)

            # Face-plane highlight — subtle 3/4 profile read
            face_dist = math.hypot((x - face_x) / 88, (y - face_y) / 112)
            face_boost = max(0.0, 1.0 - face_dist) ** 2.4 * 0.48
            r = min(255, int(r + white[0] * face_boost))
            g = min(255, int(g + white[1] * face_boost))
            b = min(255, int(b + white[2] * face_boost))

            # Crown warmth (upper head)
            crown_dist = math.hypot((x - 268) / 120, (y - 108) / 88)
            crown_boost = max(0.0, 1.0 - crown_dist) ** 2.5 * 0.38
            r = min(255, int(r + magenta[0] * crown_boost * 0.35))
            g = min(255, int(g + magenta[1] * crown_boost * 0.2))
            b = min(255, int(b + magenta[2] * crown_boost * 0.15))

            # Centre luminosity — glass interior glow
            core_dist = math.hypot((x - 228) / 148, (y - 178) / 158)
            core_boost = max(0.0, 1.0 - core_dist) ** 1.8 * 0.28
            r = min(255, int(r + white[0] * core_boost))
            g = min(255, int(g + white[1] * core_boost))
            b = min(255, int(b + white[2] * core_boost))

            # Edge rim cyan glow (silhouette edge suggestion)
            edge_x = min(nx, 1 - nx, ny * 0.9, (1 - ny) * 1.1)
            rim = max(0.0, 0.14 - edge_x) / 0.14 * 0.22
            r = min(255, int(r + cyan[0] * rim))
            g = min(255, int(g + cyan[1] * rim))
            b = min(255, int(b + cyan[2] * rim))

            alpha = int(lerp(0, 235, min(1.0, (1.0 - core_dist * 0.55))))
            img.putpixel((x, y), (int(r), int(g), int(b), alpha))

    return img.filter(ImageFilter.GaussianBlur(6))


def add_glass_layers(base: Image.Image) -> Image.Image:
    """Layer soft colour blooms for glass depth."""
    img = base
    blooms = [
        (278, 88, 138, 112, rgba(236, 72, 153, 68), 30),
        (252, 138, 152, 122, rgba(124, 92, 255, 54), 34),
        (204, 192, 122, 132, rgba(47, 125, 255, 58), 32),
        (128, 196, 78, 108, rgba(56, 189, 248, 56), 24),
        (108, 158, 58, 88, rgba(186, 230, 253, 42), 20),
        (224, 312, 102, 82, rgba(56, 189, 248, 40), 26),
        (236, 418, 196, 68, rgba(124, 92, 255, 28), 36),
        (348, 168, 42, 58, rgba(196, 181, 253, 32), 18),
    ]
    for cx, cy, rx, ry, color, blur in blooms:
        img = soft_ellipse(img, cx, cy, rx, ry, color, blur)

    # Rim highlight — thin cyan/white edge glow
    rim = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(rim)
    draw.ellipse((66, 18, 412, 254), outline=rgba(186, 230, 253, 96), width=2)
    draw.ellipse((36, 104, 186, 282), outline=rgba(56, 189, 248, 64), width=2)
    draw.ellipse((244, 42, 430, 236), outline=rgba(196, 181, 253, 58), width=2)
    draw.ellipse((172, 276, 306, 392), outline=rgba(56, 189, 248, 36), width=1)
    rim = rim.filter(ImageFilter.GaussianBlur(6))
    img = Image.alpha_composite(img, rim)

    return img


def apply_mask(img: Image.Image, mask: Image.Image) -> Image.Image:
    rgba_img = img.convert("RGBA")
    r, g, b, a = rgba_img.split()
    combined_alpha = ImageChops.multiply(a, mask)
    return Image.merge("RGBA", (r, g, b, combined_alpha))


def fade_shoulders(img: Image.Image) -> Image.Image:
    """Organic mist fade — shoulders dissolve into light."""
    fade = Image.new("L", (W, H), 255)
    draw = ImageDraw.Draw(fade)
    for y in range(340, H):
        t = (y - 340) / (H - 340)
        fade_val = int(255 * (1.0 - t**1.35))
        draw.line([(0, y), (W, y)], fill=fade_val)

    fade = fade.filter(ImageFilter.GaussianBlur(12))
    r, g, b, a = img.split()
    a = ImageChops.multiply(a, fade)
    return Image.merge("RGBA", (r, g, b, a))


def write_webp_lossless_compatible(png_path: Path, webp_path: Path) -> None:
    """Write WebP via Pillow (quality tuned for soft gradients)."""
    img = Image.open(png_path)
    img.save(webp_path, "WEBP", quality=92, method=6)


def render_variant(
    *,
    stem: str,
    mask: Image.Image,
    face_x: float,
    face_y: float,
) -> None:
    color = build_color_field(face_x=face_x, face_y=face_y)
    glass = add_glass_layers(color)
    composed = apply_mask(glass, mask)
    final = fade_shoulders(composed)
    final = final.filter(ImageFilter.GaussianBlur(1.2))

    png_path = OUT_DIR / f"{stem}.png"
    webp_path = OUT_DIR / f"{stem}.webp"
    final.save(png_path, "PNG", optimize=True)
    write_webp_lossless_compatible(png_path, webp_path)
    print(f"Wrote {png_path} ({png_path.stat().st_size} bytes)")
    print(f"Wrote {webp_path} ({webp_path.stat().st_size} bytes)")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    render_variant(
        stem="orb-voice-head-idle",
        mask=build_silhouette_mask_idle(),
        face_x=118.0,
        face_y=182.0,
    )
    render_variant(
        stem="orb-voice-head-engaged",
        mask=build_silhouette_mask_engaged(),
        face_x=188.0,
        face_y=180.0,
    )

    # Backward-compatible aliases for existing references
    idle_png = OUT_DIR / "orb-voice-head-idle.png"
    Image.open(idle_png).save(OUT_DIR / "orb-voice-head-base.png", "PNG", optimize=True)
    write_webp_lossless_compatible(idle_png, OUT_DIR / "orb-voice-head-base.webp")
    print("Wrote orb-voice-head-base.png/webp (idle alias)")


if __name__ == "__main__":
    main()
