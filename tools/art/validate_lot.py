"""Mechanical lot check for 36 frames. Does not judge art quality."""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

SRC = 300


def main(frames_dir: str) -> None:
    d = Path(frames_dir)
    files = sorted(d.glob("*_f*.png"))
    errors: list[str] = []
    if len(files) != 36:
        errors.append(f"count={len(files)} expected 36")
    widths = []
    heights = []
    for p in files:
        im = Image.open(p).convert("RGBA")
        if im.size != (SRC, SRC):
            errors.append(f"{p.name} size={im.size}")
            continue
        bbox = im.getbbox()
        if bbox is None:
            errors.append(f"{p.name} fully transparent")
            continue
        x1, y1, x2, y2 = bbox
        widths.append(x2 - x1)
        heights.append(y2 - y1)
        # real alpha: at least some fully transparent pixels
        alpha = im.getchannel("A")
        if min(alpha.getextrema()) > 0:
            errors.append(f"{p.name} no fully-transparent pixels (black studio leftover?)")
    if errors:
        print("FAIL")
        for e in errors:
            print(" -", e)
        raise SystemExit(1)
    print(
        f"OK {d.name}: 36×{SRC}  content_w={min(widths)}-{max(widths)}  "
        f"content_h={min(heights)}-{max(heights)}"
    )


if __name__ == "__main__":
    main(sys.argv[1])
