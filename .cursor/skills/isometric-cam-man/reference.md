# Isometric cam man — numbers

## Classification (arc length, span 45)

| Kind | Curvature | Trigger |
| --- | --- | --- |
| Straight | `\|c\| < 0.006` and length ≥ 80 | zoom out 15% (`1.275`) |
| Speed | straight and length ≥ 400 | zoom out 35% (`0.975`) |
| Sweeper | `0.006 ≤ \|c\| < 1/70` | none (live policy) |
| Corner | `\|c\| ≥ 1/70` and length ≥ 24 | zoom in 10% (`2.20`) |
| Tight | `\|c\| ≥ 0.025` | zoom in 30% (`2.60`) |
| Ramp | authored `rampZones` | zoom out 10% (`1.35`) |

## Zoom band

| Role | Phaser zoom |
| --- | --- |
| Home / `0` | 1.75 |
| Auto curve | 2.20 |
| Auto straight | 1.275 |
| Auto ramp | 1.35 |
| Skill max in / `[` | 2.60 |
| Skill auto min out | 0.975 |
| Manual `]` | 50% of track AABB in the live viewport |
| Snap | 0.25 |

## Impulse (player only)

Hit: horizontal only, centre → 10% left (fast) → centre → 10% right → settle, **1 s**.

Explosion: random quadrant, 15% then opposite 15%, H and V together. Zoom ×1.30 then ×0.80; hold 0.80 until `respawnedThisStep`. Explosion replaces a simultaneous hit.

## Keys

| Key | Player racing | Watch / quit |
| --- | --- | --- |
| `[` `]` `0` | zoom in / out / home | same |
| Arrows | steer | cycle follow target |
| Space | hop | jump to cluster / attacks |

## Runtime files

- `src/domain/camera/CameraDirector.ts` — manual > trigger > live
- `src/domain/camera/CameraImpulse.ts` — shake + wreck zoom punch
- `src/domain/camera/AccidentWatch.ts` — spectator accidents
- `src/domain/camera/innerWallPark.ts` — quit park pose
