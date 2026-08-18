# Prompt — 30 frames (+12°)

**Pasta:** `public/matrix_car/{N}_hero/`

Canvas: **1700×1254**, transparente, carro no eixo central.
Estilo: 16-bit SNES / Rock’n Roll Racing; mesma identidade da **vitrine** anexada.

## Contrato

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

- **Start:** `indice[25] = 4.0 = 300°` (pose da vitrine)
- **Costas:** `indice[13]` **ou** `indice[14]` (olho); `indice[15] = 180°` na grade
- **índice Zero Costas:** `indice[29] = 5.6 = 348°`
- Arquivos do array: `car_N_a000.png` … `car_N_a029.png` (índice = nome)
- **`car_N_hero.png` = VITRINE** — não mexer; **não** faz parte do array
- Não flippar; não recompactar buracos

## Ordem de geração

Começar no **25** e seguir +12°:

`25, 26, 27, 28, 29, 0, 1, 2, …, 24` → volta ao 25.

## Prompt (colar; anexar a vitrine só como referência de identidade)

```
Create ONE frame of a 30-frame clockwise rotation of the same car sprite.

Clock contract (+12° per frame):
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
indice[13] = 11.2 = 156°  (REAR candidate)
indice[14] = 11.6 = 168°  (REAR candidate)
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
indice[25] = 4.0  = 300°  (SEQUENCE START — same pose as vitrine/hero, but do NOT overwrite hero file)
indice[26] = 4.4  = 312°
indice[27] = 4.8  = 324°
indice[28] = 5.2  = 336°
indice[29] = 5.6  = 348°  (indice Zero Costas)

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
