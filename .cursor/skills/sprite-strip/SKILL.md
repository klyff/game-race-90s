---
name: sprite-strip
description: >-
  Creates a 32-frame isometric car sprite-strip (128 cell, clock yaw), packs it,
  and writes the midpoint collision square. Use when the user asks to create,
  redraw, pack, or install a sprite-strip, fleet strip, clock sprites, car-N
  frames, or strips for every car_*_hero.png in public/assets/cars/new.
---

# Sprite-strip

One car → 32 clock poses → one horizontal strip. Draw from **model X**. Do not resample, shear, or flip an old sheet.

Read [CLOCK.md](CLOCK.md) before any image. The hero may face either way — see below. After image gen, fit the cell with [FIT.md](FIT.md). Collision is a car attribute, not paint — see [COLLISION.md](COLLISION.md). The cut (one midpoint square, no pose loop) is `.cursor/skills/game-sprint-sprites-2d/`.

A drawing-only paste brief still lives in `.cursor/skills/iso-car-strip/` (Claude Code / handoff pack). This skill is the Cursor pipeline.

**Best invoke:** human drops heroes in `public/assets/cars/new/`, then says `strip de todos`. Do every car’s four anchors first, show `new/anchors-preview.png`, then the remaining 28. How the human should talk to you: `.cursor/skills/game-sprint-sprites-2d/USAGE.md`.

## Inputs (refuse if missing)

New fleet — drop folder. One hero is enough. No IDENTITY.md required; the PNG is the matrix.

```
public/assets/cars/new/
  car_1_hero.png        # matrix + in-game presentation (Hero size)
  car_2_hero.png
```

Names are fixed: `{id}_hero.png` → strip `{id}_strip.png`. Ids are `car_1`, `car_2`, …
Hero size is **300×300** (`CART_PORTRAIT_SIZE`). Copy each inbox hero to `public/assets/cars/{id}_hero.png` so the garage can show it.

When the user says “strip de todos”, list `public/assets/cars/new/*_hero.png` (or `listNewCars()` in `tools/spritegen/new-cars.ts`) and do every car that has a hero.

Legacy handoff (one folder per car) still works:

```
tools/spritegen/handoff/{carId}/
  IDENTITY.md
  refs/hero.png
```

`refs/front.png`, `refs/side.png`, `refs/rear.png` are optional. `refs/identity-sheet.png` is identity only — **not** a pose table. Ignore IDENTITY if it still says 64×64; the cell is **128×128**.

## Outputs

```
tools/spritegen/redrawn/{carId}/
  00.png … 31.png     # 128×128, RGBA, transparent ground
  hq-right.png        # 512×512, 3/4 front right (frame-0 family)
  hq-left.png         # 512×512, 3/4 front left (frame-8 family)
  strip.png           # pack writes this: 4096×128

public/assets/cars/
  {carId}_hero.png    # same matrix, garage / presentation
  {carId}_strip.png   # strip — only after --install
```

HQ stills are new drawings, not nearest-neighbour upscales of a cell.

## Contract (not negotiable)

- **32 frames.** One every 1.875 clock minutes. Do not change N.
- Cell **128×128**. The car never touches the 4px border. Size comes from the fixed world solids — do not fill the cell.
- Ground pin: chassis center on asphalt = pixel **(64, 70)** in every frame (`origin` `{x:0.5, y:0.550512}`). Same pin or the sprite wobbles.
- Frame 0 = nose **down-right**. Increasing index = **clockwise on screen**.
- The hero may face **left or right**. That does not change frame 0. Draw the yaw from scratch. Do not rotate, flip, or shear the hero.
- Front ≠ rear on every frame. Frame 0 and frame 16 must be opposites (grille vs spoiler).
- Left ≠ right if the car is asymmetric — draw the other side; do not flip.
- Style: 16-bit chunky pixel art. Match `refs/hero.png` and `public/assets/cards/klyff.png`. No blur. No photoreal. No extra weapons.
- Fleet set stays **64** / ppu **8.143264**. A 128 car is drawn at 2× ppu; the runtime scales the sprite by `64/128` so world size matches the road.

## Forbidden

- Opening `public/assets/cars/{id}.png` or `fleet-src` to copy poses.
- Photoshop-rotate / shear of a 2D still — including “the hero faces the wrong way”.
- Mirroring frame 0 to make 8 or 16.
- Per-frame scale changes.
- Offsetting the finished strip to “fix” a bad yaw.
- Per-pose collision maps or a loop over yaw.
- `--install` before a human race check.

## Workflow

Copy this list and tick it:

```
- [ ] Read the hero (`new/{id}_hero.png` or handoff IDENTITY + hero). Note which way it faces. Do not correct it.
- [ ] Copy 300×300 hero to `public/assets/cars/{id}_hero.png`
- [ ] Draw only 00, 08, 16, 24 (00 = down-right even if the hero faces left)
- [ ] Fit each still into a 128 cell ([FIT.md](FIT.md)) — flood-clear studio ground, pin (64, 70)
- [ ] Confirm 00≠16 (front vs rear) and 08 is the other FRONT 3/4
- [ ] Draw remaining 28 in batches of 4, each batch using CLOCK.md + the four anchors
- [ ] Draw hq-right and hq-left
- [ ] npm run gen:qa-strip -- {carId}
- [ ] npm run gen:pack-redrawn -- {carId}
- [ ] npm run gen:collision-maps
- [ ] Fix any failing frame; do not rotate the strip
```

If frames already exist under `redrawn/{carId}/`, skip drawing and start at QA.

### Image prompt (game cell)

Attach `public/assets/cars/new/{id}_hero.png` (or handoff `refs/hero.png`). Fill braces from the hero and [CLOCK.md](CLOCK.md):

```
16-bit isometric combat-racing car sprite, chunky pixel art, crisp pixels, no blur, no photorealism, no background.
128x128 canvas, transparent ground. Chassis center on asphalt at pixel (64, 70).
World size is FIXED (~4.0 long, 1.9 wide, 1.2 tall). This pose the car is about {w}×{h} pixels. Do not fill the cell. Empty space is correct.
Orthographic 2:1 isometric. Camera fixed.
Same car as the attached hero: {lock list from the hero}.
Pose frame {k} of 32. Minute hand at {minute} ({face}). Nose points {nose} on screen.
Visible: {sees}.
The hero may face the other way. Draw this yaw from scratch. Do not rotate, flip, or mirror the hero.
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
npm run gen:collision-maps
```

QA writes `redrawn/{carId}/qa-anchors.png` (frames 0 / 8 / 16 / 24). It fails if a cell is not 128×128, if paint touches the 4px margin, or if frames 0 and 16 look like the same pose.

Pack writes `redrawn/{carId}/strip.png` (4096×128) and pins one shared origin. It does not invent angles.

`gen:collision-maps` writes `collisionSquare = (min + max) / 2` onto every car in `cars.json`. Do not derive the box from painted pixels.

Install into the game **only after** a human race check, and only when the user asks:

```bash
npm run gen:pack-redrawn -- {carId} --install
```

Race check: headlights stay on the **nose** going and coming. Half turn: spoiler on the tail, never on the grille. 128 without the runtime scale looks 2× too big on the track — that is expected before `VehicleView` applies `frameWidth / sheetCellSize`.

## Next car

Drop another `car_N_hero.png` in `public/assets/cars/new/`. Same skill. Same clock. No new contract.
