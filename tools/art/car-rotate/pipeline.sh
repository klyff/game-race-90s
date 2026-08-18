#!/usr/bin/env bash
# Local car-rotation pipeline (no Cursor GenerateImage).
#
# Art canvas: 1024×1024 (native or reused).
# Only scale in the project: DST/SRC → default 64/1024 (constant %).
# ImageMagick owns resize (Point/NEAREST). Python owns edge flood-fill chroma
# (safer for black tires/guns than a global IM threshold).
#
# Usage:
#   tools/art/car-rotate/pipeline.sh car_orange
#   tools/art/car-rotate/pipeline.sh car_orange \
#     --assets /path/to/assets \
#     --src 1024 --dst 64
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CAR="${1:?usage: pipeline.sh <car_id> [--assets DIR] [--src N] [--dst N]}"
shift || true

ASSETS="${CURSOR_ASSETS:-$HOME/.cursor/projects/Users-klyff-git-game-race-90s/assets}"
SRC=1024
DST=64

while [[ $# -gt 0 ]]; do
  case "$1" in
    --assets) ASSETS="$2"; shift 2 ;;
    --src) SRC="$2"; shift 2 ;;
    --dst) DST="$2"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

if ! command -v magick >/dev/null 2>&1; then
  echo "ImageMagick (magick) not found. brew install imagemagick" >&2
  exit 1
fi

FRAMES_DIR="$REPO_ROOT/frames_${SRC}/$CAR"
OUT_DIR="$REPO_ROOT/out"
HERO_300="$REPO_ROOT/frames_300/$CAR/${CAR}_hero_300.png"
mkdir -p "$FRAMES_DIR" "$OUT_DIR"

echo "== pipeline $CAR  SRC=$SRC DST=$DST =="
echo "assets: $ASSETS"
echo "frames: $FRAMES_DIR"

# --- 1) Normalize every frame to SRC×SRC PNG in frames_SRC/CAR/ ---
# f00: hero 300 → SRC with Point (NEAREST). Same canvas stretch for all heroes.
if [[ -f "$HERO_300" ]]; then
  magick "$HERO_300" -filter Point -resize "${SRC}x${SRC}!" \
    "$FRAMES_DIR/${CAR}_f00.png"
  echo "f00 from hero_300 → ${SRC} (Point)"
else
  echo "missing hero: $HERO_300" >&2
  exit 1
fi

# f01..f35: from Cursor assets dump (or any dir via --assets)
missing=0
for n in $(seq 1 35); do
  idx=$(printf '%02d' "$n")
  src_png="$ASSETS/${CAR}_f${idx}.png"
  if [[ ! -f "$src_png" ]]; then
    # UUID-suffixed dumps from GenerateImage
    match=$(ls -1 "$ASSETS"/${CAR}_f${idx}-*.png 2>/dev/null | head -1 || true)
    if [[ -n "${match:-}" && -f "$match" ]]; then
      src_png="$match"
    else
      echo "MISSING asset for f${idx} under $ASSETS" >&2
      missing=$((missing + 1))
      continue
    fi
  fi
  # Exact SRC×SRC with Point (NEAREST). Already-SRC is a no-op resize.
  magick "$src_png" -filter Point -resize "${SRC}x${SRC}!" \
    "$FRAMES_DIR/${CAR}_f${idx}.png"
done

if [[ "$missing" -gt 0 ]]; then
  echo "abort: $missing frames missing in $ASSETS" >&2
  exit 1
fi

count=$(ls -1 "$FRAMES_DIR"/${CAR}_f*.png | wc -l | tr -d ' ')
echo "normalized $count frames @ ${SRC}x${SRC}"

# --- 2) Chroma: edge flood-fill black → alpha (Python; IM-safe companion) ---
for f in "$FRAMES_DIR"/${CAR}_f*.png; do
  python3 "$REPO_ROOT/tools/art/hero_chroma_key.py" "$f" "$f"
done
echo "chroma done"

# --- 3) Strip + JSON: single constant FACTOR = DST/SRC ---
python3 "$REPO_ROOT/build_strip.py" "$FRAMES_DIR" \
  "$OUT_DIR/${CAR}_strip_${DST}.png" \
  "$OUT_DIR/${CAR}_strip_${DST}.json" \
  --src "$SRC" --dst "$DST"

echo "OK → $OUT_DIR/${CAR}_strip_${DST}.png"
echo "OK → $OUT_DIR/${CAR}_strip_${DST}.json"
