---
name: game-map-traps
description: >-
  Chooses track trap slots (wooden crates, gasoline drums, future props) and
  the seeded race subset by world. Use when authoring tracks, trap slots,
  caixotes, toneis, gasolineBarrels, Hazard CRATE, blast radius, or when the
  user mentions game-map-traps, gen:traps, or map traps.
---

# Game map traps

Traps sit on the tarmac. Straights hug the kerb (`halfWidth - 5.5`); corners and
hairpins pull inward so the puck stays inside the ribbon. They are diegetic: no HUD
counter. Feedback is speed, energy, asphalt burn, sound, camera impulse.

## Non-negotiable

1. No `Math.random()` / `Date.now()`. Seed = `planet.seed` + hash of `track.id`.
2. After changing `controlPoints` or `rampZones`, run `npm run gen:traps`.
3. Do not invent slots by hand on generated tracks. Analyzer writes the pool.
4. All race SFX go through `RaceAudio`: crate/drum hit = `ImpactVoice`, boom = `ExplosionVoice`.
5. Do not add trap widgets to the HUD.

## After changing a track

1. Run `npm run gen:traps` (or `npm run gen:traps -- <trackId>`).
2. Read `public/assets/traps/<trackId>.json`.
3. Check: slots on the tarmac (corners inset), not in the dirt, not on the grid, not on ramps, spaced ≥ 2 car lengths.
4. World 1 = 16 crate slots / 8 drum slots (pool ×1.6). Later worlds grow — see [reference.md](reference.md).

Analyzer: `src/domain/traps/analyzeTrackTraps.ts`. Pick: `src/domain/traps/pickRaceTraps.ts`. Rules: `src/domain/traps/TrapRules.ts`. CLI: `tools/trapgen/analyze.ts`.

## Race load

JSON (or live analyze) is the **pool**. `pickRaceTraps` chooses the subset for this world. Same seed → same layout.

## Hits

- **Crate:** speed × 0.70, energy −7%, wood chips stay 4 s, `playCrateHit`.
- **Drum, contact:** 100% energy, burn mark, burst **1.8×** car explosion, `playDrumHit` + `playExplosion`.
- **Drum, splash:** `band = floor(distance / blastRadius / 0.10)`, `damage = max(0, 1 - band * 0.13)`.
- **Blast radius:** drum radius + 2 car lengths.
- **Chain:** missile, mine blast, wreck nearby, debris, or another drum's blast.

## Stacks

Crates may spawn `stackHeight` 1–3. Drums are always 1 — a stacked barrel reads as a tower. Each piece is its own hazard. One break/boom chains the pile.

## New trap kinds

Add a kind to the JSON + `TrapRules` counts + a `HAZARD_KIND`. Same slots, same seed. Do not grow a second placement system.

## Art

World props live in `public/assets/traps/`. Run `npm run gen:traps-art` to redraw
crate / gasoline / wood chips (64×64 iso, hard edges). HUD `world-gasoline.png`
stays HUD-only. Pixel brief: [reference.md](reference.md).
