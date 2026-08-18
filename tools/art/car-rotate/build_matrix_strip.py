#!/usr/bin/env python3
"""Build car_N_strip.png from matrix_car numbered frames (hero excluded).

Algorithm (as specified):
  1. Collect car_N_a*.png sorted by index (skip hero).
  2. For each: trim alpha bbox, then +4px margin on all sides.
  3. largura_total = sum of padded widths.
  4. strip_h = max(padded heights) + 2*4; canvas (largura_total, strip_h);
     y = strip_h/2 - trimCar.height/2
  5. collisionCenters[i].x = x + padded.width/2 ; .y = strip_h/2 always.
  6. ONE invisible collision_rect: w,h = (min+max)/2 of content bboxes.
  7. Production strip: magick -resize (64/1700*100)% ;
     scaled_w = SCALE * strip.width  (SCALE = 64/1700)

Usage:
  python3 tools/art/car-rotate/build_matrix_strip.py public/matrix_car/1_hero
  python3 tools/art/car-rotate/build_matrix_strip.py public/matrix_car/1_hero --out-dir public/matrix_car/1_hero
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path

from PIL import Image

MARGIN = 4  # respiro trim: 4px cada lado
STRIP_BREATHE = 4  # respiro strip: 4px acima/abaixo
# Source frame canvas height (reference only). Strip height = max(trim) + 2*STRIP_BREATHE.
FRAME_H = 1254
PROD_SRC_W = 1700
PROD_DST_W = 64
# Arrays/JS: SCALE = 64/1700. Magick % = SCALE*100. Scaled strip W = SCALE * strip.width
PROD_SCALE = PROD_DST_W / PROD_SRC_W  # 0.0376470588
MAGICK_PCT = PROD_SCALE * 100  # 3.764705882352941 → -resize 3.764705882352941%


def px(v: float) -> int:
    """Art → production pixel (integer)."""
    return round(v * PROD_SCALE)


def production_scale_block(
    *,
    strip_w: int,
    strip_h: int,
    collision_rect: dict,
    array_centros: list[dict],
    meta_frames: list[dict],
    collision_y: float,
) -> dict:
    """Numbers only — PNG scale with: magick in.png -resize 3.7647% out.png"""
    return {
        "src_ref_w": PROD_SRC_W,
        "dst_w": PROD_DST_W,
        "scale": PROD_SCALE,
        "scale_js": "const SCALE = 64 / 1700; // 0.037647 — arrays/colisao; NAO usar 3.7647",
        "magick": f"magick input.png -resize {MAGICK_PCT}% output.png",
        "magick_pct": MAGICK_PCT,
        "scaled_strip_w": px(strip_w),  # SCALE * strip.width
        "note": (
            "Arrays: value64 = value1700 * (64/1700). "
            "Magick % = (64/1700)*100. scaled_w = SCALE * strip.width."
        ),
        "strip": {"w": px(strip_w), "h": px(strip_h)},
        "collision_rect": {
            "w": px(collision_rect["w"]),
            "h": px(collision_rect["h"]),
            "anchor": "center_of_car",
            "invisible": True,
            "from_art": {"w": collision_rect["w"], "h": collision_rect["h"]},
        },
        "collision_y_fixed": px(collision_y),
        "collision_centers": [
            {"i": c["i"], "index": c["index"], "x": px(c["x"]), "y": px(c["y"])}
            for c in array_centros
        ],
        "frames": [
            {
                "i": f["i"],
                "index": f["index"],
                "x": px(f["x"]),
                "y": px(f["y"]),
                "w": px(f["w"]),
                "h": px(f["h"]),
                "collision_center": {
                    "x": px(f["collision_center"]["x"]),
                    "y": px(f["collision_center"]["y"]),
                },
                "collision_rect": {
                    "x1": px(f["collision_rect"]["x1"]),
                    "y1": px(f["collision_rect"]["y1"]),
                    "x2": px(f["collision_rect"]["x2"]),
                    "y2": px(f["collision_rect"]["y2"]),
                    "w": px(f["collision_rect"]["w"]),
                    "h": px(f["collision_rect"]["h"]),
                },
            }
            for f in meta_frames
        ],
    }


def list_frame_paths(folder: Path, car_n: int) -> list[tuple[int, Path]]:
    """Numbered frames only — hero never enters."""
    out: list[tuple[int, Path]] = []
    for p in folder.glob(f"car_{car_n}_a*.png"):
        m = re.search(rf"car_{car_n}_a(\d+)\.png$", p.name)
        if not m:
            continue
        out.append((int(m.group(1)), p))
    out.sort(key=lambda t: t[0])
    return out


def trim_plus_margin(im: Image.Image, margin: int = MARGIN) -> tuple[Image.Image, int, int]:
    """Return (padded_rgba, content_w, content_h) — content = trim only, before margin."""
    im = im.convert("RGBA")
    bbox = im.getbbox()
    if bbox is None:
        crop = Image.new("RGBA", (1, 1), (0, 0, 0, 0))
    else:
        crop = im.crop(bbox)
    cw, ch = crop.size
    padded = Image.new("RGBA", (cw + 2 * margin, ch + 2 * margin), (0, 0, 0, 0))
    padded.paste(crop, (margin, margin), crop)
    return padded, cw, ch


def build_strip(folder: Path, out_dir: Path | None = None) -> tuple[Path, Path]:
    folder = folder.resolve()
    m = re.match(r"^(\d+)_hero$", folder.name)
    if not m:
        raise SystemExit(f"pasta esperada N_hero, recebi: {folder.name}")
    car_n = int(m.group(1))
    out_dir = (out_dir or folder).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    frames = list_frame_paths(folder, car_n)
    if not frames:
        raise SystemExit(f"nenhum car_{car_n}_a*.png em {folder}")

    # (index, path, padded, content_w, content_h)
    trimmed: list[tuple[int, Path, Image.Image, int, int]] = []
    largura_total = 0
    for idx, path in frames:
        im = Image.open(path)
        pad, cw, ch = trim_plus_margin(im, MARGIN)
        trimmed.append((idx, path, pad, cw, ch))
        largura_total += pad.width

    # One shared invisible collision rect = mean of min/max content bboxes
    content_ws = [t[3] for t in trimmed]
    content_hs = [t[4] for t in trimmed]
    min_w, max_w = min(content_ws), max(content_ws)
    min_h, max_h = min(content_hs), max(content_hs)
    col_w = round((min_w + max_w) / 2)
    col_h = round((min_h + max_h) / 2)
    collision_rect = {
        "w": col_w,
        "h": col_h,
        "anchor": "center_of_car",
        "invisible": True,
        "from_min": {"w": min_w, "h": min_h},
        "from_max": {"w": max_w, "h": max_h},
        "note": "único retângulo = média (min+max)/2; anda no centro do carro",
    }

    strip_h = max(t[2].height for t in trimmed) + 2 * STRIP_BREATHE
    strip = Image.new("RGBA", (largura_total, strip_h), (0, 0, 0, 0))
    array_centros: list[dict] = []
    x = 0
    meta_frames: list[dict] = []

    for i, (idx, path, pad, cw, ch) in enumerate(trimmed):
        # Vertical center with breathing room: y = strip_h/2 - trim.h/2
        y = (strip_h - pad.height) // 2
        cx = x + pad.width / 2
        cy = strip_h / 2
        strip.paste(pad, (x, y), pad)
        # retângulo invisível centrado no carro
        col_x1 = cx - col_w / 2
        col_y1 = cy - col_h / 2
        array_centros.append({"i": i, "index": idx, "x": cx, "y": cy})
        meta_frames.append(
            {
                "i": i,
                "index": idx,
                "source": path.name,
                "x": x,
                "y": y,
                "w": pad.width,
                "h": pad.height,
                "content_w": cw,
                "content_h": ch,
                "collision_center": {"x": cx, "y": cy},
                "collision_rect": {
                    "x1": col_x1,
                    "y1": col_y1,
                    "x2": col_x1 + col_w,
                    "y2": col_y1 + col_h,
                    "w": col_w,
                    "h": col_h,
                },
            }
        )
        x += pad.width

    out_png = out_dir / f"car_{car_n}_strip.png"
    out_png_64 = out_dir / f"car_{car_n}_strip_64.png"
    out_json = out_dir / f"car_{car_n}_strip.json"
    strip.save(out_png)

    # Production PNG: % = (64/1700)*100 ; scaled_w = SCALE * strip.width
    magick_pct_str = f"{MAGICK_PCT}%"
    subprocess.run(
        [
            "magick",
            str(out_png),
            "-resize",
            magick_pct_str,
            str(out_png_64),
        ],
        check=True,
    )

    payload = {
        "car": car_n,
        "folder": str(folder),
        "strip": out_png.name,
        "strip_64": out_png_64.name,
        "w": largura_total,
        "h": strip_h,
        "frame_canvas_h": FRAME_H,
        "margin": MARGIN,
        "strip_breathe": STRIP_BREATHE,
        "count": len(trimmed),
        "hero_excluded": True,
        "collision_rect": collision_rect,
        "collision_centers": array_centros,
        "collision_y_fixed": strip_h / 2,
        "frames": meta_frames,
        "production_scale": production_scale_block(
            strip_w=largura_total,
            strip_h=strip_h,
            collision_rect=collision_rect,
            array_centros=array_centros,
            meta_frames=meta_frames,
            collision_y=strip_h / 2,
        ),
    }
    payload["production_scale"]["strip_64"] = out_png_64.name
    payload["production_scale"]["magick_cmd"] = (
        f"magick {out_png.name} -resize {magick_pct_str} {out_png_64.name}"
    )
    out_json.write_text(json.dumps(payload, indent=2) + "\n")
    print(
        f"OK car_{car_n}_strip.png  {largura_total}x{strip_h}  "
        f"frames={len(trimmed)}  margin={MARGIN}px breathe={STRIP_BREATHE}px  → {out_png}"
    )
    print(
        f"OK collision_rect {col_w}x{col_h}  "
        f"(min {min_w}x{min_h} … max {max_w}x{max_h}) → {out_json}"
    )
    ps = payload["production_scale"]["collision_rect"]
    print(
        f"OK strip_64  magick -resize {magick_pct_str}  "
        f"SCALE*strip.w={px(largura_total)}  collision {ps['w']}x{ps['h']}  → {out_png_64}"
    )
    return out_png, out_json


def main() -> None:
    ap = argparse.ArgumentParser(description="Build matrix_car horizontal strip (trim+4px)")
    ap.add_argument("folder", type=Path, help="public/matrix_car/N_hero")
    ap.add_argument("--out-dir", type=Path, default=None, help="default: same as folder")
    args = ap.parse_args()
    build_strip(args.folder, args.out_dir)


if __name__ == "__main__":
    main()
