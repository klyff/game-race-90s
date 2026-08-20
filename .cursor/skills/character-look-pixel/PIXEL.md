# Character look pixel — 16/24-bit lock

16/24-bit here means SNES / arcade richness (hue-shifted ramps, readable clothes), **not** NES 4-color, **not** photoreal 24-bit painting.

## Must

- Hard edges. Every pixel opaque or transparent. No auto-AA.
- Background is fully transparent (PNG32 ARGB). Never an opaque black/dark studio.
- Hue shift: shadows cooler, highlights warmer.
- Selective outline (lit edges lighter, shadow edges dark).
- One dither style, never on the face.
- Hair is a silhouette + 2–3 shade steps, not strands.
- Clothes: big shapes first (jacket, pants, shoes). Buttons only if they read at 1x.
- Appendages at least 2 px wide.

## Must not

- Photoreal skin, blur, bloom, lens.
- Pillow shading (dark ring around every form).
- Mixed 1x and 2x pixel sizes.
- Semi-transparent halo against the background.
- Facial micro-detail that dies at game size.

## Face from a photo

Keep: hair color/cut, skin tone, eye tone, marks, age, presentation.
Drop: pores, photo grain, lens bokeh.
The body is drawn in the same pixel density as the head — never a photo head on a pixel body.
