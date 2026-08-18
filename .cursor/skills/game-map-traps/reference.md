# Game map traps — numbers

`worldIndex` = `planet.index` (1-based).

## Pool and spawn

| World | Crate slots | Crates spawn | Drum slots | Drums spawn |
| --- | --- | --- | --- | --- |
| 1 | 10 | 4 | 5 | 2 |
| 2 | 12 | 5 | 7 | 3 |
| 3 | 14 | 6 | 9 | 4 |
| 10 | 28 | 13 | 23 | 11 |

```
crateSlots = 10 + (worldIndex - 1) * 2
crateSpawn = min(crateSlots, 4 + (worldIndex - 1))
drumSlots  = 5 + (worldIndex - 1) * 2
drumSpawn  = floor(drumSlots / 2)
```

## Crate hit

| What | Value |
| --- | --- |
| Speed keep | 0.70 (−30%) |
| Energy | −0.07 |
| Wood life | 4 s |
| Size vs car | 0.45 of car length |
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

Size vs car: same puck as a mine (`GASOLINE_SIZE_OF_CAR = 0.28`).

## Placement

- Lateral: `±(halfWidth + 0.45 * shoulderWidth)` — shoulder, not racing line.
- Skip start/grid window (first ~40 units past the line).
- Skip authored `rampZones` (plus a short pad).
- Min arc gap: 2 car lengths (~8 world units).
- Alternate sides. Prefer straights and sweeper exits.

## Pixel art (`npm run gen:traps-art`)

Authored in `tools/art/generate-traps.ts`. Hard edges, light top-left, transparent ground.

| File | Size | Notes |
| --- | --- | --- |
| `crate.png` | 64×64 | Iso box, wood + iron corners |
| `crate-smash-01…04.png` | 64×64 | Crack → split → burst → chips |
| `crate-stack-2/3.png` | 64×64 | Stacked stills |
| `gasoline.png` | 64×64 | Dirty red 3/4 iso drum |
| `gasoline-stack-2/3.png` | 64×64 | Stacked stills |
| `wood-chip-01…06.png` | 16×16 | Debris for the 4 s settle |

HUD `world-gasoline.png` stays in HUD. Do not import Kenney. If it fails at 1×, cut detail.
