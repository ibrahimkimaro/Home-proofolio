"""
Render the photorealistic hero plate for the landing page.

Output (both written next to this script's --out path):
  hero-plate.jpg   a photo-style plate: dark room, wooden desk, laptop, screen off
  hero-plate.json  the laptop screen quad in normalised 0..1 coordinates, so the web
                   layer can map the live dashboard onto the glass in perspective

Why render instead of using a stock photo: we control the camera angle exactly, so the
dashboard can be perspective-mapped onto the screen instead of looking pasted on. The
scene is treated like a real camera: shallow depth of field (the room is defocused, the
near desk edge is defocused, the laptop is the focus plane), a single cool key light from
the screen side, warm practical light from behind, film grain and a slight vignette.

Usage:
  python tools/render_hero_plate.py
  python tools/render_hero_plate.py --width 3200 --height 2000 --out <path.jpg>
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# --------------------------------------------------------------------------------------
# camera / scene geometry, all in normalised 0..1 frame coordinates
# --------------------------------------------------------------------------------------

# Where the focus plane sits, front to back.
DESK_TOP_L, DESK_TOP_R = 0.00, 1.00
DESK_BACK_Y = 0.420          # back edge of the desk (far)
DESK_FRONT_Y = 1.00          # front edge of the desk (near the camera)

# The laptop lid. The top edge is further from the camera, so it is drawn narrower than the
# bottom edge: that difference is what reads as perspective. The taper is deliberately mild --
# a flatter camera keeps the on-screen UI readable once it is projected onto the glass.
# The laptop, shot front-on: the camera sits level with the screen, so the lid is a clean
# rectangle and the UI mapped onto the glass is NOT keystoned. The depth in the shot comes
# from the desk, the bezel chamfer and the shadows instead of from a tilted screen.
LID = {
    "top_l": (0.186, 0.032),
    "top_r": (0.814, 0.032),
    "bot_r": (0.814, 0.450),
    "bot_l": (0.186, 0.450),
}

# Glass opening inside the bezel, a true 16:10 rectangle to match the dashboard's aspect.
SCREEN = {
    "top_l": (0.200, 0.046),
    "top_r": (0.800, 0.046),
    "bot_r": (0.800, 0.421),
    "bot_l": (0.200, 0.421),
}

# The keyboard deck, seen almost edge-on.
DECK = {
    "top_l": (0.186, 0.450),
    "top_r": (0.814, 0.450),
    "bot_r": (0.852, 0.500),
    "bot_l": (0.148, 0.500),
}

# Shadowed contact area on the desk under the machine.
SHADOW = {
    "top_l": (0.160, 0.490),
    "top_r": (0.840, 0.490),
    "bot_r": (0.895, 0.578),
    "bot_l": (0.105, 0.578),
}

# Key light: the cool window/screen-side light that rakes across the desk.
KEY_LIGHT = (0.27, 0.34)
WARM_LIGHT = (0.82, 0.55)


def directional_grain(size: tuple[int, int], rng: np.random.Generator, layers: int = 4) -> np.ndarray:
    """Timber grain: low-frequency variation vertically, smeared along the horizontal axis.

    Real grain is strongly anisotropic. Building a horizontal sine/jitter field and then
    blurring it vertically (not isotropically) is what makes it read as wood instead of cork.
    Lines are drawn dark into a lit base and then normalised: adding bright lines onto a
    zero background only ever reaches a fraction of the range and washes the surface out.
    """
    w, h = size
    acc = np.zeros((h, w), dtype=np.float32)
    weight = 0.0
    for layer in range(layers):
        period = max(4, int(40 / (1.55**layer)))             # line spacing, in pixels
        band = np.full((h, w), 0.62, dtype=np.float32)       # lit base the grain sits in
        n_lines = h // period + 2
        for i in range(n_lines):
            y = i * period + rng.uniform(-period * 0.25, period * 0.25)
            phase = rng.uniform(0, 6.283)
            depth = rng.uniform(0.18, 0.85)
            # Each grain line wanders gently rather than being perfectly straight.
            wobble = (np.sin((np.arange(w) / w) * rng.uniform(2.0, 6.0) * np.pi + phase) * period * 0.35).astype(np.float32)
            idx = np.clip((y + wobble).astype(np.int32), 0, h - 1)
            band[idx, np.arange(w)] -= depth
        # Sharper falloff and a finer spacing keep the lines legible instead of mushing
        # into soft bands.
        band = np.asarray(
            Image.fromarray(np.clip(band, 0, 1).__mul__(255).astype(np.uint8), "L").filter(
                ImageFilter.GaussianBlur(max(0.8, period * 0.16))
            ),
            dtype=np.float32,
        ) / 255.0
        acc += band
        weight += 1.0
    acc /= max(weight, 1e-6)
    lo, hi = float(acc.min()), float(acc.max())
    if hi - lo > 1e-6:
        acc = (acc - lo) / (hi - lo)
    return np.clip(acc, 0, 1)


def quad_mask(size: tuple[int, int], quad: dict[str, tuple[float, float]], blur: float = 0.0) -> np.ndarray:
    """Anti-aliased 0..1 coverage mask for a convex quad."""
    w, h = size
    scale = 2  # supersample so the trapezoid edges are smooth, not staircase-y
    img = Image.new("L", (w * scale, h * scale), 0)
    pts = [(quad[k][0] * w * scale, quad[k][1] * h * scale) for k in ("top_l", "top_r", "bot_r", "bot_l")]
    ImageDraw.Draw(img).polygon(pts, fill=255)
    if blur:
        img = img.filter(ImageFilter.GaussianBlur(blur * scale))
    return np.asarray(img.resize((w, h), Image.LANCZOS), dtype=np.float32) / 255.0


def value_noise(size: tuple[int, int], cells: int, rng: np.random.Generator) -> np.ndarray:
    """Smooth bilinear value noise in 0..1, used as the octave base for the wood grain."""
    w, h = size
    grid = rng.random((cells + 1, cells + 1)).astype(np.float32)
    img = Image.fromarray((grid * 255).astype(np.uint8), mode="L").resize((w, h), Image.BICUBIC)
    return np.asarray(img, dtype=np.float32) / 255.0


def fbm(size: tuple[int, int], rng: np.random.Generator, octaves: int = 5, base: int = 3) -> np.ndarray:
    """Fractal noise: the layered octaves give surfaces something to catch the light."""
    out = np.zeros((size[1], size[0]), dtype=np.float32)
    amp, total = 1.0, 0.0
    for o in range(octaves):
        out += value_noise(size, base * (2**o), rng) * amp
        total += amp
        amp *= 0.5
    return out / total


def radial(size: tuple[int, int], centre: tuple[float, float], radius: float, power: float = 2.0) -> np.ndarray:
    """Radial falloff in 0..1, for glows and shading."""
    w, h = size
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    aspect = w / h
    dx = (xs / w - centre[0]) * aspect
    dy = ys / h - centre[1]
    d = np.sqrt(dx * dx + dy * dy) / (radius * aspect)
    return np.clip(1.0 - d, 0.0, 1.0) ** power


def screen_blur(img: Image.Image, size: tuple[int, int], blur_xy: np.ndarray) -> Image.Image:
    """Depth of field as a per-pixel blur radius ramp.

    A per-pixel radius is more faithful than cross-fading two blurs: the near desk edge and
    the far wall take a wide radius, the laptop plane (the focus plane) stays sharp.
    """
    w, h = size
    radius = np.clip(blur_xy, 0.0, None)
    sharp = np.asarray(img, dtype=np.float32)
    out = sharp.copy()
    # Stack of discrete blur levels, each masked in where its radius band applies.
    levels = [max(1.0, w * f) for f in (0.0015, 0.003, 0.006, 0.011, 0.019)]
    prev_edge = 0.0
    for level in levels:
        edge = level * 1.55
        band = np.clip((radius - prev_edge) / max(1e-6, edge - prev_edge), 0.0, 1.0)
        band = np.clip(band, 0.0, 1.0)
        if band.max() <= 0.0:
            prev_edge = edge
            continue
        blurred = np.asarray(img.filter(ImageFilter.GaussianBlur(level)), dtype=np.float32)
        m = band[..., None]
        out = out * (1.0 - m) + blurred * m
        prev_edge = edge
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def render(width: int, height: int, seed: int = 7) -> tuple[Image.Image, dict]:
    size = (width, height)
    rng = np.random.default_rng(seed)

    # ---------------------------------------------------------------- room (background)
    # A dark wall with a cool pool of light on the left and warmth off to the right.
    base = np.zeros((height, width, 3), dtype=np.float32)
    ramp = np.linspace(0.0, 1.0, height, dtype=np.float32)[:, None]
    wall = np.stack(
        [
            10 + 16 * (1.0 - ramp) ** 1.4,   # R
            14 + 22 * (1.0 - ramp) ** 1.3,   # G
            20 + 30 * (1.0 - ramp) ** 1.2,   # B
        ],
        axis=-1,
    )
    base[:] = wall

    key = radial(size, KEY_LIGHT, 0.55, 2.2)[..., None] * np.array([38, 62, 92], dtype=np.float32)
    warm = radial(size, WARM_LIGHT, 0.5, 2.4)[..., None] * np.array([70, 44, 24], dtype=np.float32)
    base += key + warm

    # Out-of-focus shelving on the left: vertical blocks catching a little light.
    shelves = Image.new("RGB", size, (0, 0, 0))
    sd = ImageDraw.Draw(shelves)
    for row in range(3):
        y0 = int(height * (0.06 + row * 0.14))
        y1 = y0 + int(height * 0.11)
        x = int(width * 0.015)
        while x < width * 0.30:
            bw = int(rng.integers(int(width * 0.012), int(width * 0.036)))
            bh = int((y1 - y0) * rng.uniform(0.55, 1.0))
            tone = int(rng.integers(24, 62))
            sd.rectangle([x, y1 - bh, x + bw, y1], fill=(tone, int(tone * 1.15), int(tone * 1.45)))
            x += bw + int(width * 0.004)
    shelves = shelves.filter(ImageFilter.GaussianBlur(width * 0.012))
    base += np.asarray(shelves, dtype=np.float32) * 0.85

    # A wall monitor, back right: a soft rectangle of screen glow.
    monitor = np.zeros((height, width), dtype=np.float32)
    mx0, my0 = int(width * 0.70), int(height * 0.06)
    mx1, my1 = int(width * 0.97), int(height * 0.40)
    monitor[my0:my1, mx0:mx1] = 1.0
    monitor = np.asarray(
        Image.fromarray((monitor * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(width * 0.02)),
        dtype=np.float32,
    ) / 255.0
    base += monitor[..., None] * np.array([16, 30, 46], dtype=np.float32)

    room = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8))

    # ------------------------------------------------------------------- desk (mid ground)
    desk = np.zeros((height, width, 3), dtype=np.float32)

    # Wood: long horizontal grain lines, a slow plank figure and a fine layer on top.
    ys, xs = np.mgrid[0:height, 0:width].astype(np.float32)
    grain_lines = directional_grain((width, max(64, height // 2)), rng, layers=4)
    grain_lines = np.asarray(
        Image.fromarray((grain_lines * 255).astype(np.uint8), "L").resize(size, Image.BICUBIC),
        dtype=np.float32,
    ) / 255.0
    micro = value_noise((width, max(32, height // 40)), 64, rng)
    micro = np.asarray(
        Image.fromarray((micro * 255).astype(np.uint8), "L").resize(size, Image.BICUBIC),
        dtype=np.float32,
    ) / 255.0
    plank = value_noise(size, 4, rng)
    plank = np.asarray(
        Image.fromarray((plank * 255).astype(np.uint8), "L").resize((6, height), Image.LANCZOS).resize(size, Image.BICUBIC),
        dtype=np.float32,
    ) / 255.0
    figure = 0.5 + 0.5 * np.sin((ys / height) * 22.0 + plank * 7.0)
    fibre = np.clip(grain_lines * 0.60 + figure * 0.14 + micro * 0.26, 0, 1)
    # Grain tightens with distance from the camera.
    depth_t = np.clip((ys / height - DESK_BACK_Y) / (DESK_FRONT_Y - DESK_BACK_Y), 0, 1)
    fibre = fibre * (0.45 + 0.55 * depth_t)

    wood_dark = np.array([52, 29, 15], dtype=np.float32)
    wood_lit = np.array([158, 102, 56], dtype=np.float32)
    desk[:] = wood_dark + (wood_lit - wood_dark) * fibre[..., None]

    # Key light raking across the desk, and the warm practical from behind it.
    desk += radial(size, KEY_LIGHT, 0.62, 1.7)[..., None] * np.array([92, 104, 118], dtype=np.float32)
    desk += radial(size, WARM_LIGHT, 0.45, 2.0)[..., None] * np.array([70, 40, 20], dtype=np.float32)

    # Sheen: wood is glossy, so the light sits on top of the grain as a broad highlight.
    sheen = np.asarray(
        Image.fromarray((fibre * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(width * 0.012)),
        dtype=np.float32,
    ) / 255.0
    desk += (sheen[..., None] * radial(size, (0.34, 0.58), 0.5, 1.4)[..., None]) * np.array([52, 58, 66], dtype=np.float32)

    # The light pool the machine sits in, then a gentle falloff to the frame edges.
    desk += radial(size, (0.45, 0.60), 0.40, 1.5)[..., None] * np.array([44, 34, 24], dtype=np.float32)
    desk *= (0.72 + 0.28 * (1.0 - depth_t))[..., None]
    desk_img = Image.fromarray(np.clip(desk, 0, 255).astype(np.uint8))

    desk_mask = (ys / height >= DESK_BACK_Y).astype(np.float32)
    desk_mask = np.asarray(
        Image.fromarray((desk_mask * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(width * 0.006)),
        dtype=np.float32,
    ) / 255.0
    scene = np.asarray(room, dtype=np.float32) * (1 - desk_mask[..., None]) + np.asarray(desk_img, dtype=np.float32) * desk_mask[..., None]

    # ------------------------------------------------------------------------ the laptop
    lid_mask = quad_mask(size, LID, blur=width * 0.0012)
    screen_mask = quad_mask(size, SCREEN, blur=width * 0.0010)
    deck_mask = quad_mask(size, DECK, blur=width * 0.0010)
    shadow_mask = quad_mask(size, SHADOW, blur=width * 0.020)

    # Contact shadow first, so the machine sits in it. The machine's own footprint is
    # excluded, otherwise the shadow's soft upper edge smears across the deck and lid.
    shadow_only = shadow_mask * (1.0 - np.clip(lid_mask + deck_mask, 0, 1))
    scene *= (1.0 - shadow_only[..., None] * 0.78)
    # Tight ambient occlusion right at the contact line: this is what stops it floating.
    ao = np.asarray(
        Image.fromarray((np.clip(deck_mask, 0, 1) * 255).astype(np.uint8), "L")
        .filter(ImageFilter.GaussianBlur(width * 0.009)),
        dtype=np.float32,
    ) / 255.0
    ao = np.clip(ao - np.clip(deck_mask, 0, 1), 0, 1)
    scene *= (1.0 - ao[..., None] * 0.85)

    # Aluminium: a vertical gradient normally reads as "metal" under a single key light.
    lid = np.zeros((height, width, 3), dtype=np.float32)
    lid_t = np.clip((ys / height - LID["top_l"][1]) / (LID["bot_l"][1] - LID["top_l"][1]), 0, 1)
    metal_lo = np.array([38, 41, 47], dtype=np.float32)
    metal_hi = np.array([134, 140, 148], dtype=np.float32)
    lid[:] = metal_lo + (metal_hi - metal_lo) * (lid_t ** 1.6)[..., None]

    # The bezel must stay evenly lit and thin; a steep gradient across it reads as a wide
    # dark band rather than a frame, so flatten it where the bezel is (outside the glass).
    lid = lid * (1.0 - (1.0 - lid_t[..., None]) * 0.55 * (1.0 - screen_mask[..., None]))

    # Brushed-metal micro-detail, plus hard specular edges along the lit side.
    brush = fbm(size, rng, octaves=3, base=48)
    lid *= (0.95 + 0.10 * brush)[..., None]

    # Chamfer: a bright rim where the lid's edge turns away from the key light on the left,
    # and a dimmer one on the right. This is what makes it read as a machined object.
    lid_edge = np.clip(lid_mask - quad_mask(size, {k: (v[0] + 0.006, v[1] + 0.006) for k, v in LID.items()}, blur=width * 0.002), 0, 1)
    left_side = np.clip(1.0 - (xs / width) * 6.0, 0, 1)
    lid += lid_edge[..., None] * (26 + 96 * left_side)[..., None] * np.array([1.0, 1.04, 1.12], dtype=np.float32)

    # Rim light along the top edge, from the window behind the machine.
    rim = np.clip(1.0 - np.abs(ys / height - LID["top_l"][1]) * 320.0, 0, 1) * lid_mask
    lid += rim[..., None] * np.array([34, 44, 58], dtype=np.float32)

    # The glass: near-black, with only the room's ambient reflection. Deliberately NO
    # reflection streak here: the live dashboard is mapped onto this area in the browser,
    # so any baked highlight would smear the UI. The browser adds the glass sheen on top.
    glass = np.zeros((height, width, 3), dtype=np.float32)
    glass[:] = np.array([8, 12, 18], dtype=np.float32)
    glass += radial(size, (0.34, 0.34), 0.42, 1.6)[..., None] * np.array([20, 31, 45], dtype=np.float32)

    lid = lid * (1 - screen_mask[..., None]) + glass * screen_mask[..., None]

    # Bezel: keep a thin dark frame and a slight inner shadow around the glass.
    inner = quad_mask(size, {k: (v[0] + 0.007, v[1] + 0.007) for k, v in SCREEN.items()}, blur=width * 0.003)
    inner_shadow = np.clip(screen_mask - inner, 0, 1)
    lid *= (1.0 - inner_shadow[..., None] * 0.75)

    scene = scene * (1 - lid_mask[..., None]) + lid * lid_mask[..., None]

    # Keyboard deck: darker metal, tapering away from the camera.
    deck = np.zeros((height, width, 3), dtype=np.float32)
    deck_t = np.clip((ys / height - DECK["top_l"][1]) / (DECK["bot_l"][1] - DECK["top_l"][1]), 0, 1)
    deck[:] = np.array([46, 50, 56], dtype=np.float32) * (1.0 - 0.45 * deck_t[..., None])
    deck += radial(size, KEY_LIGHT, 0.5, 1.6)[..., None] * np.array([48, 54, 62], dtype=np.float32)
    # Row of keys, suggested rather than drawn: this is nearly edge-on.
    keys = (0.5 + 0.5 * np.sin((xs / width) * 210.0)) * (deck_t < 0.75)
    deck += keys[..., None] * np.array([10, 11, 13], dtype=np.float32)
    scene = scene * (1 - deck_mask[..., None]) + deck * deck_mask[..., None]

    # Hinge shadow between lid and deck, so the two planes read as separate surfaces.
    hinge = np.clip(1.0 - np.abs(ys / height - LID["bot_l"][1]) * 260.0, 0, 1) * lid_mask
    scene *= (1.0 - hinge[..., None] * 0.5)

    # Cool screen light spilling onto the desk in front of the laptop.
    spill = radial(size, (0.45, 0.62), 0.42, 1.8)[..., None] * np.array([40, 62, 88], dtype=np.float32)
    spill *= (ys / height >= LID["bot_l"][1])[..., None]
    scene += spill * 0.5

    img = Image.fromarray(np.clip(scene, 0, 255).astype(np.uint8))

    # ------------------------------------------------------------- lens, grain, grade
    # Focus plane is the laptop (lid + deck). The near desk edge and the far wall fall away.
    y = ys / height
    far_soft = np.clip((0.30 - y) / 0.30, 0.0, 1.0) ** 1.2          # back of the room
    near_soft = np.clip((y - 0.66) / 0.34, 0.0, 1.0) ** 1.5         # desk closest to camera
    blur_xy = (far_soft * width * 0.016) + (near_soft * width * 0.008)
    # Nothing on the machine itself is ever soft.
    blur_xy *= (1.0 - np.clip(lid_mask + screen_mask + deck_mask, 0, 1) * 0.94)
    img = screen_blur(img, size, blur_xy)

    arr = np.asarray(img, dtype=np.float32)

    # Bloom: bright areas bleed, the way a real lens flares.
    bright = np.clip((arr.mean(axis=2) - 168.0) / 87.0, 0, 1)
    bloom = np.asarray(
        Image.fromarray((bright * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(width * 0.02)),
        dtype=np.float32,
    ) / 255.0
    arr += bloom[..., None] * np.array([30, 44, 62], dtype=np.float32)

    # Slight cool-shadow / warm-highlight grade.
    lum = arr.mean(axis=2, keepdims=True) / 255.0
    arr += (1.0 - lum) * np.array([-6, -2, 8], dtype=np.float32) + lum * np.array([8, 4, -4], dtype=np.float32)

    # Vignette.
    arr *= (0.62 + 0.38 * radial(size, (0.5, 0.5), 0.78, 1.2))[..., None]

    # Film grain, strongest in the shadows.
    grain_layer = rng.normal(0.0, 1.0, (height, width, 1)).astype(np.float32)
    arr += grain_layer * (2.6 + 3.4 * (1.0 - lum))

    out = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    meta = {
        "image": {"width": width, "height": height},
        "screen_quad": SCREEN,
        "note": "screen_quad is normalised 0..1; map the live dashboard onto these four corners.",
    }
    return out, meta


def main() -> None:
    ap = argparse.ArgumentParser(description="Render the photorealistic landing hero plate.")
    ap.add_argument("--width", type=int, default=2560)
    ap.add_argument("--height", type=int, default=1600)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "home_profio_frontend" / "public" / "images" / "hero-plate.jpg",
    )
    args = ap.parse_args()

    img, meta = render(args.width, args.height, args.seed)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    img.save(args.out, "JPEG", quality=88, optimize=True, progressive=True)
    meta_path = args.out.with_suffix(".json")
    meta_path.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {args.out} ({args.out.stat().st_size / 1024:.0f} KB)")
    print(f"wrote {meta_path}")


if __name__ == "__main__":
    main()
