# Escala de produção — matrix_car → jogo

Canvas de arte: **1700** (largura de referência) × **1254**.  
Alvo de produção: **64** px na largura de referência.

## Fator (JS / arrays / colisão)

```js
const SCALE = 64 / 1700; // 0.03764705882352941 ≈ 0.037647
```

Ou, sem guardar o fator:

```js
value64 = value1700 * 64 / 1700;
```

### Converter um array de pontos

```js
const points = [
  { x: 850, y: 627 },
  { x: 1200, y: 500 },
  { x: 300, y: 900 },
];

const scale = 64 / 1700;

const scaled = points.map((p) => ({
  x: Math.round(p.x * scale),
  y: Math.round(p.y * scale),
}));

// → [
//   { x: 32, y: 24 },
//   { x: 45, y: 19 },
//   { x: 11, y: 34 },
// ]
```

Mesma regra para largura/altura:

```js
newWidth  = Math.round(oldWidth  * scale);
newHeight = Math.round(oldHeight * scale);
```

## Centro da imagem

| | arte | produção |
|--|------|----------|
| canvas | `1700 × 1254` | `64 × 47.21` ≈ **64 × 47** |
| centro | `(850, 627)` | `(32, 23.60)` → **`(32, 24)`** com `Math.round` |

```js
const SCALE = 64 / 1700;
const cx = Math.round(850 * SCALE); // 32
const cy = Math.round(627 * SCALE); // 24
```

## ImageMagick (só PNG)

```bash
magick input.png -resize 3.7647% output.png
```

`3.7647` = `scale * 100` — **porcentagem do magick**, não o fator de multiplicação.

## Importante

| uso | valor |
|-----|--------|
| Arrays, JSON, colisão, JS | **`0.037647`** ou **`64 / 1700`** |
| `magick -resize` | **`3.7647%`** |

**Não use `3.7647` para multiplicar arrays.** Isso seria ×100 demais.  
Para multiplicação direta: **`0.037647`**.

## Exemplos (`Math.round(v * 64 / 1700)`)

| old (arte) | produção |
|-----------:|---------:|
| 1700 | 64 |
| 1254 | 47 |
| 850 | 32 |
| 627 | 24 |
| 500 | 19 |
| 100 | 4 |

## car_1 as is

| | arte | × SCALE (round) |
|--|------|-----------------|
| strip | 21645 × 1254 | **815 × 47** |
| `collision_rect` | 767 × 528 | **29 × 20** |
| centro Y | 627 | **24** |

Números em `car_N_strip.json` → `production_scale` (já com `Math.round`).  
PNG strip 64: `magick car_N_strip.png -resize 3.7647% car_N_strip_64.png` (quando for gerar).
