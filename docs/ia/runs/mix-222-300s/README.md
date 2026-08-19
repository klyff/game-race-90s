# Mix 2-2-2 — 300 s — Thunder Basin II

Headless. Seed 1. 2 experts + 2 mediums + 2 bobos. 15 voltas permitidas. 297 s simulados, 1.9 s wall.

Ler por esta ordem: `standings.md` → `position-series.tsv` → `speed-series.tsv` → `drivers/*.txt`.

JSON cru: `summary.json`, `series.json`.

## Grelha

| slot | name | car | skill | band |
|---|---|---|---:|---|
| expert | KLYFF | car_21 | 3.00 | signature |
| expert | TECHNICIAN | car_28 | 3.00 | medium |
| medium | GUARDIAN | car_13 | 2.50 | medium |
| medium | PREDATOR | car-3 | 2.50 | medium |
| bobo | BERSERKER | car_17 | 1.30 | medium |
| bobo | SEAMUS | car-7-turbo | 1.30 | signature |

## Como ler um log

Uma linha a cada 3 s. Campos úteis: `t` `pos` `lap` `dist` `spd` `lat` `surf` `integ` `intent` `exec`.

Exemplo (KLYFF, wipe + respawn):

```
t=74.98 pos=1/6 lap=1/15 dist=1956.2 spd=0.0 integ=0.00 cond=destroyed intent=RECOVER
t=77.98 pos=1/6 lap=2/15 dist=76.6 spd=61.7 integ=1.00 cond=healthy intent=RECOVER
```

PREDATOR parado na largada: `dist` fica ~278 de t=15 a t=75, `spd` 6–12.
