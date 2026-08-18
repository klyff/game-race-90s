# Process — duas metades

**Status:** em andamento · **NÃO TERMINADO**

## Split

| metade | dono | cars | start folder |
|--------|------|------|----------------|
| **A** | este agente (local) | **2 → 17** | `public/matrix_car/2_hero/` |
| **B** | cloud (você dispara) | **18 → 33** | `public/matrix_car/18_hero/` |

- car_1 buracos `[4,12,15,25]` — opcional no fim de qualquer metade
- **Nunca** sobrescrever `car_N_hero.png`

## Onde achar gabarito + docs

Tudo em **`public/matrix_car/`**:

1. `GABARITO_RELOGIO.png`
2. `RELOGIO.md` / `PROMPT_30.md` / `SCALE.md`
3. `ARRAY_ROTATED_FIRST.md` (as is)
4. Skill: `.cursor/skills/matrix-car-rotate/`

## Por frame (igual nas duas metades)

1. Prompt de `PROMPT_30.md` · anexar vitrine só como referência  
2. Ordem: `25,26,27,28,29,0,1,…,24`  
3. `python3 tools/art/hero_chroma_key.py IN OUT`  
4. `magick IN -background none -trim +repage -gravity center -extent 1700x1254 OUT`  
5. Salvar `public/matrix_car/{N}_hero/car_N_a{III}.png`  
6. No fim do carro:  
   `python3 tools/art/car-rotate/build_matrix_strip.py public/matrix_car/{N}_hero`  
   → grava **`car_N_strip_64.png` + JSON**; arte grande descartada  
7. Empacota fontes:  
   `python3 tools/art/car-rotate/pack_matrix_sources.py public/matrix_car/{N}_hero`  
   → **`car_N_sources.tar.gz`** + apaga `a*.png` soltos (hero/`_64`/json ficam)  
8. Arrays/colisao: `SCALE = 64/1700` (**não** × 3.7647) · magick % só no PNG 64

## Contrato rápido

- `0°` = frente · `12h` = traseira · hero entre 4h–3h · `+12°`
- `start: true` só índices 23–27  
- Colisão: um retângulo `(min+max)/2` no centro do carro

## Cloud (metade B)

Base: `main` · modelo preferido: `gpt-5.6-sol-xhigh`  
Brief: este arquivo + `CLOUD_HANDOFF.md` · começar em **`18_hero`**.
