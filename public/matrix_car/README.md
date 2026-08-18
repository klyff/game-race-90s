# matrix_car — pasta oficial

**Local:** `public/matrix_car/`  
(antes: `dist/assets/matrix_car/` — movido)

## O que é cada coisa

| item | papel |
|------|--------|
| `N_hero/car_N_hero.png` | **Vitrine** — não mexer; fora do array de rotação |
| `N_hero/car_N_a000.png` … `a029.png` | Frames do array (índice = nome); +12° por slot |
| `RELOGIO.md` | Contrato índice = relógio = ângulo |
| `PROMPT_30.md` | Prompt de geração (30 slots) |
| `PASSO_A_PASSO.md` | Comandos / pipeline |
| `1_hero/INDEX_ANGLES.md` | Inventário do carro 1 |

## Contrato rápido

```
indice[0]  = 6.0  =   0°     (frente)
indice[25] = 4.0  = 300°     (começamos aqui / pose da vitrine)
indice[29] = 5.6  = 348°     (índice Zero Costas)
```

- Cada slot = **+12°**
- Costas: `indice[13]` ou `indice[14]` (olho); `indice[15] = 180°` na grade
- Buracos no índice **não** se recompactam
- Pose certa + nome errado → **renomear**; não flippar; não regenerar à toa

## Inventário `1_hero` (agora)

- **ok (26):** 0–3, 5–11, 13–14, 16–24, 26–29  
- **faltando (4):** 4, 12, 15, 25  

Cópia espelho dos docs em `tools/art/car-rotate/`.
