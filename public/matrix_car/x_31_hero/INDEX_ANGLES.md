# Coordenadas 2:1 — 31_hero (lab)

**Pasta:** `public/matrix_car/31_hero/`  
**Gabarito:** [`../GABARITO_RELOGIO.png`](../GABARITO_RELOGIO.png) · [`../RELOGIO.md`](../RELOGIO.md)  
**Prova:** `node --experimental-strip-types tools/art/car-rotate/clock_coords.ts`

`car_31_hero.png` = vitrine — **não mexer**. Sem strip até este gate passar.

Fórmula: `ângulo = índice × 12` · `hora = 6:00 + índice × 24 min`.  
`worldH` é um heading world cuja projeção 2:1 cai neste slot (`frameIndexForClockHeading` = índice).  
Nariz na tela: `screen` (Phaser +Y para baixo). indice[0] = 6h = baixo.

| índice | hora | ângulo | worldH° | screen x | screen y | back |
|------:|------|-------:|--------:|---------:|---------:|:----:|
| 0 | 6:00 | 0° | 45.0 | 0.000 | 0.707 | ok |
| 1 | 6:24 | 12° | 51.0 | -0.148 | 0.703 | ok |
| 2 | 6:48 | 24° | 57.5 | -0.306 | 0.690 | ok |
| 3 | 7:12 | 36° | 65.0 | -0.484 | 0.664 | ok |
| 4 | 7:36 | 48° | 74.0 | -0.686 | 0.618 | ok |
| 5 | 8:00 | 60° | 86.0 | -0.928 | 0.534 | ok |
| 6 | 8:24 | 72° | 102.0 | -1.186 | 0.385 | ok |
| 7 | 8:48 | 84° | 123.0 | -1.383 | 0.147 | ok |
| 8 | 9:12 | 96° | 147.0 | -1.383 | -0.147 | ok |
| 9 | 9:36 | 108° | 168.0 | -1.186 | -0.385 | ok |
| 10 | 10:00 | 120° | 184.0 | -0.928 | -0.534 | ok |
| 11 | 10:24 | 132° | 196.0 | -0.686 | -0.618 | ok |
| 12 | 10:48 | 144° | 205.0 | -0.484 | -0.664 | ok |
| 13 | 11:12 | 156° | 212.5 | -0.306 | -0.690 | ok |
| 14 | 11:36 | 168° | 219.0 | -0.148 | -0.703 | ok |
| 15 | 12:00 | 180° | 225.0 | 0.000 | -0.707 | ok |
| 16 | 12:24 | 192° | 231.0 | 0.148 | -0.703 | ok |
| 17 | 12:48 | 204° | 237.5 | 0.306 | -0.690 | ok |
| 18 | 1:12 | 216° | 245.0 | 0.484 | -0.664 | ok |
| 19 | 1:36 | 228° | 254.0 | 0.686 | -0.618 | ok |
| 20 | 2:00 | 240° | 266.0 | 0.928 | -0.534 | ok |
| 21 | 2:24 | 252° | 282.0 | 1.186 | -0.385 | ok |
| 22 | 2:48 | 264° | 303.0 | 1.383 | -0.147 | ok |
| 23 | 3:12 | 276° | 327.0 | 1.383 | 0.147 | ok |
| 24 | 3:36 | 288° | 348.0 | 1.186 | 0.385 | ok |
| 25 | 4:00 | 300° | 4.0 | 0.928 | 0.534 | ok |
| 26 | 4:24 | 312° | 16.0 | 0.686 | 0.618 | ok |
| 27 | 4:48 | 324° | 25.0 | 0.484 | 0.664 | ok |
| 28 | 5:12 | 336° | 32.5 | 0.306 | 0.690 | ok |
| 29 | 5:36 | 348° | 39.0 | 0.148 | 0.703 | ok |

## Pista

Thunder Basin start + 50 m no acorde → **indice[25]** (hero / world +X ≈ down-right).

## Gate

**30/30** direção ~= índice do array. Sem strip neste lab até haver 30 frames nomeados `car_31_a000`…`a029` (buracos não se recompactam).

Arquivo do array (quando existir): `car_31_a{índice:03d}.png`.

## Regen

Gate de coordenadas **passou**. Não gerar frames neste passe. Próximo (outro ticket): `25 → 26 → … → 24` a partir da vitrine, buracos sem recompactar.
