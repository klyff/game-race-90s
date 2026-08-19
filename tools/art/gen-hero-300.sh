#!/bin/bash
# Downscale matrix vitrine stills to 300px. Never overwrites car_N_hero.png.
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
shopt -s nullglob
for dir in "$root"/public/matrix_car/*_hero; do
  n="$(basename "$dir" | sed 's/_hero$//')"
  src="$dir/car_${n}_hero.png"
  dst="$dir/car_${n}_hero_300.png"
  if [[ ! -f "$src" ]]; then
    continue
  fi
  sips -Z 300 "$src" --out "$dst" >/dev/null
done
echo "hero 300px stills written"
