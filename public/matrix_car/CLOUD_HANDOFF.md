# Cloud handoff — matrix_car restante

**Status:** NÃO TERMINADO. Cars 2–33 ainda sem frames de rotação.

## Onde achar gabarito + docs

Tudo em **`public/matrix_car/`**:

1. Abrir **`public/matrix_car/GABARITO_RELOGIO.png`** (gabarito visual)
2. Ler **`public/matrix_car/RELOGIO.md`**
3. Usar prompt **`public/matrix_car/PROMPT_30.md`**
4. Skill: `.cursor/skills/matrix-car-rotate/SKILL.md`

## Por onde começar

**`public/matrix_car/2_hero/`** → depois `3_hero` … `33_hero`.

- `car_N_hero.png` = vitrine (NÃO mexer)
- Frames: `car_N_a000.png` … `a029.png`
- Ordem: `25,26,27,28,29,0,1,…,24`
- `0°` = frente · `12h` = traseira · hero entre 4h–3h · +12°

## Inventário

- car_1: 26/30 (faltam 4, 12, 15, 25) — completar no fim se der
- car_2…33: só hero, 0 frames — **trabalho principal**
