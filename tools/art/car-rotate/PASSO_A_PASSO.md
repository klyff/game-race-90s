# Passo a passo — matriz de carros

Pasta base: `public/matrix_car/`

**`car_N_hero.png` = vitrine** — não mexer; fora do array de rotação.  
Hero base **entre 4h e 3h** (típico 4:00 = 300°). **`0°` = frente** · **`12h` = traseira**.  
**Docs:** `README.md`, `PROMPT_30.md`, `RELOGIO.md`, gabarito `GABARITO_RELOGIO.png`.  
**Skill / regras:** `.cursor/skills/matrix-car-rotate/` · `.cursor/rules/car-yaw-clock.mdc`.  
Contrato: **+12°**; arquivos `a000`…`a029`. Não regenerar — **renomear**. Não flippar. Nunca sobrescrever o hero.

---

## A) Preparar as matrizes (vitrine)

### 1. Renomear em sequência `1…N`
Ordem estável por número antigo; quem tinha `_e` (olhando esquerda) manteve o sufixo depois.

```bash
# (feito via Python na sessão — resultado:)
# car_1_hero.png … car_33_hero.png
# com _e nos que eram esquerda: car_N_hero_e.png
```

### 2. Flip horizontal dos `_e`
Espelha para a mesma orientação dos outros e remove o `_e`.

```bash
# Pillow FLIP_LEFT_RIGHT em cada car_*_hero_e.png → car_*_hero.png
python3 - <<'PY'
from pathlib import Path
from PIL import Image
d = Path('public/matrix_car')
for src in sorted(d.glob('car_*_hero_e.png')):
    final = d / src.name.replace('_hero_e.png', '_hero.png')
    Image.open(src).convert('RGBA').transpose(Image.FLIP_LEFT_RIGHT).save(final)
    src.unlink()
    print('OK', final.name)
PY
```

*(Na sessão isso rodou antes de criar as pastas `N_hero/`.)*

### 3. Uma pasta por carro

```bash
python3 - <<'PY'
from pathlib import Path
import re
d = Path('public/matrix_car')
for src in sorted(d.glob('car_*_hero.png'), key=lambda p: int(re.search(r'car_(\d+)', p.name).group(1))):
    n = int(re.search(r'car_(\d+)', src.name).group(1))
    folder = d / f'{n}_hero'
    folder.mkdir(exist_ok=True)
    src.rename(folder / src.name)
    print(folder.name)
PY
```

### 4. Canvas só (não escala o desenho) → 1700×1254

```bash
# ImageMagick: extent, gravity center, fundo transparente
magick IN.png -background none -gravity center -extent 1700x1254 OUT.png
```

Loop nas 33 pastas:

```bash
python3 - <<'PY'
import subprocess
from pathlib import Path
d = Path('public/matrix_car')
for src in sorted(d.glob('*/car_*_hero.png')):
    tmp = src.with_suffix('.extent_tmp.png')
    subprocess.run([
        'magick', str(src),
        '-background', 'none', '-gravity', 'center',
        '-extent', '1700x1254', str(tmp),
    ], check=True)
    tmp.replace(src)
    print('OK', src)
PY
```

### 5. Mesmo eixo (centro do carro = centro do canvas)

```bash
magick IN.png -background none -trim +repage -gravity center -extent 1700x1254 OUT.png
```

```bash
python3 - <<'PY'
import subprocess
from pathlib import Path
d = Path('public/matrix_car')
W, H = 1700, 1254
for src in sorted(d.glob('*/car_*_hero.png')):
    tmp = src.with_suffix('.axis_tmp.png')
    subprocess.run([
        'magick', str(src),
        '-background', 'none',
        '-trim', '+repage',
        '-gravity', 'center',
        '-extent', f'{W}x{H}',
        str(tmp),
    ], check=True)
    tmp.replace(src)
    print('OK', src.parent.name)
PY
```

---

## B) Relógio (contrato de pose)

**Ver `RELOGIO.md` nesta pasta — regra oficial.**

- Zero **único**: **0° = 6h = frente** (`a000`). Vale para frente **e** traseira.
- **12h = 180° = costas** (não é outro zero).
- **Hero / matriz = 300° = 4h** (ângulo de partida dos carros).
- Nariz = ponteiro; giro **horário** a partir do 6; passo **12°** → 30 frames.

### Meia-volta TRASEira (15) — mesmo zero (0=6h)
`90, 102, 114, 126, 138, 150, 162, 174, 186, 198, 210, 222, 234, 246, 258`  
(180° ≈ 12h costas)

### Meia-volta FRENTE (15) — mesmo zero (0=6h)
`270, 282, 294, 306, 318, 330, 342, 0, 12, 24, 36, 48, 60, 72, 84`  
(0° = 6h frente; 300° = 4h ≈ hero)

Arquivos:
```
{N}_hero/car_{N}_a090.png … car_{N}_a258.png   # traseira
{N}_hero/car_{N}_a270.png … car_{N}_a084.png   # frente (inclui a000)
{N}_hero/car_{N}_hero.png                      # matriz
```

Prompts nesta raiz:
- `PROMPT_REAR_HALF.md`
- `PROMPT_FRONT_HALF.md`

---

## C) Gerar um frame (imagem solta — sem strip)

### STEP 0 — Lock
Abrir `{N}_hero/car_{N}_hero.png` como referência de identidade.

### STEP 1 — GenerateImage (Cursor)
- `aspect_ratio`: `1:1`
- `filename`: `car_{N}_a{ângulo:03d}.png` (ex.: `car_1_a000.png`)
- `reference_image_paths`: hero da pasta
- `description`: texto do `PROMPT_*` + ângulo específico

Saída bruta (típico): **1024×1024** em  
`~/.cursor/projects/Users-klyff-git-game-race-90s/assets/`

### STEP 2 — Chroma (Python)
Flood-fill preto conectado às bordas → alpha (não fura pneu/arma pretos).

```bash
python3 tools/art/hero_chroma_key.py \
  ~/.cursor/projects/Users-klyff-git-game-race-90s/assets/car_1_a000.png \
  /tmp/car_1_a000_chroma.png
```

### STEP 3 — Trim + eixo + canvas matriz (ImageMagick)

```bash
magick /tmp/car_1_a000_chroma.png \
  -background none \
  -trim +repage \
  -gravity center \
  -extent 1700x1254 \
  public/matrix_car/1_hero/car_1_a000.png
```

### STEP 4 — Conferir eixo

```bash
python3 - <<'PY'
from PIL import Image
im = Image.open('public/matrix_car/1_hero/car_1_a000.png').convert('RGBA')
b = im.getbbox()
cx = (b[0]+b[2])/2
print(im.size, 'bbox', b, 'cx', cx, 'dx', cx - 850)
PY
```

**Não** rodar `build_strip.py` / `npm run gen:car-strip` nesta etapa — só imagens soltas.

---

## D) Pipeline completo de um lote (ex.: frente do carro 1)

```bash
# 1) Gerar os 15 PNGs via agente/GenerateImage (Cursor) → assets/
# 2) Ingestão em lote:
python3 - <<'PY'
import subprocess, sys
from pathlib import Path
from PIL import Image
sys.path.insert(0, 'tools/art')
from hero_chroma_key import flood_black_to_alpha

ASSETS = Path.home() / '.cursor/projects/Users-klyff-git-game-race-90s/assets'
OUT = Path('public/matrix_car/1_hero')
W, H = 1700, 1254
angles = [270,282,294,306,318,330,342,0,12,24,36,48,60,72,84]

for a in angles:
    name = f'car_1_a{a:03d}.png'
    src = ASSETS / name
    assert src.exists(), name
    tmp = OUT / f'__tmp_{a:03d}.png'
    flood_black_to_alpha(Image.open(src)).save(tmp)
    dst = OUT / name
    subprocess.run([
        'magick', str(tmp),
        '-background', 'none', '-trim', '+repage',
        '-gravity', 'center', '-extent', f'{W}x{H}',
        str(dst),
    ], check=True)
    tmp.unlink()
    print('OK', dst.name)
PY
```

---

## E) Dependências

```bash
brew install imagemagick   # comando: magick
# Pillow (Python)
pip3 show pillow
```

Scripts auxiliares no repo:
- `tools/art/hero_chroma_key.py`
- `tools/art/accept_frame.py`
- `tools/art/validate_lot.py`
- `tools/art/car-rotate/pipeline.sh` + `build_strip.py` *(strip opcional; não usar agora)*
- `tools/art/car-rotate/PROMPT_FRONT_HALF.md`
- `tools/art/car-rotate/PROMPT_REAR_HALF.md`
