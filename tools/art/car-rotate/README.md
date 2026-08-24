# matrix_car — OBSOLETE archive

**Do not use for new or playable cars.** Live yaw is **32 frames CCW** (isometric-car-spinner): index 0 = 6h, hero = frame 07. Canonical table: `public/assets/cars/RELOGIO.md`.

This folder stays on disk as leftover 30-slot CW art. Do not generate, complete, or ship from here.

# matrix_car — pasta de arquivo

**Local:** `public/matrix_car/`  
**Gabarito (histórico):** [`GABARITO_RELOGIO.png`](./GABARITO_RELOGIO.png) · detalhe em [`RELOGIO.md`](./RELOGIO.md)

## O que é cada coisa

| item | papel |
|------|--------|
| `SCALE.md` | Escala produção `64/1700` + `magick -resize 3.7647%` |
| `ARRAY_ROTATED_FIRST.md` | **As is** — cada índice: hora, ângulo, imagem, original, w:1700, h:1254, start |
| `GABARITO_RELOGIO.png` | Diagrama índice ↔ hora ↔ ângulo |
| `N_hero/car_N_hero.png` | **Vitrine** — não mexer; fora do array |
| `N_hero/car_N_a000.png` … `a029.png` | Frames (+12° / +0.4 h por slot) |
| `RELOGIO.md` | Contrato + tabela |
| `PROMPT_30.md` | Prompt de geração |
| `PASSO_A_PASSO.md` | **Passo a passo completo** + fonte do que já foi feito |
| `1_hero/INDEX_ANGLES.md` | Inventário do carro 1 |

## Contrato rápido

```
0°     = frente absoluta
12h    = traseira absoluta (180°)
Hero   = entre 4h e 3h  (típico 4:00 = 300° = indice[25])
passo  = +12°
```

- Costas: `indice[13]` ou `indice[14]` (olho); `indice[15] = 12:00 = 180°`
- Buracos **não** se recompactam
- Pose certa + nome errado → **renomear**; não flippar
- Skill: `.cursor/skills/matrix-car-rotate/` · regras: `.cursor/rules/car-yaw-clock.mdc`

## Inventário `1_hero` (agora)

- **ok (26):** 0–3, 5–11, 13–14, 16–24, 26–29  
- **faltando (4):** 4, 12, 15, 25  

Espelho: `tools/art/car-rotate/`.
