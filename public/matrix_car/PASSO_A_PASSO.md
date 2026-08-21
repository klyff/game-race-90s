# Passo a passo — matrix_car (fonte do que já fizemos)

**Pasta base:** `public/matrix_car/`  
**Status:** em andamento · **NÃO TERMINADO**

---

## 0) Fonte da verdade (ler nesta ordem)

| # | arquivo | o que é |
|---|---------|---------|
| 1 | **`GABARITO_RELOGIO.png`** | Gabarito visual índice ↔ hora ↔ ângulo |
| 2 | **`RELOGIO.md`** | Contrato do relógio (tabela completa) |
| 3 | **`PROMPT_30.md`** | Prompt de geração de cada frame |
| 4 | **`ARRAY_ROTATED_FIRST.md`** | **As is** do array (car_1): hora, ângulo, imagem, original, w/h, start |
| 5 | **`SCALE.md`** | Escala produção `64/1700` (arrays) vs `3.7647%` (só magick) |
| 6 | **`PROCESS_HALVES.md`** | Split metade A/B |
| 7 | **`CLOUD_HANDOFF.md`** | Brief cloud (metade B = 18–33) |
| 8 | Skill | `.cursor/skills/matrix-car-rotate/` |
| 9 | Regras | `.cursor/rules/car-yaw-clock.mdc` · `matrix-car-rotate.mdc` |

Espelho dos docs: `tools/art/car-rotate/`.

---

## 1) Contrato (não negociar)

- **`0°` = frente absoluta** · **`12h` = traseira absoluta (`180°`)**
- Passo **+12°** horário · 30 slots · `car_N_a000.png` … `a029.png`
- **Hero / vitrine** (`car_N_hero.png`): pose entre **4h e 3h** (típico `indice[25]=4:00=300°`) — **NÃO MEXER**
- `start: true` só índices **23–27** (3h–4h)
- Pose certa + nome errado → **renomear** · **nunca flippar**
- Buracos no índice **não** se recompactam
- Canvas frame: **1700 × 1254**

Ordem de geração por carro:

`25 → 26 → 27 → 28 → 29 → 0 → 1 → … → 24`

---

## 2) O que JÁ está feito (as is)

### Vitrines (33 cars)

- Pastas `1_hero` … `33_hero`
- Cada uma tem `car_N_hero.png` (vitrine, quieta)

### car_1 — array + strip

| item | estado |
|------|--------|
| Frames | **26 / 30** — faltam índices **`4, 12, 15, 25`** · fontes em `car_1_sources.tar.gz` |
| Presentes | `0–3, 5–11, 13–14, 16–24, 26–29` |
| Mapa as is | `ARRAY_ROTATED_FIRST.md` (inclui **original** pré-rename) |
| Strip | `1_hero/car_1_strip_64.png` + `car_1_strip.json` (arte grande descartada) |
| Colisão | 1 retângulo invisível = `(min+max)/2` → arte **767×528** · prod **29×20** |
| Escala no JSON | bloco `production_scale` (`SCALE = 64/1700`) |

### car_2 — começo da metade A

| item | estado |
|------|--------|
| Frames | **5 / 30** — `a025` … `a029` · fontes em `car_2_sources.tar.gz` |
| Faltam | `0–24` |
| Strip parcial | `2_hero/car_2_strip_64.png` + `.json` (rebuild ao completar) |

### delorean — especial 1 (2026-08-21)

| item | estado |
|------|--------|
| Pasta | `delorean_hero/` — **não** é o `1_hero` (Marauder) |
| Vitrine | `delorean_hero.png` (quieta, 1536×1024) · pose **4:00 = indice[25]** |
| Garage | `delorean_hero_300.png` |
| Frames | **30 / 30** · `delorean_a000`…`a029` · 1700×1254 |
| a025 | cópia normalizada da vitrine (chroma + extent) — hero não foi mexido |
| Strip | `delorean_strip_64.png` + `delorean_strip.json` |
| Física | perk **flux** · grip alto · titular Chrome Verge · serve todos os mundos |

### cars 3–33

- Só vitrine · **0** frames de rotação (exceto o progresso acima no 2 e strips 18–21)

---

## 3) Split das metades

| metade | quem | cars | pasta inicial |
|--------|------|------|----------------|
| **A** | agente local (esta sessão) | **2 → 17** | `2_hero/` |
| **B** | cloud (você dispara) | **18 → 33** | `18_hero/` |

Detalhe: `PROCESS_HALVES.md` · brief cloud: `CLOUD_HANDOFF.md`.

---

## 4) Passo a passo — um frame

Substituir `{N}`, `{INDEX}`, `{CLOCK}`, `{ANGLE}`.

### 4.1 Gerar

1. Abrir vitrine: `public/matrix_car/{N}_hero/car_{N}_hero.png` (só referência)
2. Colar prompt de `PROMPT_30.md` com:
   - `THIS FRAME: indice[{INDEX}] = {CLOCK} = {ANGLE}°`
   - `Filename: car_{N}_a{INDEX:03d}.png`
3. Gerar 1:1 (void preto ou transparente)

### 4.2 Normalizar → 1700×1254

```bash
# IN = PNG gerado (ex. assets/…)
python3 tools/art/hero_chroma_key.py IN /tmp/chroma.png
magick /tmp/chroma.png -background none -trim +repage \
  -gravity center -extent 1700x1254 \
  public/matrix_car/{N}_hero/car_{N}_a{INDEX}.png
```

**Não** sobrescrever `car_{N}_hero.png`.

### 4.3 Repetir

Ordem: `25,26,27,28,29,0,1,…,24` até ter os 30 (ou documentar buracos).

---

## 5) Passo a passo — strip + colisão (fim do carro)

```bash
python3 tools/art/car-rotate/build_matrix_strip.py public/matrix_car/{N}_hero
```

O script faz:

1. Lista só `car_N_a*.png` (**hero fora**)
2. **trim** do alpha + margem **16px esquerda + 16px direita** (= **32px** horizontal)
3. `largura_total` = soma das larguras
4. `strip_h = max(alturas dos trims) + 2×STRIP_BREATHE` (respiro vertical da strip)  
   canvas RGBA `(largura_total × strip_h)`
5. Paint L→R com centro vertical:

```text
y = strip_h / 2 - trimCar.height / 2
```

6. **Um** retângulo de colisão invisível:

```text
w = round((min_w + max_w) / 2)   # bbox conteúdo
h = round((min_h + max_h) / 2)
```

Anda no **centro do carro** (`collision_center`; Y = `strip_h / 2`).

7. Monta strip em memória/temp, grava **só** produção + JSON (arte grande **descartada**):

```bash
# script já faz: temp art → magick → car_N_strip_64.png ; apaga car_N_strip.png
python3 tools/art/car-rotate/build_matrix_strip.py public/matrix_car/{N}_hero
# SCALE = 64/1700 · magick % = SCALE * 100 · arrays no JSON em espaço 1700
# lê a*.png soltos OU car_N_sources.tar.gz
```

8. Empacota fontes (barato guardar; caro regenerar):

```bash
python3 tools/art/car-rotate/pack_matrix_sources.py public/matrix_car/{N}_hero
# → car_N_sources.tar.gz + apaga car_N_a*.png soltos
# mantém: hero + strip_64 + strip.json
```

Remonta strip quando precisar: `build_matrix_strip.py` (extrai o tar em temp).
---

## 6) Escala de produção

Ver **`SCALE.md`**.

```js
const SCALE = 64 / 1700; // 0.037647 — arrays / colisão / JS
value64 = Math.round(value1700 * SCALE);
```

```bash
# só PNG de produção (script descarta o grande)
# magick % = scale×100 — feito dentro de build_matrix_strip.py
```

**Não** multiplicar arrays por `3.7647`.

---

## 7) Checklist por carro

```text
[ ] Ler gabarito + RELOGIO + PROMPT_30
[ ] Não tocar car_N_hero.png
[ ] Gerar/normalizar a025…a029, a000…a024
[ ] Contar 30 (ou listar buracos)
[ ] build_matrix_strip.py
[ ] Conferir collision_rect + production_scale no JSON
[ ] Commit / push da pasta N_hero
```

---

## 8) Comandos úteis

```bash
# inventário rápido
python3 - <<'PY'
from pathlib import Path
import re
base = Path('public/matrix_car')
for d in sorted(base.glob('*_hero'), key=lambda p: int(p.name.split('_')[0])):
    n = int(d.name.split('_')[0])
    frames = sorted(int(re.search(r'_a(\d+)', p.name).group(1))
                    for p in d.glob(f'car_{n}_a*.png'))
    miss = [i for i in range(30) if i not in frames]
    print(f'{n:2d}  {len(frames):2d}/30  miss={miss or "-"}')
PY

# strip
python3 tools/art/car-rotate/build_matrix_strip.py public/matrix_car/2_hero
```

---

## 9) Próximo ato

1. **Metade A:** completar `2_hero` (`a000`–`a024`), depois `3`…`17`  
2. **Metade B (cloud):** começar em `18_hero` com este passo a passo + `CLOUD_HANDOFF.md`  
3. Opcional: preencher buracos do `1_hero`  
4. Atualizar `ARRAY_ROTATED_FIRST.md` / `STATUS.md` quando o as is mudar
