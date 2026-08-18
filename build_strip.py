"""Build horizontal sprite strip from N frames at a fixed source canvas size.

ONLY place in the car-rotate pipeline where art is scaled:
  FACTOR = DST / SRC   (constant %, NEAREST)

Usage:
  python build_strip.py frames_1024/car_orange out/car_orange_strip_64.png out/car_orange_strip_64.json
  python build_strip.py frames_1024/car_orange out/x.png out/x.json --src 1024 --dst 64
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import sys

from PIL import Image

PAD = 2


def bbox_of(img: Image.Image):
    b = img.getbbox()
    return b if b else (0, 0, img.width, img.height)


def main(frames_dir: str, out_png: str, out_json: str, src: int, dst: int) -> None:
    factor = dst / src
    paths = sorted(glob.glob(os.path.join(frames_dir, "*_f*.png")))
    assert len(paths) == 36, f"esperado 36 frames, achei {len(paths)}"

    sprites: list[Image.Image] = []
    for p in paths:
        im = Image.open(p).convert("RGBA")
        assert im.size == (src, src), (
            f"{p} nao esta em {src}x{src} — regenerar ou normalizar, NAO inventar escala aqui"
        )
        x1, y1, x2, y2 = bbox_of(im)
        crop = im.crop((x1, y1, x2, y2))
        w = max(1, round(crop.width * factor))
        h = max(1, round(crop.height * factor))
        small = crop.resize((w, h), Image.NEAREST)
        sprites.append(small)

    strip_h = max(s.height for s in sprites) + 2 * PAD
    strip_w = sum(s.width + 2 * PAD for s in sprites)
    strip = Image.new("RGBA", (strip_w, strip_h), (0, 0, 0, 0))

    frames: list[dict] = []
    x = 0
    for i, s in enumerate(sprites):
        px = x + PAD
        py = PAD + (strip_h - 2 * PAD - s.height) // 2
        strip.paste(s, (px, py), s)
        frames.append(
            {
                "index": i,
                "angle": i * 10,
                "rect": {"x1": px, "y1": py, "x2": px + s.width, "y2": py + s.height},
                "w": s.width,
                "h": s.height,
            }
        )
        x += s.width + 2 * PAD

    ws = [f["w"] for f in frames]
    hs = [f["h"] for f in frames]
    col_w = round((max(ws) + min(ws)) / 2)
    col_h = round((max(hs) + min(hs)) / 2)

    os.makedirs(os.path.dirname(os.path.abspath(out_png)) or ".", exist_ok=True)
    strip.save(out_png)
    with open(out_json, "w") as f:
        json.dump(
            {
                "source_size": src,
                "target_size": dst,
                "scale_factor": factor,
                "pad": PAD,
                "frames": frames,
                "min_rect": {"w": min(ws), "h": min(hs)},
                "max_rect": {"w": max(ws), "h": max(hs)},
                "collision_rect": {"w": col_w, "h": col_h, "anchor": "center_of_sprite_rect"},
            },
            f,
            indent=2,
        )
    print(
        f"OK: {out_png} | sprites w: {min(ws)}-{max(ws)}px | "
        f"colisao {col_w}x{col_h} (centrada) | factor={factor}"
    )


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Constant-% sprite strip builder")
    ap.add_argument("frames_dir")
    ap.add_argument("out_png")
    ap.add_argument("out_json")
    ap.add_argument("--src", type=int, default=300, help="native art canvas (default 300)")
    ap.add_argument("--dst", type=int, default=64, help="scale target for FACTOR=dst/src")
    args = ap.parse_args()
    main(args.frames_dir, args.out_png, args.out_json, args.src, args.dst)
