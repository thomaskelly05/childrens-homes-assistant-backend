#!/usr/bin/env python3
"""Generate transparent 3D luminous ORB sphere base asset (PNG + WebP).

Visual baseline: premium glass sphere — cyan upper-left, violet/purple centre,
magenta lower-centre, warm amber/orange lower-right, bright rim, no square tile.
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

SIZE = 1024
CX = CY = SIZE // 2
SPHERE_R = 400
OUT_DIR = Path(__file__).resolve().parents[1] / "frontend-next/public/assets/orb"


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp3(
    a: tuple[float, float, float],
    b: tuple[float, float, float],
    t: float,
) -> tuple[float, float, float]:
    return (lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t))


def clamp01(v: float) -> float:
    return max(0.0, min(1.0, v))


# ORB palette — matches brand reference
CYAN = (56.0, 189.0, 248.0)
BLUE = (47.0, 125.0, 255.0)
VIOLET = (124.0, 92.0, 255.0)
MAGENTA = (236.0, 72.0, 153.0)
PINK = (244.0, 114.0, 182.0)
AMBER = (251.0, 191.0, 96.0)
ORANGE = (251.0, 146.0, 60.0)
WHITE = (255.0, 255.0, 255.0)


def sphere_normal(nx: float, ny: float) -> tuple[float, float, float]:
    """Unit normal on a sphere centred at origin (nx, ny in [-1, 1])."""
    r2 = nx * nx + ny * ny
    if r2 > 1.0:
        return (0.0, 0.0, 0.0)
    nz = math.sqrt(1.0 - r2)
    return (nx, ny, nz)


def body_colour(nx: float, ny: float, nz: float) -> tuple[float, float, float]:
    """Internal luminous glass colour from angular zones on the sphere."""
    # Angular position for colour zones (0 = right, pi/2 = down)
    angle = math.atan2(ny, nx)
    elev = (ny + 1.0) / 2.0  # 0 top, 1 bottom
    horiz = (nx + 1.0) / 2.0  # 0 left, 1 right

    # Upper-left: cyan/blue
    ul = clamp01(1.0 - math.hypot((nx + 0.55) / 0.72, (ny + 0.48) / 0.62))
    # Lower-left / centre: violet/purple
    ll = clamp01(1.0 - math.hypot((nx + 0.18) / 0.58, (ny - 0.08) / 0.62))
    # Lower centre: magenta/pink
    lc = clamp01(1.0 - math.hypot(nx / 0.42, (ny - 0.32) / 0.48))
    # Right / lower-right: amber/orange
    rr = clamp01(1.0 - math.hypot((nx - 0.42) / 0.55, (ny - 0.22) / 0.58))

    colour = (0.0, 0.0, 0.0)
    weight = 0.0

    def add(c: tuple[float, float, float], w: float) -> None:
        nonlocal colour, weight
        colour = (colour[0] + c[0] * w, colour[1] + c[1] * w, colour[2] + c[2] * w)
        weight += w

    add(CYAN, ul**1.5 * 1.42)
    add(BLUE, ul**1.9 * 0.68)
    add(VIOLET, ll**1.35 * 1.12)
    add(MAGENTA, lc**1.45 * 1.05)
    add(PINK, lc**2.0 * 0.58)
    add(AMBER, rr**1.25 * 1.02)
    add(ORANGE, rr**1.7 * 0.62)

    # Base luminous wash — bright inner energy, avoid muddy dark centre
    depth = 0.48 + nz * 0.5
    base = lerp3(VIOLET, MAGENTA, clamp01(elev * 0.72))
    base = lerp3(base, CYAN, clamp01((1.0 - elev) * 0.38))
    add(base, 0.42 * depth)

    if weight < 1e-6:
        return base
    return (colour[0] / weight, colour[1] / weight, colour[2] / weight)


def rim_colour(angle: float) -> tuple[float, float, float]:
    """Rim tint around circumference — cyan left, magenta bottom, orange right."""
    # angle: atan2(ny, nx)
    t = (angle + math.pi) / (2.0 * math.pi)  # 0..1
    if t < 0.25:
        return lerp3(CYAN, WHITE, 0.35)
    if t < 0.45:
        return lerp3(VIOLET, MAGENTA, (t - 0.25) / 0.2)
    if t < 0.62:
        return lerp3(MAGENTA, PINK, (t - 0.45) / 0.17)
    if t < 0.82:
        return lerp3(AMBER, ORANGE, (t - 0.62) / 0.2)
    return lerp3(ORANGE, CYAN, (t - 0.82) / 0.18)


def render_sphere() -> Image.Image:
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    pixels = img.load()
    assert pixels is not None

    light = (-0.42, -0.38, 0.82)
    light_len = math.sqrt(sum(v * v for v in light))
    light = tuple(v / light_len for v in light)

    for y in range(SIZE):
        for x in range(SIZE):
            dx = (x - CX) / SPHERE_R
            dy = (y - CY) / SPHERE_R
            dist = math.hypot(dx, dy)
            if dist > 1.08:
                continue

            nx, ny, nz = sphere_normal(dx, dy)
            if nz <= 0:
                continue

            body = body_colour(dx, dy, nz)

            # Diffuse + wrap lighting for glass depth
            diffuse = max(0.0, nx * light[0] + ny * light[1] + nz * light[2])
            wrap = diffuse**0.68
            body = lerp3(body, WHITE, wrap * 0.32)

            # Upper-left specular highlight — stronger luminous core
            spec_dist = math.hypot((dx + 0.42) / 0.28, (dy + 0.38) / 0.24)
            spec = max(0.0, 1.0 - spec_dist) ** 2.9
            body = lerp3(body, WHITE, spec * 0.96)

            # Secondary cool catch light
            catch_dist = math.hypot((dx - 0.12) / 0.22, (dy + 0.08) / 0.18)
            catch = max(0.0, 1.0 - catch_dist) ** 2.6
            body = lerp3(body, CYAN, catch * 0.38)

            # Rim light near edge — white/cyan to pink/amber circumference
            rim_t = clamp01((dist - 0.74) / 0.26)
            if rim_t > 0:
                angle = math.atan2(dy, dx)
                rim = rim_colour(angle)
                body = lerp3(body, rim, rim_t**1.25 * 0.86)
                body = lerp3(body, WHITE, rim_t**2.0 * 0.48)

            # Glass shell fresnel — brighter at grazing angles, less muddy edge
            fresnel = (1.0 - nz) ** 2.0
            body = lerp3(body, WHITE, fresnel * 0.18)

            # Alpha — circular with soft outer glow falloff (no square boundary)
            if dist <= 0.98:
                alpha = 255
            elif dist <= 1.02:
                alpha = int(255 * (1.0 - (dist - 0.98) / 0.04))
            else:
                # Soft outer aura in alpha only
                aura = max(0.0, 1.0 - (dist - 1.02) / 0.06)
                alpha = int(aura * 72)
                body = lerp3(body, CYAN, 0.35)

            if alpha <= 0:
                continue

            pixels[x, y] = (
                int(clamp01(body[0] / 255.0) * 255),
                int(clamp01(body[1] / 255.0) * 255),
                int(clamp01(body[2] / 255.0) * 255),
                alpha,
            )

    return img


def add_outer_glow(base: Image.Image) -> Image.Image:
    """Very subtle outer bloom — circular only, composited behind sphere."""
    glow_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow_layer)
    for colour, inset, alpha in ((CYAN, 0.05, 28), (MAGENTA, 0.07, 24), (AMBER, 0.06, 26)):
        r = int(SPHERE_R * (1.0 + inset))
        draw.ellipse((CX - r, CY - r, CX + r, CY + r), fill=(*[int(c) for c in colour], alpha))
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(32))
    # Mask glow to circular falloff
    mask = Image.new("L", (SIZE, SIZE), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.ellipse((CX - SPHERE_R - 36, CY - SPHERE_R - 36, CX + SPHERE_R + 36, CY + SPHERE_R + 36), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(22))
    glow_layer.putalpha(mask)
    return Image.alpha_composite(glow_layer, base)


def write_outputs(img: Image.Image) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    png_path = OUT_DIR / "orb-voice-core-base.png"
    webp_path = OUT_DIR / "orb-voice-core-base.webp"
    img.save(png_path, "PNG", optimize=True)
    img.save(webp_path, "WEBP", quality=94, method=6)
    print(f"Wrote {png_path} ({png_path.stat().st_size} bytes)")
    print(f"Wrote {webp_path} ({webp_path.stat().st_size} bytes)")


def main() -> None:
    sphere = render_sphere()
    final = add_outer_glow(sphere)
    # Light polish — keeps edges smooth without rectangular blur
    final = final.filter(ImageFilter.GaussianBlur(0.6))
    write_outputs(final)


if __name__ == "__main__":
    main()
