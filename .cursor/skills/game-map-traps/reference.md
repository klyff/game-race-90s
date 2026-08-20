# Game map traps — numbers

`worldIndex` = `planet.index` (1-based).

## Pool and spawn

| World | Crate slots | Crates spawn | Drum slots | Drums spawn |
| --- | --- | --- | --- | --- |
| 1 | 16 | 6 | 8 | 3 |
| 2 | 19 | 8 | 11 | 5 |
| 3 | 22 | 10 | 14 | 6 |
| 10 | 45 | 21 | 37 | 18 |

```
scale = 1.6
crateSlots = round((10 + (worldIndex - 1) * 2) * scale)
crateSpawn = min(crateSlots, round((4 + (worldIndex - 1)) * scale))
drumSlots  = round((5 + (worldIndex - 1) * 2) * scale)
drumSpawn  = round(floor((5 + (worldIndex - 1) * 2) / 2) * scale)
```

## Crate hit

| What | Value |
| --- | --- |
| Speed keep | 0.70 (−30%) |
| Energy | −0.07 |
| Wood life | 4 s |
| Size vs car | 0.56 of car length |
| Sound | `RaceAudio.playCrateHit` → `ImpactVoice` wood |

## Drum blast

```
blastRadius = drumRadius + 2 * carLength
band = floor(distance / blastRadius / 0.10)
damage = max(0, 1 - band * 0.13)
```

Contact car (the one that touched the drum) is always **1.0**, even if the band would be less.

| Distance / radius | Band | Damage |
| --- | --- | --- |
| 0–10% | 0 | 100% |
| 10–20% | 1 | 87% |
| 50–60% | 5 | 35% |
| ≥80% | ≥8 | 0 |

Visual scale vs car wreck: **1.8**. Burn mark on asphalt. No armor, no `WEAPON_DAMAGE_SCALE`.

Size vs car: `GASOLINE_SIZE_OF_CAR = 0.336` (+20%). Uncoupled from the mine.

## Placement

- Lateral: `trapSeat(halfWidth, kind)` — straights `halfWidth - 5.5`; corners / tights pull inward. Drums get +2.8 extra inset. Puck stays inside `halfWidth`. Tight apex sits on the outside.
- Skip start/grid window (first ~200 units past the line).
- Skip authored `rampZones` (plus a short pad).
- Min arc gap: 2 car lengths (~8 world units).
- Alternate sides. Prefer straights and sweeper exits.

## Pixel art (`npm run gen:traps-art`)

Authored in `tools/art/generate-traps.ts`. Pixel step is **X=+2, Y=+1**
(isometric 2:1). Slim tall props — no √2 width inflate. Hard edges, light
top-left, transparent ground.

| File | Size | Notes |
| --- | --- | --- |
| `crate.png` | 64×64 | 2:1 iso box (lid 28×14, integer stairs) |
| `crate-smash-01…04.png` | 64×64 | Crack → split → burst → chips |
| `crate-stack-2/3.png` | 64×64 | Stacked stills |
| `gasoline.png` | 64×64 | Slim red drum, lid ellipse 16×8 |
| `gasoline-stack-2/3.png` | 64×64 | Stacked stills |
| `wood-chip-01…06.png` | 16×16 | Debris for the 4 s settle |

HUD `world-gasoline.png` stays in HUD. Do not import Kenney. If it fails at 1×, cut detail.
