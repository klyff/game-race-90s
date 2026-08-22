#!/usr/bin/env python3
"""Crop production strip cells onto the official 1700×1254 art canvas.

Uses `production_scale.frames` **clock `index`** (not compacted pack `i`).
Each cell is nearest-neighbour scaled by 1700/64 and centred on the axis.
Does not touch `*_hero.png`.

Usage:
  python3 tools/art/car-rotate/unpack_strip_to_canvas.py public/matrix_car/1_hero
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from PIL import Image

CANVAS_W = 1700
CANVAS_H = 1254
PROD_DST_W = 64
NN_SCALE = CANVAS_W / PROD_DST_W  # 26.5625


def parse_hero_folder(folder: Path) -> tuple[str, str]:
    m = re.match(r"^(.+)_hero$", folder.name)
    if not m:
        raise SystemExit(f"pasta esperada {{id}}_hero, recebi: {folder.name}")
    stem = m.group(1)
    prefix = f"car_{stem}" if stem.isdigit() else stem
    return stem, prefix


def unpack_folder(folder: Path) -> list[Path]:
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

    strip = Image.open(png_path).convert("RGBA")
    written: list[Path] = []
    for frame in frames:
        clock = int(frame.get("index", frame.get("i", -1)))
        if clock < 0:
            continue
        x = int(frame["x"])
        y = int(frame["y"])
        w = int(frame["w"])
        h = int(frame["h"])
        if w <= 0 or h <= 0:
            continue
        cell = strip.crop((x, y, x + w, y + h))
        up_w = max(1, round(w * NN_SCALE))
        up_h = max(1, round(h * NN_SCALE))
        up = cell.resize((up_w, up_h), Image.Resampling.NEAREST)
        canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
        ox = (CANVAS_W - up_w) // 2
        oy = (CANVAS_H - up_h) // 2
        canvas.paste(up, (ox, oy), up)
        out = folder / f"{prefix}_a{clock:03d}.png"
        canvas.save(out)
        written.append(out)
        print(f"OK unpack index={clock:02d}  {w}x{h} → {up_w}x{up_h}  → {out.name}")
    print(f"OK unpack {folder.name}  frames={len(written)}  canvas={CANVAS_W}x{CANVAS_H}")
    return written


def main() -> None:
    ap = argparse.ArgumentParser(description="Unpack strip_64 cells onto 1700×1254 canvas")
    ap.add_argument("folder", type=Path, help="public/matrix_car/N_hero")
    args = ap.parse_args()
    unpack_folder(args.folder)


if __name__ == "__main__":
    main()
