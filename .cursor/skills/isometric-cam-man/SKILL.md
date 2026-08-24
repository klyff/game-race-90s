---
name: isometric-cam-man
description: >-
  Analyzes race tracks into intelligent isometric camera presets — curve zoom-in,
  straight/speed zoom-out, ramp widen, and hot-point triggers. Use when authoring
  tracks, controlPoints, racing lines, rampZones, camera zoom, ChaseCamera,
  CameraDirector, or when the user mentions isometric-cam-man, hot points, or
  camera presets.
---

# Isometric cam man

The race camera is chase-isometric. The **angle never changes** (`ISO_X=1`, `ISO_Y=0.5`). Only zoom and follow target move.

## Non-negotiable

1. Player is racing → camera centre is **always** the player.
2. `quitedTheRace=true` or watch → centre is the **leader** (same chase-iso as the player, 25% farther). Arrows cycle place; `[` `]` `0` zoom. Do not follow crashes. The quit car parks on the inner wall; engine is silent.
3. Do not edit `ISO_X` / `ISO_Y`.

## After changing a track or line

1. Run `npm run gen:cameras` (or `npm run gen:cameras -- <trackId>`).
2. Read `public/assets/cameras/<trackId>.json`.
3. Check: long straights / speed runs zoom **out**; hairpins zoom **in**; authored `rampZones` get a ramp trigger. Sweepers have no trigger.
4. Hand-tune `targetZoom` / spans only if the human asks. Do not invent sectors.

The analyzer lives in `src/domain/camera/analyzeTrackCameras.ts`. The CLI is `tools/camgen/analyze.ts`.

## Zoom numbers (from today's 1.5–2.0 band)

See [reference.md](reference.md) for the full table, hit/explosion impulse, and key bindings.

Live policy is **conventional**: curves closer, fast straights farther. Home / tecla `0` is **1.75**. Manual `[` holds max zoom-in 10s; `]` holds 50%-of-track zoom 10s. Track triggers hold **3s**. User zoom beats hot points while the 10s window is open.

## When defining paths/lines

Call this skill in the same turn you edit `controlPoints`, `rampZones`, or `public/assets/lines/`. Regenerating lines does not update cameras — `gen:cameras` must run too.
