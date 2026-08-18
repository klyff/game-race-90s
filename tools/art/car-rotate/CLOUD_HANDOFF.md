# Cloud handoff — metade B

**Status:** NÃO TERMINADO · você processa **cars 18–33**

## Split

- **Metade A (outro agente / local):** cars **2–17**
- **Metade B (este cloud):** cars **18–33** ← **você**

Ver `PROCESS_HALVES.md`.

## Onde achar gabarito + docs

Tudo em **`public/matrix_car/`**:

1. **`GABARITO_RELOGIO.png`** (gabarito visual)
2. **`RELOGIO.md`** / **`PROMPT_30.md`** / **`SCALE.md`**
3. **`ARRAY_ROTATED_FIRST.md`** / **`PROCESS_HALVES.md`**
4. Skill: `.cursor/skills/matrix-car-rotate/SKILL.md`

## Por onde começar (metade B)

**`public/matrix_car/18_hero/`** → `19_hero` … `33_hero`

- Ordem por carro: `25,26,27,28,29,0,1,…,24`
- Não mexer no hero
- Pipeline: gen → chroma → `extent 1700x1254` → `car_N_aXXX.png`
- Strip no fim: `build_matrix_strip.py` → **só** `car_N_strip_64.png` + JSON (**MARGIN_X=16** L+R = **32px**; arte grande descartada; em prod `×64/1700` vira **1 ou 0**)
- Depois: `pack_matrix_sources.py` → **`car_N_sources.tar.gz`** + apaga `a*.png` soltos (regenerar custa mais que storage)
- Escala arrays: `64/1700` · magick PNG: `-resize 3.764705882352941%` (dentro do script)
- **QA primeiro carro (18):** strip/frames devem bater perto do gabarito de qualidade de `public/matrix_car/1_hero/` (centro vertical, canvas 1700×1254, sem flip, hero intocado)

## Inventário esperado ao começar

- cars 18–33: só `car_N_hero.png`, 0 frames
- Não pise na metade A (2–17) salvo merge consciente


Fila detalhada: **`CLOUD_QUEUE_B.md`** (1º=18, depois 19…33).
