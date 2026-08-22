# 98 vs Delorean — direção → índice

Cópia do `delorean_hero/`. Prefixos no lab: `car_98_*`. Originais **não mexidos**.

| | delorean_hero | 98_hero (nogo) |
|--|---------------|----------------|
| strip count | 30 | 30 |
| `i` vs `index` | iguais 0–29 | iguais 0–29 |
| boot `frameCount` | 30 | 30 |
| start Basin | indice[25] | indice[25] |
| linha verde | — | `car_98_strip_64_yaw.png` |

JSON 30/30. Math do relógio bate. A linha verde em cada célula é o yaw oficial (`index × 12°`, 0 = 6h / baixo). Se o nariz não seguir a linha, o PNG daquele slot está no nome errado — **renomear**, não flippar.

## Watch

`?watch=1&car=nogo-98`. Overlay: start tem de ler `idx 25/30`.

## Gate regen

Sem `delorean_aXXX` no git (tar iCloud). Não gerar frames novos neste passe. 31_hero só coordenadas — gate 30/30 já passou; sem strip.
