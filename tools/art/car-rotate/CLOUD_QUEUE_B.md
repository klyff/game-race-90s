# Cloud Agent — Metade B (fila 18 → 33)

**Status:** NÃO TERMINADO  
**Base:** `main`  
**Modelo preferido:** `gpt-5.6-sol-xhigh`

## REPO ROOT

No Cloud, descubra a raiz do clone e use **só paths relativos a ela**.

```bash
# no workspace do agent:
REPO="$(git rev-parse --show-toplevel)"
cd "$REPO"
```

Exemplos (não hardcode `/Users/klyff/...` — no Cloud isso quebra):

```text
$REPO/public/matrix_car/18_hero/car_18_hero.png
$REPO/tools/art/car-rotate/build_matrix_strip.py
```

---

## ⛔ NOMES ANTIGOS — NÃO USAR

| ERRADO (legado) | CERTO (atual) |
|-----------------|---------------|
| `frames_300/` | **não existe** |
| `frames_300/car_blue/` | `public/matrix_car/{N}_hero/` |
| `car_blue_f23.png` | `car_{N}_a023.png` |
| `car_orange_f00.png` | `car_{N}_a000.png` |
| `*_fXX.png` (36 frames) | `*_aXXX.png` (30 slots, índice 000–029) |
| `tools/art/car-rotate/pipeline.sh` (legado) | `build_matrix_strip.py` + `pack_matrix_sources.py` |
| `tools/art/accept_frame.py` (300×300) | `hero_chroma_key.py` + `magick … -extent 1700x1254` |

Se aparecer `ENOENT …/frames_300/car_blue/...` → você está no pipeline **errado**. Volte para este arquivo.

---

## Régua

| Quem | Cars | Pasta |
|------|------|--------|
| Metade A (outro) | 2 → 17 | `public/matrix_car/2_hero/` |
| **Você (Cloud B)** | **18 → 33** | `public/matrix_car/18_hero/` |

**Fila sequencial:** termine o 1º (18) → QA vs `1_hero` → só então 19 → 20 → … → 33.  
**Um carro por vez.** Não paralelizar.

---

## Deliverable final (cada pasta)

```text
public/matrix_car/{N}_hero/car_{N}_hero.png          # já existe; NÃO mexer
public/matrix_car/{N}_hero/car_{N}_sources.tar.gz    # fontes
public/matrix_car/{N}_hero/car_{N}_strip_64.png      # strip de uso
public/matrix_car/{N}_hero/car_{N}_strip.json        # arrays + colisão
```

Sem `a*.png` soltos. Sem strip grande. Sem `frames_300`. Sem `car_blue`.

---

## Ler antes (relativo a `$REPO`)

1. `public/matrix_car/GABARITO_RELOGIO.png`
2. `public/matrix_car/RELOGIO.md`
3. `public/matrix_car/PROMPT_30.md`
4. `public/matrix_car/SCALE.md`
5. `public/matrix_car/PASSO_A_PASSO.md`
6. `.cursor/skills/matrix-car-rotate/SKILL.md`
7. `.cursor/rules/car-yaw-clock.mdc`

**Referência de qualidade (não editar):**

```text
public/matrix_car/1_hero/car_1_hero.png
public/matrix_car/1_hero/car_1_sources.tar.gz
public/matrix_car/1_hero/car_1_strip_64.png
public/matrix_car/1_hero/car_1_strip.json
```

**Scripts:**

```text
tools/art/hero_chroma_key.py
tools/art/car-rotate/build_matrix_strip.py
tools/art/car-rotate/pack_matrix_sources.py
```

---

## Contrato

- `0°` = frente · `12h` = traseira (`180°`) · `+12°` · 30 slots  
- Nome = índice: `car_N_a000.png` … `car_N_a029.png`  
- Hero 4h–3h (típico `a025` = 300°) — **nunca** editar/flipar `car_N_hero.png`  
- `start:true` só 23–27 · rename ≠ flip · canvas **1700×1254**  
- Ordem por carro: `25,26,27,28,29,0,1,…,24`  
- `SCALE = 64/1700` (arrays) · magick % só no script  

---

## Fila

| # | Pasta | Hero |
|---|-------|------|
| **1º AGORA** | `public/matrix_car/18_hero/` | `public/matrix_car/18_hero/car_18_hero.png` |
| 2º | `public/matrix_car/19_hero/` | `…/car_19_hero.png` |
| 3º | `public/matrix_car/20_hero/` | `…/car_20_hero.png` |
| 4º | `public/matrix_car/21_hero/` | `…/car_21_hero.png` |
| 5º | `public/matrix_car/22_hero/` | `…/car_22_hero.png` |
| 6º | `public/matrix_car/23_hero/` | `…/car_23_hero.png` |
| 7º | `public/matrix_car/24_hero/` | `…/car_24_hero.png` |
| 8º | `public/matrix_car/25_hero/` | `…/car_25_hero.png` |
| 9º | `public/matrix_car/26_hero/` | `…/car_26_hero.png` |
| 10º | `public/matrix_car/27_hero/` | `…/car_27_hero.png` |
| 11º | `public/matrix_car/28_hero/` | `…/car_28_hero.png` |
| 12º | `public/matrix_car/29_hero/` | `…/car_29_hero.png` |
| 13º | `public/matrix_car/30_hero/` | `…/car_30_hero.png` |
| 14º | `public/matrix_car/31_hero/` | `…/car_31_hero.png` |
| 15º | `public/matrix_car/32_hero/` | `…/car_32_hero.png` |
| 16º | `public/matrix_car/33_hero/` | `…/car_33_hero.png` |

**Não tocar:** `public/matrix_car/2_hero/` … `public/matrix_car/17_hero/`

---

## Receita de UM carro (`N=18` no 1º)

### A) 30 frames → `public/matrix_car/{N}_hero/car_{N}_a{III}.png`

Ordem: `25,26,27,28,29,0,1,…,24`

```bash
REPO="$(git rev-parse --show-toplevel)"
# após GenerateImage (PROMPT_30.md + anexar só car_{N}_hero.png):
python3 "$REPO/tools/art/hero_chroma_key.py" IN.png /tmp/car_${N}_a${III}_chroma.png
magick /tmp/car_${N}_a${III}_chroma.png -background none -trim +repage \
  -gravity center -extent 1700x1254 \
  "$REPO/public/matrix_car/${N}_hero/car_${N}_a${III}.png"
```

Exemplo índice 23 no carro 18 (NÃO é `car_blue_f23`):

```text
public/matrix_car/18_hero/car_18_a023.png
```

### B) Strip + JSON

```bash
python3 "$REPO/tools/art/car-rotate/build_matrix_strip.py" \
  "$REPO/public/matrix_car/${N}_hero"
```

### C) Pack tar.gz + apagar PNG soltos

```bash
python3 "$REPO/tools/art/car-rotate/pack_matrix_sources.py" \
  "$REPO/public/matrix_car/${N}_hero"
```

### D) Conferir

```text
public/matrix_car/{N}_hero/car_{N}_hero.png
public/matrix_car/{N}_hero/car_{N}_sources.tar.gz
public/matrix_car/{N}_hero/car_{N}_strip_64.png
public/matrix_car/{N}_hero/car_{N}_strip.json
```

---

## QA gate (depois do 1º = 18)

Comparar com `public/matrix_car/1_hero/`.  
Se não bater perto → **parar**. Não iniciar 19.

---

## Prompt curto pro Cloud

```text
Leia e execute:

public/matrix_car/CLOUD_QUEUE_B.md

REPO="$(git rev-parse --show-toplevel)"
Comece pelo 1º da fila: public/matrix_car/18_hero/
PROIBIDO: frames_300/, car_blue, *_fXX.png, pipeline.sh legado.
CERTO: public/matrix_car/{N}_hero/car_{N}_aXXX.png
Termine 18 → QA vs 1_hero → 19 → … → 33. Um por vez.
```
