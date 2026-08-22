# Inventário matrix_car (as is)

Fonte: pastas em `public/matrix_car/` + [`INDEX.md`](./INDEX.md).  
Relógio: [`RELOGIO.md`](./RELOGIO.md) · 30 slots · `ângulo = índice × 12`.  
Frames `aXXX` 1700px **não estão no git** (tars em iCloud, `.gitignore`).

**Playable** = pasta `{N}_hero` (sem `x_`) + PNG strip_64 + JSON.  
**Parked** = `x_{N}_hero` — mais de 5 buracos no relógio; fora da loja / garagem.

## Ativos (`N_hero`)

| N | Nome | hero | hero_300 | strip_64 | json | count | buracos | playable | nota |
|--:|------|:----:|:--------:|:--------:|:----:|------:|---------|:--------:|------|
| 1 | Marauder | Y | Y | Y | Y | 30 | — | Y | buracos 4/12/15/25 preenchidos |
| 18 | CAMO STAR | Y | Y | Y | Y | 30 | — | Y | |
| 19 | Cyber Pink | Y | Y | Y | Y | 30 | — | Y | |
| 20 | Ash Comet | Y | Y | Y | Y | 30 | — | Y | |
| 21 | Red Streak | Y | Y | Y | Y | 30 | — | Y | 2º starter |
| — | Delorean | Y | Y | Y | Y | 30 | — | Y | `delorean_hero/`, não é o carro 1 |

## Parked (`x_N_hero`) — fora da loja

Critério: **>5 buracos** no relógio de 30. Não gerar arte neste passe. Reabrir só com ≥25 frames.

| pasta | Nome | frames | nota |
|-------|------|-------:|------|
| `x_2_hero` | LEÃO | 5/30 | só a025–a029; roda de 5 |
| `x_3_hero`…`x_17_hero` | (INDEX) | 0/30 | só vitrine |
| `x_22_hero`…`x_33_hero` | (INDEX) | 0/30 | só vitrine; `x_31_hero` tem lab de coordenadas |

## Labs nogo (fora da loja)

| pasta | cópia de | playable | nota |
|-------|----------|:--------:|------|
| `99_hero` | `1_hero` | watch `?watch=1&car=nogo-99` | linha verde; frameCount 30 |
| `98_hero` | `delorean_hero` | watch `?watch=1&car=nogo-98` | linha verde; frameCount 30 |

Não entram em `garageCarouselIds()` (ativos 1, 18–21 + Delorean).
