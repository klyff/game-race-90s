# Prompt — rear half-rotation (15 frames × 12°)

Use with the hero in the same folder as the only identity reference.
Canvas: **1700×1254**, transparent, car centered on the fixed axis (850, 627).
Clock rule: **0° = wall-clock 6 = front**. Nose = clock hand. Clockwise yaw.

## Angles (rear half only)

| Frame file suffix | Angle | Clock (approx.) | Sees |
|---|---:|---|---|
| `_a090` | 90° | 9 | perfect **left-side** profile |
| `_a102` | 102° | | rear-left starting |
| `_a114` | 114° | | |
| `_a126` | 126° | | |
| `_a138` | 138° | | |
| `_a150` | 150° | | |
| `_a162` | 162° | | |
| `_a174` | 174° | ~12 | almost full rear |
| `_a186` | 186° | ~12 | full / just past rear |
| `_a198` | 198° | | |
| `_a210` | 210° | | |
| `_a222` | 222° | | |
| `_a234` | 234° | | |
| `_a246` | 246° | | |
| `_a258` | 258° | ~3 | almost **right-side** profile from the rear |

Output path (same folder as the hero):

```
dist/assets/matrix_car/{N}_hero/car_{N}_a090.png
...
dist/assets/matrix_car/{N}_hero/car_{N}_a258.png
```

## Prompt (paste into the image model; attach the folder hero)

```
Create the rear-view half-rotation of the same car sprite.

Keep exactly the same vehicle identity, proportions, wheel size, suspension height, roofline, hood-mounted weapons (if any), body colors, racing stripes, tires, pixel-art shading, black outline, glossy highlights, and 16-bit SNES / Rock’n Roll Racing style as the attached hero reference.

This car must be drawn in the rear-facing half of the rotation only, covering these 15 angles with 12-degree increments:
90°, 102°, 114°, 126°, 138°, 150°, 162°, 174°, 186°, 198°, 210°, 222°, 234°, 246°, 258°.

Interpretation of the angles (wall clock; 0° = number 6 = front; nose = clock hand; clockwise):
- 90° = perfect left-side profile
- 180° = full rear view
- 258° = almost right-side profile from the rear side

Important:
- keep the sprite centered on the canvas axis
- keep scale identical across all frames (no zoom, no fit-to-box)
- keep the same canvas size for every frame: 1700×1254 pixels
- keep transparent background (or pure black studio void for chroma-key)
- preserve the exact weapon placement and body details from the hero
- draw the back of the car consistently, including rear bumper, tail lights, rear window, trunk/rear hatch area, and correct perspective for each angle
- orthographic 2:1 dimetric projection (ISO_X=1, ISO_Y=0.5); diagonal body lines 2px horizontal : 1px vertical — never 30° true isometric
- do not redesign the car; this is the same car rotated through the rear half
- generate ONE frame per request for angle {ANGLE}°; filename car_{N}_a{ANGLE:03d}.png
```

Replace `{ANGLE}` and `{N}` per frame. Always attach `car_{N}_hero.png` as the identity lock.
