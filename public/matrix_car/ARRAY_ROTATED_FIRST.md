# ARRAY_ROTATED_FIRST — as is

Snapshot **atual** do array de rotação (car_1).
Schema: **hora · ângulo · imagem · original · w · h · start**.

- **imagem:** arquivo atual no índice (`car_1_a{índice}.png`) ou `null` se buraco
- **original:** arquivo **antes** do rename para índice (`car_1_a{ângulo_antigo}.png`)
- **w / h:** `1700` × `1254`
- **start:** `true` só em **3h ou 4h** (índices 23–27)
- **vitrine:** `car_1_hero.png` fora do array
- Pasta: `public/matrix_car/1_hero/` · gabarito: `../GABARITO_RELOGIO.png`

**NÃO TERMINADO** — cars 2–33 vazios; próximo `2_hero/`.

---

## Schema

```text
indice[N] -> {
  hora:     "H:MM",
  angulo:   N * 12,
  imagem:   "car_1_aNNN.png" | null,   // nome atual (índice)
  original: "car_1_aXXX.png",          // nome antigo (ângulo no olho)
  w:        1700,
  h:        1254,
  start:    true | false
}
```

---

## Array as is (car_1)

### indice[0]
- hora: `6:00`
- angulo: `0°`
- imagem: `car_1_a000.png`
- original: `car_1_a000.png`
- w: `1700`
- h: `1254`
- start: `false`

### indice[1]
- hora: `6:24`
- angulo: `12°`
- imagem: `car_1_a001.png`
- original: `car_1_a008.png`
- w: `1700`
- h: `1254`
- start: `false`

### indice[2]
- hora: `6:48`
- angulo: `24°`
- imagem: `car_1_a002.png`
- original: `car_1_a012.png`
- w: `1700`
- h: `1254`
- start: `false`

### indice[3]
- hora: `7:12`
- angulo: `36°`
- imagem: `car_1_a003.png`
- original: `car_1_a036.png`
- w: `1700`
- h: `1254`
- start: `false`

### indice[4]
- hora: `7:36`
- angulo: `48°`
- imagem: `null`
- original: `car_1_a048.png`
- w: `1700`
- h: `1254`
- start: `false`

### indice[5]
- hora: `8:00`
- angulo: `60°`
- imagem: `car_1_a005.png`
- original: `car_1_a060.png`
- w: `1700`
- h: `1254`
- start: `false`

### indice[6]
- hora: `8:24`
- angulo: `72°`
- imagem: `car_1_a006.png`
- original: `car_1_a072.png`
- w: `1700`
- h: `1254`
- start: `false`

### indice[7]
- hora: `8:48`
- angulo: `84°`
- imagem: `car_1_a007.png`
- original: `car_1_a084.png`
- w: `1700`
- h: `1254`
- start: `false`

### indice[8]
- hora: `9:12`
- angulo: `96°`
- imagem: `car_1_a008.png`
- original: `car_1_a090.png`
- w: `1700`
- h: `1254`
- start: `false`

### indice[9]
- hora: `9:36`
- angulo: `108°`
- imagem: `car_1_a009.png`
- original: `car_1_a102.png`
- w: `1700`
- h: `1254`
- start: `false`

### indice[10]
- hora: `10:00`
- angulo: `120°`
- imagem: `car_1_a010.png`
- original: `car_1_a114.png`
- w: `1700`
- h: `1254`
- start: `false`

### indice[11]
- hora: `10:24`
- angulo: `132°`
- imagem: `car_1_a011.png`
- original: `car_1_a138.png`
- w: `1700`
- h: `1254`
- start: `false`

### indice[12]
- hora: `10:48`
- angulo: `144°`
- imagem: `null`
- original: `car_1_a150.png`
- w: `1700`
- h: `1254`
- start: `false`

### indice[13]
- hora: `11:12`
- angulo: `156°`
- imagem: `car_1_a013.png`
- original: `car_1_a162.png`
- w: `1700`
- h: `1254`
- start: `false`

### indice[14]
- hora: `11:36`
- angulo: `168°`
- imagem: `car_1_a014.png`
- original: `car_1_a174.png`
- w: `1700`
- h: `1254`
- start: `false`

### indice[15]
- hora: `12:00`
- angulo: `180°`
- imagem: `null`
- original: `car_1_a180.png`
- w: `1700`
- h: `1254`
- start: `false`

### indice[16]
- hora: `12:24`
- angulo: `192°`
- imagem: `car_1_a016.png`
- original: `car_1_a186.png`
- w: `1700`
- h: `1254`
- start: `false`

### indice[17]
- hora: `12:48`
- angulo: `204°`
- imagem: `car_1_a017.png`
- original: `car_1_a198.png`
- w: `1700`
- h: `1254`
- start: `false`

### indice[18]
- hora: `1:12`
- angulo: `216°`
- imagem: `car_1_a018.png`
- original: `car_1_a210.png`
- w: `1700`
- h: `1254`
- start: `false`

### indice[19]
- hora: `1:36`
- angulo: `228°`
- imagem: `car_1_a019.png`
- original: `car_1_a222.png`
- w: `1700`
- h: `1254`
- start: `false`

### indice[20]
- hora: `2:00`
- angulo: `240°`
- imagem: `car_1_a020.png`
- original: `car_1_a234.png`
- w: `1700`
- h: `1254`
- start: `false`

### indice[21]
- hora: `2:24`
- angulo: `252°`
- imagem: `car_1_a021.png`
- original: `car_1_a246.png`
- w: `1700`
- h: `1254`
- start: `false`

### indice[22]
- hora: `2:48`
- angulo: `264°`
- imagem: `car_1_a022.png`
- original: `car_1_a258.png`
- w: `1700`
- h: `1254`
- start: `false`

### indice[23]
- hora: `3:12`
- angulo: `276°`
- imagem: `car_1_a023.png`
- original: `car_1_a270.png`
- w: `1700`
- h: `1254`
- start: `true`

### indice[24]
- hora: `3:36`
- angulo: `288°`
- imagem: `car_1_a024.png`
- original: `car_1_a282.png`
- w: `1700`
- h: `1254`
- start: `true`

### indice[25]
- hora: `4:00`
- angulo: `300°`
- imagem: `null`
- original: `car_1_a294.png`
- w: `1700`
- h: `1254`
- start: `true`

### indice[26]
- hora: `4:24`
- angulo: `312°`
- imagem: `car_1_a026.png`
- original: `car_1_a300.png`
- w: `1700`
- h: `1254`
- start: `true`

### indice[27]
- hora: `4:48`
- angulo: `324°`
- imagem: `car_1_a027.png`
- original: `car_1_a306.png`
- w: `1700`
- h: `1254`
- start: `true`

### indice[28]
- hora: `5:12`
- angulo: `336°`
- imagem: `car_1_a028.png`
- original: `car_1_a330.png`
- w: `1700`
- h: `1254`
- start: `false`

### indice[29]
- hora: `5:36`
- angulo: `348°`
- imagem: `car_1_a029.png`
- original: `car_1_a342.png`
- w: `1700`
- h: `1254`
- start: `false`

---

## Tabela compacta

| índice | hora | ângulo | imagem (atual) | original | w | h | start |
|------:|------|-------:|----------------|----------|--:|---:|:-----:|
| 0 | 6:00 | 0° | `car_1_a000.png` | `car_1_a000.png` | 1700 | 1254 | false |
| 1 | 6:24 | 12° | `car_1_a001.png` | `car_1_a008.png` | 1700 | 1254 | false |
| 2 | 6:48 | 24° | `car_1_a002.png` | `car_1_a012.png` | 1700 | 1254 | false |
| 3 | 7:12 | 36° | `car_1_a003.png` | `car_1_a036.png` | 1700 | 1254 | false |
| 4 | 7:36 | 48° | `null` | `car_1_a048.png` | 1700 | 1254 | false |
| 5 | 8:00 | 60° | `car_1_a005.png` | `car_1_a060.png` | 1700 | 1254 | false |
| 6 | 8:24 | 72° | `car_1_a006.png` | `car_1_a072.png` | 1700 | 1254 | false |
| 7 | 8:48 | 84° | `car_1_a007.png` | `car_1_a084.png` | 1700 | 1254 | false |
| 8 | 9:12 | 96° | `car_1_a008.png` | `car_1_a090.png` | 1700 | 1254 | false |
| 9 | 9:36 | 108° | `car_1_a009.png` | `car_1_a102.png` | 1700 | 1254 | false |
| 10 | 10:00 | 120° | `car_1_a010.png` | `car_1_a114.png` | 1700 | 1254 | false |
| 11 | 10:24 | 132° | `car_1_a011.png` | `car_1_a138.png` | 1700 | 1254 | false |
| 12 | 10:48 | 144° | `null` | `car_1_a150.png` | 1700 | 1254 | false |
| 13 | 11:12 | 156° | `car_1_a013.png` | `car_1_a162.png` | 1700 | 1254 | false |
| 14 | 11:36 | 168° | `car_1_a014.png` | `car_1_a174.png` | 1700 | 1254 | false |
| 15 | 12:00 | 180° | `null` | `car_1_a180.png` | 1700 | 1254 | false |
| 16 | 12:24 | 192° | `car_1_a016.png` | `car_1_a186.png` | 1700 | 1254 | false |
| 17 | 12:48 | 204° | `car_1_a017.png` | `car_1_a198.png` | 1700 | 1254 | false |
| 18 | 1:12 | 216° | `car_1_a018.png` | `car_1_a210.png` | 1700 | 1254 | false |
| 19 | 1:36 | 228° | `car_1_a019.png` | `car_1_a222.png` | 1700 | 1254 | false |
| 20 | 2:00 | 240° | `car_1_a020.png` | `car_1_a234.png` | 1700 | 1254 | false |
| 21 | 2:24 | 252° | `car_1_a021.png` | `car_1_a246.png` | 1700 | 1254 | false |
| 22 | 2:48 | 264° | `car_1_a022.png` | `car_1_a258.png` | 1700 | 1254 | false |
| 23 | 3:12 | 276° | `car_1_a023.png` | `car_1_a270.png` | 1700 | 1254 | **true** |
| 24 | 3:36 | 288° | `car_1_a024.png` | `car_1_a282.png` | 1700 | 1254 | **true** |
| 25 | 4:00 | 300° | `null` | `car_1_a294.png` | 1700 | 1254 | **true** |
| 26 | 4:24 | 312° | `car_1_a026.png` | `car_1_a300.png` | 1700 | 1254 | **true** |
| 27 | 4:48 | 324° | `car_1_a027.png` | `car_1_a306.png` | 1700 | 1254 | **true** |
| 28 | 5:12 | 336° | `car_1_a028.png` | `car_1_a330.png` | 1700 | 1254 | false |
| 29 | 5:36 | 348° | `car_1_a029.png` | `car_1_a342.png` | 1700 | 1254 | false |

---

## Mapa índice → original (compacto)

```
0=a000, 1=a008, 2=a012, 3=a036, 4=a048, 5=a060, 6=a072, 7=a084, 8=a090, 9=a102
10=a114, 11=a138, 12=a150, 13=a162, 14=a174, 15=a180, 16=a186, 17=a198, 18=a210, 19=a222
20=a234, 21=a246, 22=a258, 23=a270, 24=a282, 25=a294, 26=a300, 27=a306, 28=a330, 29=a342
```

## Resumo

| | |
|--|--|
| presentes | 26 |
| buracos (`imagem: null`) | 4 → `4, 12, 15, 25` |
| `start: true` | `23–27` (3h–4h) |
| vitrine | `car_1_hero.png` |
| cars 2…33 | só vitrine |

## Strip (as is car_1)

Gerado com `tools/art/car-rotate/build_matrix_strip.py`:

- `1_hero/car_1_strip.png` — RGBA **21645 × 1254** (26 frames; hero fora)
- `1_hero/car_1_strip.json` — centros + **um** retângulo de colisão invisível

### Colisão (um retângulo só)

```
collision_rect.w = round((min_w + max_w) / 2)   # conteúdo trimado
collision_rect.h = round((min_h + max_h) / 2)
```

As is car_1: **767 × 528** (min 582×388 … max 952×668).

Esse retângulo **anda invisível no centro do carro** (`anchor: center_of_car`):
- centro X = slot no strip
- centro Y = `1254 / 2 = 627`

### Escala de produção

Ver **`SCALE.md`**. `const scale = 64 / 1700`.

```bash
magick car_1_strip.png -resize 3.7647% car_1_strip_64.png
```

Colisão arte `767×528` → produção **`29×20`** (`Math.round`).  
Strip arte `21645×1254` → produção **`815×47`**.  
Números em `car_1_strip.json` → `production_scale`.

Algoritmo strip: trim → margem **4px** → soma larguras → canvas `(largura_total, 1254)` → paint L→R com  
`y = Strip.height/2 - trimCar.height/2` (centro vertical).

