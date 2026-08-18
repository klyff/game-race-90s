---
name: iso-car-strip
description: >-
  Redraws one isometric car as a 32-frame clock strip plus two HQ side stills
  from a model-X handoff pack. Use when the user asks to redraw a car strip,
  iso-car-strip, fleet strip, clock sprites, or to generate car-N frames from
  tools/spritegen/handoff/{id}.
disable-model-invocation: true
---

# Iso car strip

Draw a car from **model X**. Do not resample, shear, or flip an old strip.

Read [CLOCK.md](CLOCK.md) before any image. The paste-ready brief is [CLAUDE_PROMPT.md](CLAUDE_PROMPT.md).

Cursor's full pipeline (QA, pack, midpoint collision, install) is `.cursor/skills/sprite-strip/`.

## Inputs (refuse if missing)

```
tools/spritegen/handoff/{carId}/
  IDENTITY.md
  refs/hero.png
```

`refs/front.png`, `refs/side.png`, `refs/rear.png` are optional. `refs/identity-sheet.png` is identity only — **not** a pose table.

## Outputs

```
tools/spritegen/redrawn/{carId}/
  00.png … 31.png     # 128×128, RGBA, transparent ground
  hq-right.png        # 512×512, 3/4 front right (frame-0 family)
  hq-left.png         # 512×512, 3/4 front left (frame-8 family)
```

HQ stills are new drawings, not nearest-neighbour upscales of a 64px cell.

## Contract (not negotiable)

- **32 frames.** One every 1.875 clock minutes. Do not change N.
- Cell **128×128**. The car never touches the border. Size comes from the fixed world solids — do not fill the cell.
- Ground pin: chassis center on asphalt = pixel **(64, 70)** in every frame (`origin` `{x:0.5, y:0.550512}`). Same pin or the sprite wobbles.
- Frame 0 = nose **down-right**. Increasing index = **clockwise on screen**.
- Front ≠ rear on every frame. Frame 0 and frame 16 must be opposites (grille vs spoiler).
- Left ≠ right if the car is asymmetric — draw the other side; do not flip.
- Style: 16-bit chunky pixel art. Match `refs/hero.png` and `public/assets/cards/klyff.png`. No blur. No photoreal. No extra weapons.

## Forbidden

- Opening `public/assets/cars/{id}.png` or `fleet-src` to copy poses.
- Photoshop-rotate / shear of a 2D still.
- Mirroring frame 0 to make 8 or 16.
- Per-frame scale changes.
- Offsetting the finished strip to “fix” a bad yaw.

## Workflow

Copy this list and tick it:

```
- [ ] Read IDENTITY.md + hero
- [ ] Draw only 00, 08, 16, 24
- [ ] Confirm 00≠16 (front vs rear) and 08 is the other FRONT 3/4
- [ ] Draw remaining 28 in batches of 4, each batch using CLOCK.md + the four anchors
- [ ] Draw hq-right and hq-left
- [ ] npm run gen:qa-strip -- {carId}
- [ ] npm run gen:pack-redrawn -- {carId}
- [ ] Fix any failing frame; do not rotate the strip
```

### Image prompt (game cell)

Attach `refs/hero.png` plus any extra refs. Fill braces from IDENTITY.md and [CLOCK.md](CLOCK.md):

```
16-bit isometric combat-racing car sprite, chunky pixel art, crisp pixels, no blur, no photorealism, no background.
128x128 canvas, transparent ground. Chassis center on asphalt at pixel (64, 70).
World size is FIXED (~4.0 long, 1.9 wide, 1.2 tall). This pose the car is about {w}×{h} pixels. Do not fill the cell. Empty space is correct.
Orthographic 2:1 isometric. Camera fixed.
Same car as the attached hero: {lock list from IDENTITY.md}.
Pose frame {k} of 32. Minute hand at {minute} ({face}). Nose points {nose} on screen.
Visible: {sees}.
Draw this yaw from scratch. Do not mirror another frame.
```

### Image prompt (HQ still)

```
16-bit isometric combat-racing car, chunky pixel art, crisp pixels, no blur, no photorealism.
512x512 canvas, transparent ground, car large in frame with a small margin.
Same car as the attached hero: {lock list from IDENTITY.md}.
Three-quarter front {right|left}, nose {down-right|down-left}.
Headlights and hood weapons visible. Not a rear view.
```

## After images exist

```bash
npm run gen:qa-strip -- {carId}
npm run gen:pack-redrawn -- {carId}
```

QA writes `redrawn/{carId}/qa-anchors.png` (frames 0 / 8 / 16 / 24). It fails if a cell is not 128×128, if paint touches the 4px margin, or if frames 0 and 16 look like the same pose.

Pack writes `redrawn/{carId}/strip.png` (4096×128) and pins one shared origin. It does not invent angles.

Install into the game **only after** a human race check:

```bash
npm run gen:pack-redrawn -- {carId} --install
```

Race check: headlights stay on the **nose** going and coming. Half turn: spoiler on the tail, never on the grille.

## Next car

New folder `tools/spritegen/handoff/{id}/` with its own IDENTITY + hero. Same skill. Same clock. No new contract.
