# Redrawn output

Claude Code writes frames here. This repo does **not** invent poses.

```
redrawn/{carId}/
  00.png … 31.png
  hq-right.png
  hq-left.png
  qa-anchors.png     # npm run gen:qa-strip
  strip.png          # npm run gen:pack-redrawn
```

Do not copy `strip.png` into `public/assets/cars/` until a race check passes (headlights on the nose both ways; spoiler on the tail after a half turn). Then:

```bash
npm run gen:pack-redrawn -- {carId} --install
```
