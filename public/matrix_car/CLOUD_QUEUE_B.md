# Cloud Agent — Metade B (fila 18 → 33)

**Status:** NÃO TERMINADO  
**Base:** `main` · repo `/Users/klyff/git/game-race-90s`  
**Modelo preferido:** `gpt-5.6-sol-xhigh`

---

## Régua em 30 segundos

| Quem | Cars | Pasta inicial |
|------|------|----------------|
| Local / outro agente (metade A) | 2 → 17 | `/Users/klyff/git/game-race-90s/public/matrix_car/2_hero/` |
| **Você (Cloud = metade B)** | **18 → 33** | `/Users/klyff/git/game-race-90s/public/matrix_car/18_hero/` |

**Como trabalhar:** um carro por vez.  
1. Termina o **primeiro** da fila (18)  
2. **QA** contra o car_1  
3. Só então põe na fila o **segundo** (19), depois 20, 21… até 33  

Não faça 16 carros em paralelo. Fila sequencial.

---

## Deliverable final (cada pasta)

Só estes 4 arquivos (além de docs locais se já existirem):

```
car_N_hero.png          ← já existe; NÃO mexer
car_N_sources.tar.gz    ← fontes 1700×1254
car_N_strip_64.png      ← strip de uso
car_N_strip.json        ← arrays + colisão
```

Sem `car_N_a*.png` soltos. Sem `car_N_strip.png` grande.

---

## Ler antes (ordem)

1. `/Users/klyff/git/game-race-90s/public/matrix_car/GABARITO_RELOGIO.png`
2. `/Users/klyff/git/game-race-90s/public/matrix_car/RELOGIO.md`
3. `/Users/klyff/git/game-race-90s/public/matrix_car/PROMPT_30.md`
4. `/Users/klyff/git/game-race-90s/public/matrix_car/SCALE.md`
5. `/Users/klyff/git/game-race-90s/public/matrix_car/PASSO_A_PASSO.md`
6. `/Users/klyff/git/game-race-90s/.cursor/skills/matrix-car-rotate/SKILL.md`
7. `/Users/klyff/git/game-race-90s/.cursor/rules/car-yaw-clock.mdc`

**Referência de qualidade (não editar):**

```
/Users/klyff/git/game-race-90s/public/matrix_car/1_hero/car_1_hero.png
/Users/klyff/git/game-race-90s/public/matrix_car/1_hero/car_1_sources.tar.gz
/Users/klyff/git/game-race-90s/public/matrix_car/1_hero/car_1_strip_64.png
/Users/klyff/git/game-race-90s/public/matrix_car/1_hero/car_1_strip.json
```

**Scripts:**

```
/Users/klyff/git/game-race-90s/tools/art/hero_chroma_key.py
/Users/klyff/git/game-race-90s/tools/art/car-rotate/build_matrix_strip.py
/Users/klyff/git/game-race-90s/tools/art/car-rotate/pack_matrix_sources.py
```

---

## Contrato (fix)

- `0°` = frente · `12h` = traseira (`180°`) · passo `+12°` · 30 slots  
- Arquivo = índice: `car_N_a000.png` … `car_N_a029.png`  
- Hero entre 4h–3h (típico `a025` = 4:00 = 300°) — **nunca** editar/flipar `car_N_hero.png`  
- `start: true` só índices **23–27**  
- Pose certa + nome errado → **só rename** · **nunca flip**  
- Canvas: **1700 × 1254**  
- Ordem de geração **por carro:** `25,26,27,28,29,0,1,2,…,24`  
- Margem strip: 16px L + 16px R (já no script)  
- Arrays: `const SCALE = 64/1700` — **não** × `3.7647`

---

## Fila (um de cada vez)

| # na fila | Pasta | Hero (não mexer) | Depois de pronto |
|-----------|-------|------------------|------------------|
| **1º — FAÇA AGORA** | `/Users/klyff/git/game-race-90s/public/matrix_car/18_hero/` | `…/18_hero/car_18_hero.png` | **QA** vs `1_hero` → só então 19 |
| 2º | `/Users/klyff/git/game-race-90s/public/matrix_car/19_hero/` | `…/19_hero/car_19_hero.png` | → 20 |
| 3º | `/Users/klyff/git/game-race-90s/public/matrix_car/20_hero/` | `…/20_hero/car_20_hero.png` | → 21 |
| 4º | `/Users/klyff/git/game-race-90s/public/matrix_car/21_hero/` | `…/21_hero/car_21_hero.png` | → 22 |
| 5º | `/Users/klyff/git/game-race-90s/public/matrix_car/22_hero/` | `…/22_hero/car_22_hero.png` | → 23 |
| 6º | `/Users/klyff/git/game-race-90s/public/matrix_car/23_hero/` | `…/23_hero/car_23_hero.png` | → 24 |
| 7º | `/Users/klyff/git/game-race-90s/public/matrix_car/24_hero/` | `…/24_hero/car_24_hero.png` | → 25 |
| 8º | `/Users/klyff/git/game-race-90s/public/matrix_car/25_hero/` | `…/25_hero/car_25_hero.png` | → 26 |
| 9º | `/Users/klyff/git/game-race-90s/public/matrix_car/26_hero/` | `…/26_hero/car_26_hero.png` | → 27 |
| 10º | `/Users/klyff/git/game-race-90s/public/matrix_car/27_hero/` | `…/27_hero/car_27_hero.png` | → 28 |
| 11º | `/Users/klyff/git/game-race-90s/public/matrix_car/28_hero/` | `…/28_hero/car_28_hero.png` | → 29 |
| 12º | `/Users/klyff/git/game-race-90s/public/matrix_car/29_hero/` | `…/29_hero/car_29_hero.png` | → 30 |
| 13º | `/Users/klyff/git/game-race-90s/public/matrix_car/30_hero/` | `…/30_hero/car_30_hero.png` | → 31 |
| 14º | `/Users/klyff/git/game-race-90s/public/matrix_car/31_hero/` | `…/31_hero/car_31_hero.png` | → 32 |
| 15º | `/Users/klyff/git/game-race-90s/public/matrix_car/32_hero/` | `…/32_hero/car_32_hero.png` | → 33 |
| 16º — último | `/Users/klyff/git/game-race-90s/public/matrix_car/33_hero/` | `…/33_hero/car_33_hero.png` | DONE |

**Não tocar:** `/Users/klyff/git/game-race-90s/public/matrix_car/2_hero/` … `/Users/klyff/git/game-race-90s/public/matrix_car/17_hero/`

---

## Receita de UM carro (copie e troque N)

Substituir `{N}` por `18`, depois `19`, etc.

### A) Gerar 30 frames

Ordem: `25 → 26 → 27 → 28 → 29 → 0 → 1 → … → 24`

Para cada índice `{III}` (ex. `025`):

1. Prompt de `/Users/klyff/git/game-race-90s/public/matrix_car/PROMPT_30.md`  
   Anexar só: `/Users/klyff/git/game-race-90s/public/matrix_car/{N}_hero/car_{N}_hero.png`

2. Chroma:

```bash
python3 /Users/klyff/git/game-race-90s/tools/art/hero_chroma_key.py \
  IN.png /tmp/car_{N}_a{III}_chroma.png
```

3. Extent:

```bash
magick /tmp/car_{N}_a{III}_chroma.png -background none -trim +repage \
  -gravity center -extent 1700x1254 \
  /Users/klyff/git/game-race-90s/public/matrix_car/{N}_hero/car_{N}_a{III}.png
```

### B) Strip de uso + JSON

```bash
python3 /Users/klyff/git/game-race-90s/tools/art/car-rotate/build_matrix_strip.py \
  /Users/klyff/git/game-race-90s/public/matrix_car/{N}_hero
```

### C) Pack sources + apagar PNG soltos

```bash
python3 /Users/klyff/git/game-race-90s/tools/art/car-rotate/pack_matrix_sources.py \
  /Users/klyff/git/game-race-90s/public/matrix_car/{N}_hero
```

### D) Conferir pasta

```
/Users/klyff/git/game-race-90s/public/matrix_car/{N}_hero/car_{N}_hero.png
/Users/klyff/git/game-race-90s/public/matrix_car/{N}_hero/car_{N}_sources.tar.gz
/Users/klyff/git/game-race-90s/public/matrix_car/{N}_hero/car_{N}_strip_64.png
/Users/klyff/git/game-race-90s/public/matrix_car/{N}_hero/car_{N}_strip.json
```

---

## Exemplo concreto — 1º da fila (carro 18)

```bash
# … gerar car_18_a025 … a029, a000 … a024 em:
# /Users/klyff/git/game-race-90s/public/matrix_car/18_hero/

python3 /Users/klyff/git/game-race-90s/tools/art/car-rotate/build_matrix_strip.py \
  /Users/klyff/git/game-race-90s/public/matrix_car/18_hero

python3 /Users/klyff/git/game-race-90s/tools/art/car-rotate/pack_matrix_sources.py \
  /Users/klyff/git/game-race-90s/public/matrix_car/18_hero
```

**QA gate:** comparar com `/Users/klyff/git/game-race-90s/public/matrix_car/1_hero/`  
(yaw vs gabarito · 1700×1254 · hero intacto · 4 deliverables).  
Se não bater perto → **parar**. Não iniciar 19.

Se OK → próximo da fila = **19**, mesma receita com `N=19`.

---

## Done

16 pastas `18_hero` … `33_hero`, cada uma com os 4 deliverables.  
Commit só o trabalho 18–33.

---

## Prompt curto pra colar no Cloud Agent

```text
Leia e execute este arquivo na íntegra, em fila sequencial:

/Users/klyff/git/game-race-90s/public/matrix_car/CLOUD_QUEUE_B.md

Comece AGORA pelo 1º da fila (carro 18).
Termine 18 → QA vs 1_hero → só então 19 → 20 → … → 33.
Um carro por vez. Paths absolutos. Não tocar cars 2–17.
```
