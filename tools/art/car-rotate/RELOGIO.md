# Relógio + índice das 30 imagens

**Pasta:** `public/matrix_car/`

Cada imagem pula **12°**. Nariz = ponteiro; sentido **horário**.

## Âncoras

- **Começamos em** `indice[25] = 4.0 = 300°`
- **Frente:** `indice[0] = 6.0 = 0°`
- **Costas:** `indice[13] = 156°` **ou** `indice[14] = 168°` (olho); também `indice[15] = 180°`
- `indice[29] = 5.6 = 348°` = **índice Zero Costas**
- **`car_N_hero.png` = vitrine** — não mexer; fora do array

## Tabela oficial

```
indice[0]  = 6.0  =   0°
indice[1]  = 6.4  =  12°
indice[2]  = 6.8  =  24°
indice[3]  = 7.2  =  36°
indice[4]  = 7.6  =  48°
indice[5]  = 8.0  =  60°
indice[6]  = 8.4  =  72°
indice[7]  = 8.8  =  84°
indice[8]  = 9.2  =  96°
indice[9]  = 9.6  = 108°
indice[10] = 10.0 = 120°
indice[11] = 10.4 = 132°
indice[12] = 10.8 = 144°
indice[13] = 11.2 = 156° --> Costas aqui ou
indice[14] = 11.6 = 168° --> Ou Costas aqui
indice[15] = 12.0 = 180°
indice[16] = 12.4 = 192°
indice[17] = 12.8 = 204°
indice[18] = 1.2  = 216°
indice[19] = 1.6  = 228°
indice[20] = 2.0  = 240°
indice[21] = 2.4  = 252°
indice[22] = 2.8  = 264°
indice[23] = 3.2  = 276°
indice[24] = 3.6  = 288°
indice[25] = 4.0  = 300° --> Começamos aqui
indice[26] = 4.4  = 312°
indice[27] = 4.8  = 324°
indice[28] = 5.2  = 336°
indice[29] = 5.6  = 348° = indice Zero Costas
```

| índice | relógio | ângulo | arquivo | nota |
|------:|--------:|-------:|---------|------|
| 0 | 6.0 | 0° | `a000` | frente |
| 1 | 6.4 | 12° | `a001` | |
| 2 | 6.8 | 24° | `a002` | |
| 3 | 7.2 | 36° | `a003` | |
| 4 | 7.6 | 48° | `a004` | |
| 5 | 8.0 | 60° | `a005` | |
| 6 | 8.4 | 72° | `a006` | |
| 7 | 8.8 | 84° | `a007` | |
| 8 | 9.2 | 96° | `a008` | |
| 9 | 9.6 | 108° | `a009` | |
| 10 | 10.0 | 120° | `a010` | |
| 11 | 10.4 | 132° | `a011` | |
| 12 | 10.8 | 144° | `a012` | |
| 13 | 11.2 | 156° | `a013` | **Costas?** |
| 14 | 11.6 | 168° | `a014` | **Costas?** |
| 15 | 12.0 | 180° | `a015` | |
| 16 | 12.4 | 192° | `a016` | |
| 17 | 12.8 | 204° | `a017` | |
| 18 | 1.2 | 216° | `a018` | |
| 19 | 1.6 | 228° | `a019` | |
| 20 | 2.0 | 240° | `a020` | |
| 21 | 2.4 | 252° | `a021` | |
| 22 | 2.8 | 264° | `a022` | |
| 23 | 3.2 | 276° | `a023` | |
| 24 | 3.6 | 288° | `a024` | |
| 25 | 4.0 | 300° | `a025` | **START** (vitrine = mesma pose; arquivo hero quieto) |
| 26 | 4.4 | 312° | `a026` | |
| 27 | 4.8 | 324° | `a027` | |
| 28 | 5.2 | 336° | `a028` | |
| 29 | 5.6 | 348° | `a029` | **índice Zero Costas** |

- Arquivo do array: `car_N_a{índice:03d}.png`
- Buracos **não** se recompactam

### Inventário `1_hero`

- **ok (26):** 0–3, 5–11, 13–14, 16–24, 26–29  
- **faltando (4):** **4**, **12**, **15**, **25**

Ver: `README.md`, `PROMPT_30.md`, `1_hero/INDEX_ANGLES.md`.
