---
name: matrix-car-rotate
description: >-
  Builds and indexes 30-frame isometric car rotations for matrix_car using the
  clock gabarito (+12°). Use when working on public/matrix_car, car-rotate,
  hero vitrine, car_N_aXXX frames, RELOGIO, GABARITO_RELOGIO, or car yaw strips.
---

# Matrix car rotate

Assets live in **`public/matrix_car/`**. Docs mirror: `tools/art/car-rotate/`.

## Where to find the gabarito + docs

**Always start here:** `public/matrix_car/`

| file | what |
|------|------|
| `public/matrix_car/GABARITO_RELOGIO.png` | **Gabarito visual** (índice ↔ hora ↔ ângulo) |
| `public/matrix_car/RELOGIO.md` | Contrato + tabela completa |
| `public/matrix_car/PROMPT_30.md` | Prompt de geração |
| `public/matrix_car/README.md` | Índice da pasta |
| `public/matrix_car/PASSO_A_PASSO.md` | Pipeline / comandos |
| `public/matrix_car/{N}_hero/` | Vitrine + frames `car_N_aXXX.png` |

Skill copy of the gabarito (same image): `.cursor/skills/matrix-car-rotate/GABARITO_RELOGIO.png`.

**Cloud / batch start folder:** `public/matrix_car/2_hero/` (cars **2→33**; car_1 already partial).

## Non-negotiable

1. **`0°` = frente absoluta.** **`12h` = traseira absoluta** (`180°`).
2. Cada frame = **+12°** (horário). Grade: `indice[0…29]` → `car_N_a000`…`a029`.
3. **Hero / vitrine** (`car_N_hero.png`) = pose base **entre 4h e 3h** (tipicamente **4:00 = 300° = indice[25]**). **Não mexer** no arquivo hero — é vitrine.
4. Pose certa + nome errado → **renomear**. **Não flippar.** Não regenerar à toa.
5. Buracos no índice **não** se recompactam (nome = slot oficial).
6. Canvas dos frames: **1700×1254**, eixo central; estilo 16-bit SNES / RnR Racing; câmera 2:1 dimetric.

## Relógio (resumo)

| marco | hora | ângulo | índice |
|-------|------|-------:|-------:|
| Frente | 6:00 | 0° | 0 |
| ~9h | 9:00 | 90° | — (entre 7–8) |
| Traseira | **12:00** | **180°** | 15 |
| ~3h | 3:00 | 270° | — (entre 22–23) |
| **Hero zone** | **4h→3h** | **300°→270°** | **25→23** |
| Hero tipico | 4:00 | 300° | 25 |

Gabarito: [GABARITO_RELOGIO.png](GABARITO_RELOGIO.png) · tabela completa: [reference.md](reference.md) · fonte: `public/matrix_car/RELOGIO.md`.

## Workflow

1. Ler **`public/matrix_car/GABARITO_RELOGIO.png`** + `RELOGIO.md` + inventário do `{N}_hero/`.
2. Batch restante: começar em **`public/matrix_car/2_hero/`** e seguir `3_hero`…`33_hero` (car_1 já parcial — completar buracos no fim se der).
3. Gerar/completar só slots faltantes; anexar **vitrine** só como referência de identidade.
4. Pipeline por frame: GenerateImage → `hero_chroma_key.py` → `magick … -extent 1700x1254` → `public/matrix_car/{N}_hero/car_N_a{III}.png`.
5. Ordem de geração a partir do hero: `25,26,27,28,29,0,1,…,24`.
6. **Nunca** sobrescrever `car_N_hero.png`.
7. Trabalho **não** termina até cars 2–33 terem os 30 slots (ou STATUS.md listar gaps honestos).

## Prompt

Usar o bloco em `public/matrix_car/PROMPT_30.md` (ou espelho em `tools/art/car-rotate/PROMPT_30.md`).
