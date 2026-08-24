# Relógio oficial — 32 frames CCW

Skill: **isometric-car-spinner**. Pasta viva: `public/assets/cars/<n>-<slug>/`.

O relógio de 30 slots (CW, hero indice[25]) foi **removido**. Não gerar, não misturar.

## Contrato

| | |
|--|--|
| Frames | **32** |
| Passo | **+11.25°** |
| Sentido | **anti-horário (CCW)** |
| Índice 0 | **0° = 6:00** — frente, nariz para baixo na tela |
| Traseira | **180° = 12:00** — `indice[16]` |
| Hero / loja / garagem / resultados | **`indice[7]` ≈ 3:22** → `car_hero.png` |
| Volta | após `348.75°` → `0°` (`indice[0]`) |

Fórmula: `ângulo = índice × 11.25` · ponteiro anda **CCW** desde 6:00 (passo 22.5 min).

## Marcos

| índice | hora | ângulo | nota |
|------:|------|-------:|------|
| 0 | 6:00 | 0° | frente |
| 7 | 3:22.5 | 78.75° | **hero** |
| 8 | 3:00 | 90° | |
| 16 | 12:00 | 180° | traseira |
| 24 | 9:00 | 270° | |
| 31 | 6:22.5 | 348.75° | |

## Tabela oficial (32 slots)

```
indice[0]  = 6:00   =   0°
indice[1]  = 5:37.5 =  11.25°
indice[2]  = 5:15   =  22.5°
indice[3]  = 4:52.5 =  33.75°
indice[4]  = 4:30   =  45°
indice[5]  = 4:07.5 =  56.25°
indice[6]  = 3:45   =  67.5°
indice[7]  = 3:22.5 =  78.75°  --> hero / car_hero.png
indice[8]  = 3:00   =  90°
indice[9]  = 2:37.5 = 101.25°
indice[10] = 2:15   = 112.5°
indice[11] = 1:52.5 = 123.75°
indice[12] = 1:30   = 135°
indice[13] = 1:07.5 = 146.25°
indice[14] = 12:45  = 157.5°
indice[15] = 12:22.5= 168.75°
indice[16] = 12:00  = 180°     --> traseira
indice[17] = 11:37.5= 191.25°
indice[18] = 11:15  = 202.5°
indice[19] = 10:52.5= 213.75°
indice[20] = 10:30  = 225°
indice[21] = 10:07.5= 236.25°
indice[22] = 9:45   = 247.5°
indice[23] = 9:22.5 = 258.75°
indice[24] = 9:00   = 270°
indice[25] = 8:37.5 = 281.25°
indice[26] = 8:15   = 292.5°
indice[27] = 7:52.5 = 303.75°
indice[28] = 7:30   = 315°
indice[29] = 7:07.5 = 326.25°
indice[30] = 6:45   = 337.5°
indice[31] = 6:22.5 = 348.75°
```

Runtime: `frameIndexForHeading` lê o heading no relógio 2:1 e, em strips CCW, remapeia `index === 0 ? 0 : (32 − index)`. Nunca flippar o PNG.
