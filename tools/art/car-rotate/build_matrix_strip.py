#!/usr/bin/env python3
"""Build car_N_strip_64.png + JSON from matrix_car numbered frames (hero excluded).

Keeps only the production strip on disk. Art-size strip is built in memory / temp
and discarded (rebuild anytime with this script when needed).

Algorithm (as specified):
  1. Collect car_N_a*.png by clock index (skip hero). Never compact holes.
  2. Emit 30 named slots, i == index. Missing slot = empty named cell.
  3. For each real frame: trim alpha bbox, then +16px left and +16px right.
  4. Collision from real frames only: w,h = (min+max)/2 of content bboxes.
  5. Production strip only: magick -resize (64/1700*100)% → car_N_strip_64.png
  6. compact_images.sh subprocess on that strip_64 only (hero stays out)

Usage:
  python3 tools/art/car-rotate/build_matrix_strip.py public/matrix_car/1_hero
  python3 tools/art/car-rotate/build_matrix_strip.py public/matrix_car/1_hero --out-dir public/matrix_car/1_hero
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import tarfile
import tempfile
from pathlib import Path

from PIL import Image

MARGIN_X = 16  # respiro trim: 16px esquerda + 16px direita = 32px
MARGIN_Y = 0   # vertical só via STRIP_BREATHE no canvas da strip
STRIP_BREATHE = 4  # respiro strip: 4px acima/abaixo
# Em produção (×64/1700): 16px ≈ 0.60 → round 1 ou 0
# Source frame canvas height (reference only). Strip height = max(trim) + 2*STRIP_BREATHE.
FRAME_H = 1254
PROD_SRC_W = 1700
PROD_DST_W = 64
# Arrays/JS: SCALE = 64/1700. Magick % = SCALE*100. Scaled strip W = SCALE * strip.width
PROD_SCALE = PROD_DST_W / PROD_SRC_W  # 0.0376470588
MAGICK_PCT = PROD_SCALE * 100  # 3.764705882352941 → -resize 3.764705882352941%
CLOCK_SLOTS = 30
REPO_ROOT = Path(__file__).resolve().parents[3]


def compact_strip_64(strip_64: Path) -> None:
    """PNG compact as a subprocess. Never the hero — strip_64 only."""
    script = REPO_ROOT / "compact_images.sh"
    if not script.is_file():
        print(f"WARN compact skip: missing {script}")
        return
    try:
        rel = strip_64.resolve().relative_to(REPO_ROOT)
    except ValueError:
        rel = strip_64
    backup = REPO_ROOT / "_originais" / rel
    backup.unlink(missing_ok=True)
    subprocess.run(
        ["bash", str(script), str(rel)],
        cwd=REPO_ROOT,
        check=True,
    )


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


def parse_hero_folder(folder: Path) -> tuple[str, str]:
    """`1_hero` → (`1`, `car_1`); `delorean_hero` → (`delorean`, `delorean`)."""
    m = re.match(r"^(.+)_hero$", folder.name)
    if not m:
        raise SystemExit(f"pasta esperada {{id}}_hero, recebi: {folder.name}")
    stem = m.group(1)
    prefix = f"car_{stem}" if stem.isdigit() else stem
    return stem, prefix


def list_frame_paths(folder: Path, prefix: str) -> list[tuple[int, Path]]:
    """Numbered frames only — hero never enters. Loose PNGs preferred."""
    out: list[tuple[int, Path]] = []
    for p in folder.glob(f"{prefix}_a*.png"):
        m = re.search(rf"{re.escape(prefix)}_a(\d+)\.png$", p.name)
        if not m:
            continue
        out.append((int(m.group(1)), p))
    out.sort(key=lambda t: t[0])
    return out


def extract_sources_tar(folder: Path, prefix: str, dest: Path) -> list[tuple[int, Path]]:
    """Extract {{prefix}}_sources.tar.gz into dest; return (index, path) list."""
    tar_path = folder / f"{prefix}_sources.tar.gz"
    if not tar_path.is_file():
        return []
    dest.mkdir(parents=True, exist_ok=True)
    with tarfile.open(tar_path, "r:gz") as tar:
        tar.extractall(dest)
    return list_frame_paths(dest, prefix)


def resolve_frame_paths(
    folder: Path, prefix: str
) -> tuple[list[tuple[int, Path]], Path | None]:
    """Return frames + optional temp dir to clean (when sourced from tar)."""
    frames = list_frame_paths(folder, prefix)
    if frames:
        return frames, None
    tmp = Path(tempfile.mkdtemp(prefix=f"matrix_car_{prefix}_"))
    frames = extract_sources_tar(folder, prefix, tmp)
    if not frames:
        # cleanup empty tmp
        try:
            tmp.rmdir()
        except OSError:
            pass
        return [], None
    return frames, tmp


def trim_plus_margin(
    im: Image.Image,
    margin_x: int = MARGIN_X,
    margin_y: int = MARGIN_Y,
) -> tuple[Image.Image, int, int]:
    """Return (padded_rgba, content_w, content_h) — content = trim only, before margin."""
    im = im.convert("RGBA")
    bbox = im.getbbox()
    if bbox is None:
        crop = Image.new("RGBA", (1, 1), (0, 0, 0, 0))
    else:
        crop = im.crop(bbox)
    cw, ch = crop.size
    padded = Image.new(
        "RGBA",
        (cw + 2 * margin_x, ch + 2 * margin_y),
        (0, 0, 0, 0),
    )
    padded.paste(crop, (margin_x, margin_y), crop)
    return padded, cw, ch


def build_strip(folder: Path, out_dir: Path | None = None) -> tuple[Path, Path]:
    folder = folder.resolve()
    stem, prefix = parse_hero_folder(folder)
    car_key: int | str = int(stem) if stem.isdigit() else stem
    out_dir = (out_dir or folder).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    frames, tmp_src = resolve_frame_paths(folder, prefix)
    if not frames:
        raise SystemExit(
            f"nenhum {prefix}_a*.png nem {prefix}_sources.tar.gz em {folder}"
        )

    try:
        by_index: dict[int, tuple[Path, Image.Image, int, int]] = {}
        for idx, path in frames:
            if idx < 0 or idx >= CLOCK_SLOTS:
                print(f"WARN skip {path.name}: index {idx} outside 0..{CLOCK_SLOTS - 1}")
                continue
            im = Image.open(path)
            pad, cw, ch = trim_plus_margin(im, MARGIN_X, MARGIN_Y)
            by_index[idx] = (path, pad, cw, ch)

        present = [by_index[i] for i in range(CLOCK_SLOTS) if i in by_index]
        if not present:
            raise SystemExit(f"nenhum frame 0..{CLOCK_SLOTS - 1} em {folder}")

        # Collision from real frames only — empty slots must not shrink the box.
        content_ws = [t[2] for t in present]
        content_hs = [t[3] for t in present]
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

        typical_w = max(1, round(sum(content_ws) / len(content_ws)))
        typical_h = max(1, round(sum(content_hs) / len(content_hs)))
        empty_pad, empty_cw, empty_ch = trim_plus_margin(
            Image.new("RGBA", (typical_w, typical_h), (0, 0, 0, 0)),
            MARGIN_X,
            MARGIN_Y,
        )

        # 30 named slots, i == clock index. Hole = empty named cell (no compact).
        slots: list[tuple[int, str, Image.Image, int, int, bool]] = []
        for index in range(CLOCK_SLOTS):
            if index in by_index:
                path, pad, cw, ch = by_index[index]
                slots.append((index, path.name, pad, cw, ch, False))
            else:
                slots.append((index, f"{prefix}_a{index:03d}.png", empty_pad, empty_cw, empty_ch, True))

        largura_total = sum(slot[2].width for slot in slots)
        strip_h = max(slot[2].height for slot in slots) + 2 * STRIP_BREATHE
        strip = Image.new("RGBA", (largura_total, strip_h), (0, 0, 0, 0))
        array_centros: list[dict] = []
        x = 0
        meta_frames: list[dict] = []

        for index, source, pad, cw, ch, hole in slots:
            y = (strip_h - pad.height) // 2
            cx = x + pad.width / 2
            cy = strip_h / 2
            if not hole:
                strip.paste(pad, (x, y), pad)
            col_x1 = cx - col_w / 2
            col_y1 = cy - col_h / 2
            array_centros.append({"i": index, "index": index, "x": cx, "y": cy})
            meta_frames.append(
                {
                    "i": index,
                    "index": index,
                    "source": source,
                    "empty": hole,
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

        out_png_art = out_dir / f"{prefix}_strip.png"  # discarded — rebuild when needed
        out_png_64 = out_dir / f"{prefix}_strip_64.png"
        out_json = out_dir / f"{prefix}_strip.json"

        # Art strip only in temp → magick → keep strip_64; delete any old art PNG on disk
        magick_pct_str = f"{MAGICK_PCT}%"
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp_path = Path(tmp.name)
        try:
            strip.save(tmp_path)
            subprocess.run(
                [
                    "magick",
                    str(tmp_path),
                    "-resize",
                    magick_pct_str,
                    str(out_png_64),
                ],
                check=True,
            )
        finally:
            tmp_path.unlink(missing_ok=True)
            out_png_art.unlink(missing_ok=True)

        compact_strip_64(out_png_64)

        sources_name = f"{prefix}_sources.tar.gz"
        payload = {
            "car": car_key,
            "folder": str(folder),
            "strip": None,
            "strip_64": out_png_64.name,
            "sources_tar": sources_name if (folder / sources_name).is_file() else None,
            "strip_art_discarded": True,
            "strip_art_note": (
                "arte grande não versionada; remonta com build_matrix_strip.py "
                "(lê a*.png soltos ou car_N_sources.tar.gz)"
            ),
            "w": largura_total,
            "h": strip_h,
            "frame_canvas_h": FRAME_H,
            "margin_x": MARGIN_X,
            "margin_y": MARGIN_Y,
            "strip_breathe": STRIP_BREATHE,
            "count": CLOCK_SLOTS,
            "clock_slots": CLOCK_SLOTS,
            "i_equals_index": True,
            "holes": [slot[0] for slot in slots if slot[5]],
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
            f"magick <temp_art_strip.png> -resize {magick_pct_str} {out_png_64.name}"
        )
        out_json.write_text(json.dumps(payload, indent=2) + "\n")
        print(
            f"OK art(temp) {largura_total}x{strip_h}  "
            f"slots={CLOCK_SLOTS} present={len(present)}  "
            f"margin_x={MARGIN_X}px (±16 → 32) breathe={STRIP_BREATHE}px  "
            f"(grande descartado)"
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
        return out_png_64, out_json
    finally:
        if tmp_src is not None:
            shutil.rmtree(tmp_src, ignore_errors=True)


def main() -> None:
    ap = argparse.ArgumentParser(
        description="Build matrix_car strip_64 + JSON (art PNG discarded)"
    )
    ap.add_argument("folder", type=Path, help="public/matrix_car/N_hero")
    ap.add_argument("--out-dir", type=Path, default=None, help="default: same as folder")
    args = ap.parse_args()
    build_strip(args.folder, args.out_dir)


if __name__ == "__main__":
    main()
