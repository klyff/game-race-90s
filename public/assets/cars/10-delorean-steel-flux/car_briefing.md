# DeLorean

- **id / pasta:** `10-delorean-steel-flux`
- **displayName / como chamar:** DeLorean
- **callName:** DeLorean
- **hero:** frame 07 → `car_hero.png` (loja, garagem, resultados)
- **nível:** heavy · world **1** · flux · **$3,000,000**
- **strip:** 32 frames · índice 0 = 6h · +11.25° anti-horário
- **origem:** pose-gabarito DeLorean (ficha) → pixel art arcade; yaw bate com `reference_frames/frame_00…31`

## Loja (game-ui)

Disponível desde o **mundo 1**. Preço de lista **$3M** (sell 80% = $2.4M). Hero = frame 07.
Stat bars no topo absoluto da frota — velocidade, grip, armadura, motor, freio, munição.
**PLAYER ONLY** — NPCs, watch e debug-IA **nunca** dirigem o DeLorean.

## Física (arcade / godot-genre-racing consult)

O **melhor carro do jogo**. Fun > realism, COM plantado, FLUX. `maxSpeed` **136** (~15% abaixo do teto antigo 160) para não virar glass cannon; armadura e massa altas. FX de fogo/raios acima de **140 MPH**.

**Flux overdrive (≥140 MPH no dial):** rastro de fogo no lugar dos pneus (`FluxTrailEffect`) + raios saindo do corpo (`FluxLightningEffect`). Só o DeLorean. Assets pixel: `public/assets/fx/flux_fire_strip.png`, `flux_bolt_strip.png`.

| stat | Orange Bomber | DeLorean |
| --- | ---: | ---: |
| mass | 1100 | **1120** |
| enginePower | 35 | **48** |
| brakeForce | 50 | **58** |
| maxSpeed | 73 | **136** |
| grip | 33 | **42** |
| steerRate | 2.55 | **3.05** |
| steerSpeedFalloff | 0.40 | **0.30** |
| armor | 0.50 | **0.82** |
| ammoCapacity | 16 | **24** |
| perk | arsenal | **flux** |
| price | $570k | **$3M** |
| unlock | world 3 | **world 1** |

Legacy id `delorean` (matrix) permanece aposentado; o vivo é `10-delorean-steel-flux`.
