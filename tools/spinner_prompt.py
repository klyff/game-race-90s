#!/usr/bin/env python3
"""Build one isometric-car-spinner GenerateImage prompt from a run spec + targets."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

SKILL = Path("/Users/klyff/.cursor/skills/isometric-car-spinner")
TARGETS = SKILL / "generation_targets.json"
BG = "#00B140"


def axis_px(frame: dict) -> tuple[float, float]:
    w, h = frame["canvas"]["w"], frame["canvas"]["h"]
    return w / 2.0 + frame["axis_offset"]["x"], h / 2.0 + frame["axis_offset"]["y"]


def build(spec: dict, frame_i: int, anchor: dict | None, retry: str | None) -> str:
    metrics = json.loads(TARGETS.read_text())
    fr = metrics["frames"][frame_i]
    ax, ay = axis_px(fr)
    deg = frame_i * 11.25
    lines = [
        "MEDIUM (mandatory — never omit, never override with photorealism):",
        "  PIXEL ART arcade sprite, not a photograph, not a 3D render, not a glossy",
        "  illustration. Visible pixels, limited palette, crisp readable silhouette.",
        "  No PBR, no chrome reflections, no film grain, no raytraced lighting.",
        "  This game downscales to ~64px; extra photoreal detail is wasted and wrong.",
        "  Hold proportion and the exact yaw. Do not improve the car into realism.",
        "",
        "Draw a NEW car from the spec below. Do NOT redraw, reskin, or morph",
        "the car in the FIRST attached image.",
        "",
        "The FIRST attached image is a POSE GABARITO only (camera, this slot's yaw,",
        "scale, axis, ground contact). It is a DeLorean used as an ANGLE GUIDE, not",
        "a style or body reference. Forbidden to copy from it: stainless wedge,",
        "gull-wing doors, low sports-coupe silhouette, brushed-metal panels,",
        "DeLorean identity of any kind.",
        "",
        "Body, cabin, bed/trunk, livery, and weapons come ONLY from this spec",
        "(and from frame 1 on, from the SECOND attached image — the previously",
        "generated frame of THIS new car).",
        f"  Body type: {spec['body_type']}",
        f"  Base color: {spec['base_color']}",
        f"  Livery / decoration: {spec['livery']}",
        f"  Style: {spec['style_tag']}",
        f"  Background: solid fill, HEX {spec.get('background_hex', BG)}",
        "",
        "Camera / pose — copy EXACTLY from the first reference image, do not reinterpret.",
        "Copy camera and yaw only. Do not copy the photo car's body:",
        "  - Same isometric camera height and tilt",
        f"  - YAW CLOCK (32 frames, rigid): this is frame {frame_i} of 32 = {deg:g}°",
        "    counter-clockwise from frame 0. Frame 0 = 0° = car pointing 6 o'clock.",
        "    Copy THIS frame's yaw from the first attached photo.",
        "    Do not invent a neighboring angle. Do not skip a step.",
        f"  - Same rotation axis: bounding-box center at pixel ({ax:.1f}, {ay:.1f})",
        f"    on a canvas of {fr['canvas']['w']}x{fr['canvas']['h']}px — do not re-center",
        f"  - Same scale: car bounding-box diagonal ≈ {fr['bbox_diag']:.0f}px, ±6%",
        "  - Same ground-contact point / shadow as the first reference image",
        "  - Wheels must stay large, chunky, and readable at 64px",
        "  - The mounted weapon must stay on the SAME hardpoint (hood / roof / rear)",
        "",
    ]
    if frame_i > 0:
        lines += [
            "Style continuity — copy EXACTLY from the SECOND attached reference image",
            "(the previously generated frame of this same new car):",
            "  - Exact same body color, stripe color/placement, weapon, wheels, background",
            "  - This is the same car, just rotated 11.25° further counter-clockwise",
            "",
            "Locked style anchor — do not drift:",
        ]
        for key, val in (anchor or {}).items():
            lines.append(f"  - {key}: {val}")
        lines.append("")
    else:
        lines += [
            "This is frame 0 — render the spec body cleanly, not the DeLorean in the",
            "pose photo. Concrete weapon, chunky wheels, visible stripes. Pixel art",
            "arcade, not a toy, not photoreal.",
            "",
        ]
    lines += [
        f"Output size: exactly {fr['canvas']['w']}x{fr['canvas']['h']}px.",
        "Do not add borders, labels, or padding.",
    ]
    if retry:
        lines += ["", "Previous attempt failed validation — fix these, do not repeat them:", retry]
    return "\n".join(lines)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--run-dir", required=True)
    ap.add_argument("--frame", type=int, required=True)
    ap.add_argument("--retry", default="")
    args = ap.parse_args()
    run = Path(args.run_dir)
    spec = json.loads((run / "spec.json").read_text())
    anchor_path = run / "style_anchor.json"
    anchor = json.loads(anchor_path.read_text()) if anchor_path.exists() else None
    print(build(spec, args.frame, anchor, args.retry or None))


if __name__ == "__main__":
    main()
