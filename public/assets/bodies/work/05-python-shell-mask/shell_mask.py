#!/usr/bin/env python3
"""Protected-interior floodfill.

Build a core mask of the figure so a color wand from the corners cannot
eat black clothes. Only pixels reachable from the border AND not in the
eroded core become transparent.
"""
from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageOps

NEAR_BLACK = 18  # r+g+b below this counts as studio
ERODE = 4
PAD = 10


def flood_from_border(seed: np.ndarray) -> np.ndarray:
    """seed is True where wand may start (near-black). Walk 4-connected from edges."""
    h, w = seed.shape
    seen = np.zeros((h, w), dtype=np.uint8)
    q: deque[tuple[int, int]] = deque()

    def push(y: int, x: int) -> None:
        if seed[y, x] and not seen[y, x]:
            seen[y, x] = 1
            q.append((y, x))

    for x in range(w):
        push(0, x)
        push(h - 1, x)
    for y in range(h):
        push(y, 0)
        push(y, w - 1)
    while q:
        y, x = q.popleft()
        if y > 0:
            push(y - 1, x)
        if y + 1 < h:
            push(y + 1, x)
        if x > 0:
            push(y, x - 1)
        if x + 1 < w:
            push(y, x + 1)
    return seen.astype(bool)


def matte(path: Path, dest: Path) -> None:
    im = Image.open(path).convert("RGBA")
    arr = np.asarray(im)
    rgb = arr[..., :3].astype(np.int16)
    a = arr[..., 3]
    lum = rgb.sum(axis=2)
    near_black = (lum <= NEAR_BLACK) & (a > 0)

    # Rough figure = not the border-connected studio black.
    studio = flood_from_border(near_black)
    figure = ~studio

    # Core the wand must not enter: erode the figure a few pixels.
    fig_img = Image.fromarray((figure.astype(np.uint8) * 255), mode="L")
    core = np.array(
        fig_img.filter(ImageFilter.MinFilter(ERODE * 2 + 1))
    ) > 127

    # Wand again, but seeds cannot be core (protects black tank / leather).
    wand_seed = near_black & ~core
    kill = flood_from_border(wand_seed)

    out = arr.copy()
    out[kill, 3] = 0
    rgba = Image.fromarray(out, "RGBA")

    # Hard alpha, then trim + 10px air.
    band = rgba.getchannel("A").point(lambda v: 255 if v >= 128 else 0)
    rgba.putalpha(band)
    bbox = band.getbbox()
    if bbox:
        rgba = rgba.crop(bbox)
    rgba = ImageOps.expand(rgba, border=PAD, fill=(0, 0, 0, 0))
    dest.parent.mkdir(parents=True, exist_ok=True)
    rgba.save(dest, "PNG")
    print(f"{dest.name} {rgba.size[0]}x{rgba.size[1]}")


def main() -> None:
    src_dir = Path(sys.argv[1])
    dest_dir = Path(sys.argv[2])
    for src in sorted(src_dir.glob("*.png")):
        matte(src, dest_dir / src.name)


if __name__ == "__main__":
    main()
