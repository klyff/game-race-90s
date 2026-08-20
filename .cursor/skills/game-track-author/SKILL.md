---
name: game-track-author
description: >-
  Authors chase-iso race tracks for game-race-90s: 10°/20° lips only,
  asphalt in every world, nitro as a gauge, no suspension, no figure-8
  until deckHeight exists. Use when editing controlPoints, rampZones,
  planetThemes surface, authored circuits, or when the user mentions
  game-track-author, remaster a track, or draw a ramp.
---

# Game track author

This is a Phaser 2D chase-iso racer. `ISO_X=1` / `ISO_Y=0.5` never change.
A ramp is a `rampZones` lip with height — not a painted slab on the bed.

## Non-negotiable

1. **Angles:** `RampIncline = 10 | 20` only. No 15 / 30 / 45. No wall on the grid.
2. **Surface:** every planet theme is `asphalt`. Rocky flagstones read as fake ramps. Keep planet wall / shoulder / tarmac / kerb / props.
3. **Ramps live in `rampZones`.** `fillRockyBed` is dead at runtime. Do not fake height with grout.
4. **Nitro is a gauge**, not discrete charges. Stock tank 10, burn 1/s, fill 1 point / 2.0 s. Perk `TURBO` (+12% always-on) is a different thing.
5. **No suspension.** This arcade has no spring. Do not invent a shop stat for it.
6. **No figure-8 / viaduct** until `deckHeight` exists. Jump-gap first, deck later.
7. After editing `controlPoints` or `rampZones`, run `npm run gen:cameras` and `npm run gen:traps` (or pass the track id). Do not invent trap slots by hand on generated tracks.

## Authored ramps today

| Track | Lips |
| ----- | ---- |
| Thunder Basin I | 10° @ 200, 10° @ 720, 20° @ 1240 |
| Thunder Basin II | no lip in the first ~200u; 10° @ 420; 20° @ 1520 |
| Chrome Verge I | no lip in the first ~200u; 10° @ 420; 20° @ 1860 |
| Bogmire Deep I | 10° teach @ 220; void 20° @ 980 |

`trackgen` ellipses do not emit lips. Do not regenerate the 27 generated layouts just to change asphalt — that is a theme flag.

## After a geometry edit

1. `npm run gen:cameras -- <trackId>`
2. `npm run gen:traps -- <trackId>`
3. Read `public/assets/cameras/<id>.json` and `public/assets/traps/<id>.json`
4. Start grid must stay trap-clean. Analyzer skips the first ~200 units. No zigzag join on that run-up.

Cameras: [isometric-cam-man](../isometric-cam-man/SKILL.md). Traps: [game-map-traps](../game-map-traps/SKILL.md).

## Soft-gates (shop later, no hard lock)

Index = `planet.index` (1–10). Do not key these on display names.

- W1 — teach 10° then 20° + nitro
- W2 — nitro tank on straights
- W3 — tyres (grip 0.72) + void 20°
- W4 / W6 — tyres + shield
- W5 / W7 — missile rack
- W8 — nitro on the long straight
- W9 / W10 — jump-gap / 8 when it exists: bigger nitro tank, **not** suspension

Shop pieces that stay: Rack, Shield, Tyres, Nitro tiers (+2 / +4 / +6 tank).
