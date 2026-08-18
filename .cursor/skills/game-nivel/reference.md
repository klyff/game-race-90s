# Game nível — conversão

Humano fala **0–100**. Código do piloto fala **0–1**. Pista mistura 0–1 e unidades.

```
unit(n) = clamp(round(n), 0, 100) / 100
lerp(a, b, t) = a + (b - a) * t
```

Não aceites 0–1 no formulário. Se o humano escrever `0.8`, pergunta: “é 80?”

## Os 10 knobs

| Grupo | Knob | 0 | 50 | 100 |
|---|---|---|---|---|
| Intenção | `attack` | não procura briga | pica quando dá | vai buscar |
| Intenção | `overtake` | espera | passa se estiver claro | vive de ultrapassar |
| Defesa | `defend` | ignora traseira | cobre o óbvio | fecha tudo |
| Defesa | `block` | deixa passar | fecha a porta às vezes | muro |
| Combate | `ram` | evita contacto | encosta | quer o choque |
| Combate | `weapon` | quase não dispara | usa a janela | vive de arma |
| Leitura | `opponentPrediction` | reage ao agora | lê 1 movimento | antecipa a linha |
| Leitura | `opponentMemory` | esquece | lembra o último hit | guarda a lista |
| Limite | `localSteering` | linha larga, corrige tarde | acompanha | cola na racing line |
| Limite | `vehiclePhysics` | trava cedo, sobra grip | no meio do carro | usa o limite do carro |

`vehiclePhysics` / `localSteering` **nunca** mudam `VehicleStats`. Só `skillLimits.ts`.

## Pista

Fonte: `src/data/tracks/planets.ts` `PlanetTerrain`.

| Campo | Fórmula | Faixa real hoje |
|---|---|---|
| `straightBias` | `unit(overtake)` | 0.28 … 0.95 |
| `cornerTightness` | `unit(opponentPrediction)` | 0.20 … 0.88 |
| `surfaceGrip` | `lerp(0.55, 1.10, unit(vehiclePhysics))` | 0.58 … 1.05 |
| `halfWidth` | `lerp(16, 24, (unit(overtake) + (1 - unit(block))) / 2)` | 16 … 24 |

`attack`, `defend`, `ram`, `weapon`, `opponentMemory`, `localSteering` **não** entram na geometria. Ficam no piloto. Um planeta “nível 80 combate” sem um ENFORCER no grid é só número no chat — o perigo na pista continua a ser `worldIndex` + traps.

## Armadilhas

Não recalcules `TrapRules` a partir destes knobs. `worldIndex = planet.index`.

| World | Crates spawn | Drums spawn |
|---|---|---|
| 1 | 4 | 2 |
| 5 | 8 | 6 |
| 10 | 13 | 11 |

Skill: `game-map-traps`.

## Ficheiros

| Alvo | Onde |
|---|---|
| Signature / medium | `src/domain/ai/DriverProfile.ts` |
| Derived | `DERIVED_SPECS` + `deriveProfile.ts` |
| Nome → perfil | `src/domain/ai/DriverRoster.ts` |
| Planeta | `src/data/tracks/planets.ts` |
| Skill do piloto | `src/domain/ai/skillLimits.ts` (ler, não retocar sem pedido) |

## Exemplo

Humano: EMMA, Intenção 80/70, Defesa 20/25, Combate 35/95, Leitura 55/50, Limite 50/48.

Gravado no `row('emma', …)`:

```
attack 0.80  overtake 0.70
defend 0.20  block 0.25
ram 0.35     weapon 0.95
opponentPrediction 0.55  opponentMemory 0.50
localSteering 0.50       vehiclePhysics 0.48
```

Se o alvo for **também** o planeta dela, `terrain` sai:

```
straightBias 0.70
cornerTightness 0.55
surfaceGrip lerp(0.55, 1.10, 0.48) ≈ 0.81
halfWidth lerp(16, 24, (0.70 + 0.75) / 2) ≈ 21.8
```
