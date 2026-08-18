"""Accept a generated frame into frames_300/{CAR}/.

Refuses any size other than 300x300. Never resizes. Applies edge flood-fill
chroma-key so leftover studio black becomes real alpha.
"""
from __future__ import annotations

import sys

from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from hero_chroma_key import flood_black_to_alpha

SRC = 300


def main(src: str, dst: str) -> None:
    im = Image.open(src).convert("RGBA")
    if im.size != (SRC, SRC):
        raise SystemExit(
            f"REJECT {src}: size={im.size} expected {SRC}x{SRC} — regenerate, do NOT resize"
        )
    out = flood_black_to_alpha(im)
    out.save(dst)
    bbox = out.getbbox()
    print(f"OK {dst} size={out.size} bbox={bbox}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
