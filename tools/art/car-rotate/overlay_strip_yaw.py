#!/usr/bin/env python3
"""Draw fluorescent yaw lines on a matrix strip_64 using clock `index`.

Each production_scale frame gets:
  - a 1px box
  - a 1px line through collision_center at clock yaw (0° = screen down / 6h)
  - the official clock index label

Never uses compacted pack `i` for the angle. Output is *_yaw.png (nogo only).

Usage:
  python3 tools/art/car-rotate/overlay_strip_yaw.py public/matrix_car/99_hero
  python3 tools/art/car-rotate/overlay_strip_yaw.py public/matrix_car/98_hero
"""
from __future__ import annotations

import json
import math
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

GREEN = (57, 255, 20, 255)
LABEL = (57, 255, 20, 255)


def parse_hero_folder(folder: Path) -> tuple[str, str]:
    m = re.match(r"^(.+)_hero$", folder.name)
    if not m:
        raise SystemExit(f"pasta esperada {{id}}_hero, recebi: {folder.name}")
    stem = m.group(1)
    prefix = f"car_{stem}" if stem.isdigit() else stem
    return stem, prefix


def clock_screen_dir(index: int) -> tuple[float, float]:
    """Unit screen vector for clock index. +Y down. 0 = 6h = down."""
    theta = index * (math.pi * 2 / 30)
    return (-math.sin(theta), math.cos(theta))


def draw_line(draw: ImageDraw.ImageDraw, x0: float, y0: float, x1: float, y1: float) -> None:
    draw.line((round(x0), round(y0), round(x1), round(y1)), fill=GREEN, width=1)


def overlay(folder: Path) -> Path:
    folder = folder.resolve()
    stem, prefix = parse_hero_folder(folder)
    json_path = folder / f"{prefix}_strip.json"
    if not json_path.is_file():
        raise SystemExit(f"missing {json_path}")
    data = json.loads(json_path.read_text())
    prod = data.get("production_scale") or {}
    frames = prod.get("frames")
    if not isinstance(frames, list) or not frames:
        raise SystemExit(f"{json_path} has no production_scale.frames")
    png_name = data.get("strip_64") or f"{prefix}_strip_64.png"
    png_path = folder / png_name
    if not png_path.is_file():
        raise SystemExit(f"missing {png_path}")

    im = Image.open(png_path).convert("RGBA")
    draw = ImageDraw.Draw(im)
    try:
        font = ImageFont.load_default()
    except OSError:
        font = None

    for frame in frames:
        clock = int(frame.get("index", frame.get("i", 0)))
        x = float(frame["x"])
        y = float(frame["y"])
        w = float(frame["w"])
        h = float(frame["h"])
        center = frame.get("collision_center") or {}
        cx = float(center.get("x", x + w / 2))
        cy = float(center.get("y", y + h / 2))
        rect = frame.get("collision_rect")

        draw.rectangle((round(x), round(y), round(x + w - 1), round(y + h - 1)), outline=GREEN)
        if isinstance(rect, dict) and all(k in rect for k in ("x1", "y1", "x2", "y2")):
            draw.rectangle(
                (round(rect["x1"]), round(rect["y1"]), round(rect["x2"] - 1), round(rect["y2"] - 1)),
                outline=GREEN,
            )

        dx, dy = clock_screen_dir(clock)
        half = max(w, h) * 0.55
        draw_line(draw, cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half)
        # nose tick: longer toward the official heading
        draw_line(draw, cx, cy, cx + dx * half, cy + dy * half)

        label = str(clock)
        tx = round(x) + 1
        ty = round(y) + 1
        if font is not None:
            draw.text((tx, ty), label, fill=LABEL, font=font)
        else:
            draw.text((tx, ty), label, fill=LABEL)

    out = folder / f"{prefix}_strip_64_yaw.png"
    im.save(out)
    print(f"wrote {out}  ({len(frames)} cells, clock index)")
    return out


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("usage: overlay_strip_yaw.py public/matrix_car/{N}_hero")
    overlay(Path(sys.argv[1]))


if __name__ == "__main__":
    main()
