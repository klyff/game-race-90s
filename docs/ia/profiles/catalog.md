# Catálogo de perfis NPC

Fonte: `src/domain/ai/DriverProfile.ts`. 30 linhas. Nome de corrida resolve em `profileFor(name)` (`DriverRoster.ts`).
FLUFE → EMMA. Nomes desconhecidos derivam de OPPORTUNIST.

Os números são ponto de partida. `tuningStillRequired`:

- signature and medium desire weights
- utility opportunity / tactical / risk coefficients
- hysteresis threshold and commitment frames
- trajectory candidate spacing and intention reweights
- prediction horizon and memory decay
- vehiclePhysics usable-fraction floors

## Signature (9)

| name | id | parent | atk | def | ovr | ram | wpn | blk | pred | mem | steer | phys |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| KLYFF | klyff | — | 0.55 | 0.75 | 0.85 | 0.15 | 0.50 | 0.50 | 1.00 | 0.45 | 1.00 | 1.00 |
| ALINE | aline | — | 0.60 | 0.55 | 0.95 | 0.10 | 0.45 | 0.45 | 0.90 | 0.40 | 0.95 | 0.98 |
| ENZO | enzo | — | 0.85 | 0.35 | 0.90 | 0.25 | 0.40 | 0.30 | 0.70 | 0.35 | 0.70 | 0.72 |
| EMMA | emma | — | 0.80 | 0.20 | 0.70 | 0.35 | 0.95 | 0.25 | 0.55 | 0.50 | 0.50 | 0.48 |
| VIKTOR | viktor | — | 0.70 | 0.95 | 0.40 | 0.55 | 0.50 | 0.95 | 0.75 | 0.80 | 0.70 | 0.78 |
| SEAMUS | seamus | — | 1.00 | 0.20 | 0.60 | 1.00 | 0.90 | 0.60 | 0.40 | 0.95 | 0.45 | 0.45 |
| NEGAO | negao | — | 0.90 | 0.70 | 0.45 | 0.98 | 0.55 | 0.85 | 0.55 | 0.75 | 0.50 | 0.75 |
| LUCA | luca | — | 0.55 | 0.90 | 0.50 | 0.35 | 0.55 | 0.80 | 0.90 | 0.90 | 0.85 | 0.88 |
| ZOR9 | zor9 | — | 0.70 | 0.50 | 0.65 | 0.15 | 0.90 | 0.40 | 1.00 | 0.60 | 0.80 | 0.85 |

## Medium (10)

| name | id | parent | atk | def | ovr | ram | wpn | blk | pred | mem | steer | phys |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| APEX | apex | — | 0.60 | 0.55 | 0.95 | 0.10 | 0.45 | 0.45 | 0.90 | 0.40 | 0.95 | 0.98 |
| PREDATOR | predator | — | 0.90 | 0.45 | 0.80 | 0.55 | 0.85 | 0.55 | 0.90 | 0.75 | 0.80 | 0.80 |
| ENFORCER | enforcer | — | 0.90 | 0.70 | 0.45 | 0.98 | 0.55 | 0.85 | 0.55 | 0.75 | 0.50 | 0.75 |
| GUNSLINGER | gunslinger | — | 0.85 | 0.40 | 0.55 | 0.20 | 1.00 | 0.35 | 0.95 | 0.75 | 0.65 | 0.70 |
| GUARDIAN | guardian | — | 0.35 | 0.98 | 0.60 | 0.30 | 0.40 | 0.95 | 0.80 | 0.65 | 0.85 | 0.85 |
| OPPORTUNIST | opportunist | — | 0.65 | 0.60 | 0.85 | 0.35 | 0.70 | 0.60 | 0.90 | 0.70 | 0.85 | 0.85 |
| BERSERKER | berserker | — | 1.00 | 0.20 | 0.60 | 1.00 | 0.90 | 0.60 | 0.40 | 0.95 | 0.45 | 0.45 |
| TECHNICIAN | technician | — | 0.55 | 0.75 | 0.80 | 0.20 | 0.60 | 0.65 | 1.00 | 0.80 | 1.00 | 1.00 |
| SLIPSTREAMER | slipstreamer | — | 0.45 | 0.45 | 1.00 | 0.10 | 0.35 | 0.35 | 0.85 | 0.35 | 0.95 | 0.90 |
| NEMESIS | nemesis | — | 0.90 | 0.55 | 0.65 | 0.80 | 0.80 | 0.65 | 0.90 | 1.00 | 0.75 | 0.75 |

## Derived (11)

| name | id | parent | atk | def | ovr | ram | wpn | blk | pred | mem | steer | phys |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DAVE | dave | apex | 0.53 | 0.56 | 1.00 | 0.08 | 0.50 | 0.38 | 0.89 | 0.32 | 0.96 | 0.97 |
| RAZOR | razor | predator | 0.89 | 0.47 | 0.82 | 0.53 | 0.77 | 0.61 | 0.84 | 0.68 | 0.78 | 0.80 |
| NIKKI | nikki | berserker | 1.00 | 0.27 | 0.61 | 1.00 | 0.87 | 0.61 | 0.39 | 1.00 | 0.46 | 0.42 |
| DIEGO | diego | guardian | 0.34 | 0.93 | 0.63 | 0.24 | 0.41 | 0.98 | 0.80 | 0.71 | 0.82 | 0.84 |
| LUNA | luna | technician | 0.49 | 0.69 | 0.79 | 0.21 | 0.53 | 0.58 | 1.00 | 0.79 | 1.00 | 1.00 |
| BLAZE | blaze | opportunist | 0.64 | 0.52 | 0.81 | 0.33 | 0.70 | 0.56 | 0.93 | 0.75 | 0.86 | 0.85 |
| KIRA | kira | slipstreamer | 0.38 | 0.45 | 1.00 | 0.13 | 0.42 | 0.41 | 0.80 | 0.28 | 0.97 | 0.88 |
| SNAKE | snake | nemesis | 0.84 | 0.55 | 0.69 | 0.85 | 0.80 | 0.67 | 0.92 | 1.00 | 0.74 | 0.77 |
| RIO | rio | enforcer | 0.88 | 0.73 | 0.47 | 0.97 | 0.63 | 0.86 | 0.48 | 0.73 | 0.49 | 0.76 |
| JETT | jett | gunslinger | 0.85 | 0.45 | 0.63 | 0.20 | 1.00 | 0.29 | 0.87 | 0.80 | 0.63 | 0.71 |
| NOVA | nova | opportunist | 0.68 | 0.58 | 0.91 | 0.29 | 0.75 | 0.58 | 0.87 | 0.64 | 0.83 | 0.88 |

## Aliases extra resolvidos nesta dump

| alias | displayName | id | tier | parent |
|---|---|---|---|---|
| CRUZ | CRUZ | cruz | derived | guardian |
| ASH | ASH | ash | derived | opportunist |
| ZARA | ZARA | zara | derived | predator |
| VINCE | VINCE | vince | derived | enforcer |
| RUBY | RUBY | ruby | derived | slipstreamer |
| HEX | HEX | hex | derived | technician |
| FLUFE | EMMA | emma | signature | — |
| UNKNOWN | UNKNOWN | unknown | derived | opportunist |
