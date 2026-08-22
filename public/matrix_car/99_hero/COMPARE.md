# 99 vs 1 — direção → índice

Cópia do Marauder. Produção em `1_hero/` **não foi alterada**.

| | 1_hero (produção) | 99_hero (nogo) |
|--|-------------------|----------------|
| strip count | 26 (compactado) | 26 células no PNG |
| boot `frameCount` | **26** (`applyMatrixStripToSheet`) | **30** (contrato nogo) |
| Phaser frame name | pack `i` 0–25 | clock `index` 0–29 |
| start Basin | heading 0 → idx **21** na roda de 26 | heading 0 → idx **25** |
| célula 25 | **não existe** (buraco) | pedida, ausente — start sem arte |
| linha verde | — | `car_99_strip_64_yaw.png` |

## Compactação (`i` → clock `index`)

| pack i | clock | arquivo |
|------:|------:|---------|
| 0–3 | 0–3 | a000–a003 |
| 4 | **5** | a005 |
| 5–10 | 6–11 | |
| 11 | **13** | |
| 12 | **14** | |
| 13–21 | 16–24 | |
| 22–25 | 26–29 | |

Buracos clock: **4, 12, 15, 25**. 25 = hero / start.

## Watch

`?watch=1&car=nogo-99` (alias `watchPinCar`). Overlay liga sozinho: `hdg / yaw / idx / drawn`.

## Gate regen

Não regenerar produção. No 99, o único slot que destrói a reta de baixo é **a025** (cópia da vitrine, sem mexer no hero). 4 / 12 / 15 em seguida. Sem tars iCloud, não há `aXXX` para rename.
