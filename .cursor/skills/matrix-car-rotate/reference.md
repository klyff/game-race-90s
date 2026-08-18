# Matrix car — referência do relógio

Fonte canônica: `public/matrix_car/RELOGIO.md` + `GABARITO_RELOGIO.png`.

## Âncoras (usuário)

- **`0` = frente absoluta** (`0°`, nariz para 6:00 no gabarito).
- **`12` = traseira absoluta** (`12:00` = `180°`).
- **Hero base começa entre 4 e 3** (zona 4:00→3:00 no ponteiro); soma **+12°** por frame.
- Vitrine típica: **4:00 = 300° = indice[25]**.

## Fórmulas

- `ângulo = índice × 12`
- `hora = 6:00 + índice × 0.4 h` (+24 min de ponteiro por slot)
- Arquivo: `car_N_a{índice:03d}.png`
- `car_N_hero.png` = vitrine (fora do array)

## Tabela 0…29

```
indice[0]  = 6:00 =   0°   frente absoluta
indice[1]  = 6:24 =  12°
indice[2]  = 6:48 =  24°
indice[3]  = 7:12 =  36°
indice[4]  = 7:36 =  48°
indice[5]  = 8:00 =  60°
indice[6]  = 8:24 =  72°
indice[7]  = 8:48 =  84°
indice[8]  = 9:12 =  96°
indice[9]  = 9:36 = 108°
indice[10] = 10:00 = 120°
indice[11] = 10:24 = 132°
indice[12] = 10:48 = 144°
indice[13] = 11:12 = 156°  Costas?
indice[14] = 11:36 = 168°  Costas?
indice[15] = 12:00 = 180°  traseira absoluta
indice[16] = 12:24 = 192°
indice[17] = 12:48 = 204°
indice[18] =  1:12 = 216°
indice[19] =  1:36 = 228°
indice[20] =  2:00 = 240°
indice[21] =  2:24 = 252°
indice[22] =  2:48 = 264°
indice[23] =  3:12 = 276°  ← zona hero (até 4h)
indice[24] =  3:36 = 288°
indice[25] =  4:00 = 300°  ← start típico / pose vitrine
indice[26] =  4:24 = 312°
indice[27] =  4:48 = 324°
indice[28] =  5:12 = 336°
indice[29] =  5:36 = 348°
→ volta indice[0] = 0° / 360°
```

## Inventário car_1 (exemplo)

ok: 0–3, 5–11, 13–14, 16–24, 26–29  
faltando: 4, 12, 15, 25
