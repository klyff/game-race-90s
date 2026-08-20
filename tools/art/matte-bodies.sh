#!/usr/bin/env bash
# Punch studio black to ARGB, trim to the silhouette, keep 10px air above hair.
# Floodfill from a 1px border so black clothes that are not edge-connected stay.
set -euo pipefail

DIR="${1:-public/assets/bodies}"
FUZZ="${FUZZ:-4%}"
PAD="${PAD:-10}"

if ! command -v magick >/dev/null; then
  echo "need ImageMagick magick" >&2
  exit 1
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

shopt -s nullglob
for src in "$DIR"/*.png; do
  base="$(basename "$src")"
  case "$base" in
    *-perfil.png) continue ;;
  esac
  dest="$tmp/$base"
  magick "$src" \
    -alpha set \
    -bordercolor '#000000' -border 1 \
    -fuzz "$FUZZ" -fill none -draw "color 0,0 floodfill" \
    -shave 1x1 +repage \
    -channel A -threshold 50% +channel \
    -trim +repage \
    -bordercolor none -border "$PAD" \
    "PNG32:$dest"
  mv "$dest" "$src"
  echo "$(identify -format '%f %wx%h' "$src")"
done

# perfil is the same still as profile
for src in "$DIR"/*-profile.png; do
  cp "$src" "${src%-profile.png}-perfil.png"
done
