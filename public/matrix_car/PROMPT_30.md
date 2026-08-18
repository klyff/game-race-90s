# Prompt — 30 frames (+12°)

**Pasta:** `public/matrix_car/{N}_hero/`

Canvas: **1700×1254**, transparente, carro no eixo central.
Estilo: 16-bit SNES / Rock’n Roll Racing; mesma identidade da **vitrine** anexada.

## Contrato

**Gabarito:** `public/matrix_car/GABARITO_RELOGIO.png`

```
indice[0]  = 6:00 =   0°
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
indice[13] = 11:12 = 156° --> Costas aqui ou
indice[14] = 11:36 = 168° --> Ou Costas aqui
indice[15] = 12:00 = 180°
indice[16] = 12:24 = 192°
indice[17] = 12:48 = 204°
indice[18] =  1:12 = 216°
indice[19] =  1:36 = 228°
indice[20] =  2:00 = 240°
indice[21] =  2:24 = 252°
indice[22] =  2:48 = 264°
indice[23] =  3:12 = 276°
indice[24] =  3:36 = 288°
indice[25] =  4:00 = 300° --> Começamos aqui
indice[26] =  4:24 = 312°
indice[27] =  4:48 = 324°
indice[28] =  5:12 = 336°
indice[29] =  5:36 = 348° = indice Zero Costas
```

- **Start:** `indice[25] = 4:00 = 300°` (pose da vitrine)
- **Costas:** `indice[13]` **ou** `indice[14]` (olho); `indice[15] = 12:00 = 180°`
- **índice Zero Costas:** `indice[29] = 5:36 = 348°`
- Passo: **+12°** = **+0.4 h**
- Arquivos do array: `car_N_a000.png` … `car_N_a029.png`
- **`car_N_hero.png` = VITRINE** — não mexer; **não** faz parte do array
- Não flippar; não recompactar buracos

## Ordem de geração

Começar no **25** e seguir +12°:

`25, 26, 27, 28, 29, 0, 1, 2, …, 24` → volta ao 25.

## Prompt (colar; anexar a vitrine só como referência de identidade)

```
Create ONE frame of a 30-frame clockwise rotation of the same car sprite.

Clock contract (+12° = +0.4h per frame; 0° at 6:00):
indice[0]  = 6:00 =   0°
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
indice[13] = 11:12 = 156°  (REAR candidate)
indice[14] = 11:36 = 168°  (REAR candidate)
indice[15] = 12:00 = 180°
indice[16] = 12:24 = 192°
indice[17] = 12:48 = 204°
indice[18] =  1:12 = 216°
indice[19] =  1:36 = 228°
indice[20] =  2:00 = 240°
indice[21] =  2:24 = 252°
indice[22] =  2:48 = 264°
indice[23] =  3:12 = 276°
indice[24] =  3:36 = 288°
indice[25] =  4:00 = 300°  (SEQUENCE START — same pose as vitrine/hero, but do NOT overwrite hero file)
indice[26] =  4:24 = 312°
indice[27] =  4:48 = 324°
indice[28] =  5:12 = 336°
indice[29] =  5:36 = 348°  (indice Zero Costas)

THIS FRAME: indice[{INDEX}] = {CLOCK} = {ANGLE}°
Filename: car_{N}_a{INDEX:03d}.png
Output folder: public/matrix_car/{N}_hero/

Keep exactly the same vehicle identity as the attached vitrine/hero reference: proportions, wheels, suspension, roofline, weapons, colors, stripes, lightbar, antennas, spoiler, tires, pixel-art shading, black outline, glossy highlights, 16-bit SNES / Rock’n Roll Racing style.

Rules:
- nose = clock hand; rotate CLOCKWISE; +12° per frame
- sequence starts at indice[25] = 300°
- centered on canvas axis; identical scale across all 30 frames
- canvas 1700×1254; transparent or pure black void
- orthographic 2:1 dimetric; no redesign; no zoom; no mirroring shortcuts
- rename only if pose is right and index is wrong — never flip to “fix” names
- car_{N}_hero.png is VITRINE only — leave it alone; never overwrite; not part of the 30-frame array
```

## Correção

Pose certa + nome errado → **renomear**. Não flippar. Não regenerar.  
**Nunca** alterar `car_N_hero.png`.
