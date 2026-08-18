# Fit — generated still → 128 cell

Image gen writes ~1024×1024 RGB with a **white studio ground**. The game cell is 128×128 RGBA, pin **(64, 70)**, 4px margin.

Do not leave the white square. Do not scale the car to fill the cell.

## 3/4 painted size (frames 0, 8, 16, 24)

About **90×60** px. Full front/rear ~50×58. Profile ~90×38. Same world solids. Empty space is correct.

## Steps

1. Flood from the **corners** (and mid-edges). Treat near-white / light grey / near-black as ground → alpha 0.
2. Do **not** chroma-key every white pixel — a white car would vanish. Only ground connected to the border.
3. Crop to the opaque bbox.
4. Scale with nearest-neighbour so the bbox fits the pose budget (90×60 for 3/4).
5. Paste so the bbox center sits on **(64, 70)**. Clamp to the 4px margin.
6. Write `tools/spritegen/redrawn/{id}/{k}.png`.

## Check

- Cell is 128×128 RGBA.
- Paint does not touch the 4px border.
- No leftover white card behind the car.
- All four anchors share the same pin — otherwise the sprite wobbles.
