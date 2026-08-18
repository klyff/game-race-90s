# Prompt — front half-rotation (15 frames × 12°)

Companion to `PROMPT_REAR_HALF.md`. Same hero, same canvas **1700×1254**, axis centered.
Clock: **0° = wall-clock 6 = front**. Nose = clock hand. Clockwise.

## Angles (front half only)

Rear half already covers 90°…258°. Front half covers the rest:

| File | Angle | Sees |
|---|---:|---|
| `_a270` | 270° | perfect **right-side** profile |
| `_a282` | 282° | front-right starting |
| `_a294` | 294° | |
| `_a306` | 306° | |
| `_a318` | 318° | |
| `_a330` | 330° | |
| `_a342` | 342° | |
| `_a000` | 0° | **full front** (clock 6) |
| `_a012` | 12° | |
| `_a024` | 24° | |
| `_a036` | 36° | |
| `_a048` | 48° | |
| `_a060` | 60° | |
| `_a072` | 72° | |
| `_a084` | 84° | almost left profile from the front side |

## Prompt template

```
Create the front-view half-rotation of the same car sprite.

Keep exactly the same vehicle identity as the attached hero: proportions, wheel size, suspension, roofline, hood guns, body colors, stripes, lightbar, antennas, spoiler, off-road tires, pixel-art shading, black outline, glossy highlights, 16-bit SNES / Rock’n Roll Racing style.

Front-facing half only, 12° steps:
270°, 282°, 294°, 306°, 318°, 330°, 342°, 0°, 12°, 24°, 36°, 48°, 60°, 72°, 84°.

Clock (0° = number 6 = front; nose = clock hand; clockwise):
- 270° = perfect right-side profile
- 0° = full front view
- 84° = almost left-side profile from the front side

THIS FRAME: angle {ANGLE}°.

Important:
- centered on canvas axis; identical scale across frames
- canvas 1700×1254 (or square void then normalized); transparent / pure black void
- headlights and hood guns mark the FRONT; red taillights stay on the REAR
- orthographic 2:1 dimetric; no redesign; no zoom
```
