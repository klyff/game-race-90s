---
name: game-nivel
description: >-
  Asks for 0–100 level parameters in 5 groups (intenção, defesa, combate,
  leitura, limite) and maps them onto NPC DriverProfile weights and planet
  terrain. Use when authoring a nível, tunando piloto, planeta, pista,
  DriverProfile, or when the user mentions parâmetros 0 a 100, 5 grupos,
  or game-nivel.
---

# Game nível

Um nível é um bloco de 10 knobs, **0 a 100**, em **5 grupos**. O mesmo bloco
alimenta o piloto (`DriverProfile`) e a pista (`PlanetTerrain` + armadilhas).

Não inventes números. Pede o formulário. Só escreve código depois dos 10 valores.

## Quando

Pedido de nível / parâmetros 0–100 / 5 grupos / tunar perfil / tunar planeta.
Também quando fores autorar ou retocar um `DriverProfile` ou um `PLANETS[]`.

## Não negociável

1. Pede os 10 knobs. Não completes com “média 50” sem o humano dizer.
2. Escala humana = **0–100**. Código do piloto = `n / 100` (0..1).
3. `vehiclePhysics` e `localSteering` são **skill do piloto**, nunca bónus do carro.
   Não mutes `VehicleStats`.
4. Personalidade fica quando o carro muda. Capability/risk é que segura o RAM.
5. Sem `Math.random()` / `Date.now()` em pista. Seed = `planet.seed`.
6. Pistas authored (`thunder-basin`, `thunder-basin-2`) não se regeneram.
7. Depois de mudar `controlPoints` / `rampZones`, `npm run gen:traps`.

## Os 5 grupos

| # | Grupo | Knobs (0–100) | Piloto | Pista |
|---|---|---|---|---|
| 1 | **Intenção** | `attack` `overtake` | desejo de atacar / ultrapassar | `straightBias`, sala de passe (`halfWidth` sobe) |
| 2 | **Defesa** | `defend` `block` | cobrir / fechar | pista aperta (`halfWidth` desce) |
| 3 | **Combate** | `ram` `weapon` | bater / arma | densidade de caixote + tonel |
| 4 | **Leitura** | `opponentPrediction` `opponentMemory` | antecipar / guardar rancor | `cornerTightness` |
| 5 | **Limite** | `localSteering` `vehiclePhysics` | precisão / quanto do grip usa | `surfaceGrip` |

Tabela de conversão e faixas: [reference.md](reference.md).

## Passo a passo

1. Diz o alvo: **piloto** (`profileFor` / `SIGNATURE` / `MEDIUM` / `DERIVED`), **planeta** (`PLANETS[]`), ou **ambos**.
2. Cola o formulário abaixo. Espera os 10 números (ou um baseline + overrides).
3. Converte, mostra a tabela 0–100 ↔ código, e só então escreve.
4. Piloto → `src/domain/ai/DriverProfile.ts` (e roster se for nome novo).
5. Planeta → `src/data/tracks/planets.ts` `terrain`. Não mexas em `TrapRules` só porque o combate subiu — o `worldIndex` já cresce o pool. Combate alto num mundo baixo = o **campo** é que é briguento, não a fórmula global.
6. Derived: edita o **medium pai** ou o jitter; não finjas signature.

## Formulário (obrigatório)

Copia e pede o preenchimento. Inteiros 0–100. Vazio = ainda não respondido.

```
Nível: <nome>          Alvo: piloto | planeta | ambos

1 Intenção
  attack:               ___
  overtake:             ___

2 Defesa
  defend:               ___
  block:                ___

3 Combate
  ram:                  ___
  weapon:               ___

4 Leitura
  opponentPrediction:   ___
  opponentMemory:       ___

5 Limite
  localSteering:        ___
  vehiclePhysics:       ___
```

Se o humano der **um** número (“nível 70”), usa 70 nos 10 e **mostra o formulário** para ele puxar cada grupo. Não trates isso como final até ele confirmar.

## Conversão rápida

```
unit(n) = clamp(n, 0, 100) / 100
```

Piloto: os 10 knobs vão crus para `row(...)` via `unit`.

Pista (a partir dos mesmos 10):

```
straightBias     = unit(overtake)
cornerTightness  = unit(opponentPrediction)
surfaceGrip      = lerp(0.55, 1.10, unit(vehiclePhysics))
halfWidth        = lerp(16, 24, (unit(overtake) + (1 - unit(block))) / 2)
```

Armadilhas continuam a ser função de `planet.index`, não destes knobs. Ver `game-map-traps`.

## Depois de escrever

Mostra no chat os 5 grupos com os valores 0–100 e o 0–1 gravado. Uma linha por grupo. Sem commit a menos que o humano peça.
