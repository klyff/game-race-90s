#!/usr/bin/env python3
"""Pack car_N_a*.png into car_N_sources.tar.gz and delete loose frame PNGs.

Keeps: car_N_hero.png, car_N_strip_64.png, car_N_strip.json.
Reason: regenerating 1700×1254 frames costs more than storing them compressed.

Usage:
  python3 tools/art/car-rotate/pack_matrix_sources.py public/matrix_car/1_hero
  python3 tools/art/car-rotate/pack_matrix_sources.py public/matrix_car --all
"""
from __future__ import annotations

import argparse
import re
import tarfile
from pathlib import Path


def pack_folder(folder: Path) -> Path | None:
    folder = folder.resolve()
    m = re.match(r"^(\d+)_hero$", folder.name)
    if not m:
        raise SystemExit(f"pasta esperada N_hero, recebi: {folder.name}")
    car_n = int(m.group(1))
    frames = sorted(folder.glob(f"car_{car_n}_a*.png"))
    if not frames:
        print(f"skip {folder.name}: nenhum car_{car_n}_a*.png")
        return None

    out_tar = folder / f"car_{car_n}_sources.tar.gz"
    # Rewrite archive cleanly from current loose frames
    with tarfile.open(out_tar, "w:gz") as tar:
        for p in frames:
            tar.add(p, arcname=p.name)

    for p in frames:
        p.unlink()

    print(f"OK {out_tar.name}  frames={len(frames)}  deleted loose a*.png  → {out_tar}")
    return out_tar


def main() -> None:
    ap = argparse.ArgumentParser(description="Pack matrix_car frames into car_N_sources.tar.gz")
    ap.add_argument("path", type=Path, help="N_hero folder OR public/matrix_car with --all")
    ap.add_argument("--all", action="store_true", help="pack every *_hero under path")
    args = ap.parse_args()
    root = args.path.resolve()
    if args.all:
        folders = sorted(
            d for d in root.iterdir() if d.is_dir() and re.match(r"^\d+_hero$", d.name)
        )
        if not folders:
            raise SystemExit(f"nenhuma pasta *_hero em {root}")
        for d in folders:
            pack_folder(d)
    else:
        pack_folder(root)


if __name__ == "__main__":
    main()
