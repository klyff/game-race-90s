# Driver Personality

Cada piloto ganha um cérebro determinístico a partir do **nome** (`rivalAgentFor(name)` → `traitsFor(name)`).
Mesmo nome = mesmos valores. O agente não sabe quem é o jogador: disputa o pelotão inteiro.

Dois motivos por baixo de cada decisão (não são traits):

1. I have to win.
2. I cannot let anyone else win.

## Variáveis

### Traits (1–10)

| variável | o que faz |
|---|---|
| `daring` | Ousadia. Freia tarde, commita na curva, vai no gap. |
| `precision` | Precisão. Usa o traçado conhecido como marcas de entrada/saída. |
| `attack` | Ir pra cima. Fecha o carro da frente. |
| `block` | Segurar posição. Cobre o carro de trás. |
| `composure` | Sangue-frio. Mantém o plano quando o pelotão aperta. |
| `ambition` | Eu tenho que vencer. |
| `contest` | Não deixar ninguém vencer — o pelotão, não o player. |

### Agent (derivado do mesmo seed)

| variável | o que faz |
|---|---|
| `pathKind` | Como o piloto “pensa” o caminho: `astar`, `astar-euclidean`, `late-apex`, `early-apex`, `wide-line`, `centreline`. |
| `riskRegister` | 0–255. Quanto aceita andar extra por uma curva mais rápida. |
| `laneRegister` | Offset lateral extra, world units (−7…+7). Evita dois NPCs no mesmo pixel. |
| `aggression` | 0.38–0.93. Empurra o limite de curva, freia mais tarde, segura mais o throttle no fechamento. |

Look-ahead de pursuit (PaceDriver): `lookAheadBase=12`, `lookAheadScaleFactor=0.45`.
Distância de mira ≈ `12 + 0.45 × velocidade`. Os mapas usam 55 u/s → ~37 units à frente.

## Pilotos

### ALINE

papel: `regular`

| variável | valor |
|---|---|
| daring | 6 |
| precision | 9 |
| attack | 10 |
| block | 1 |
| composure | 3 |
| ambition | 9 |
| contest | 10 |
| pathKind | astar |
| riskRegister | 227 |
| laneRegister | 0.906 |
| aggression | 0.436 |

### ENZO

papel: `regular`

| variável | valor |
|---|---|
| daring | 8 |
| precision | 1 |
| attack | 3 |
| block | 5 |
| composure | 8 |
| ambition | 4 |
| contest | 7 |
| pathKind | centreline |
| riskRegister | 86 |
| laneRegister | -1.510 |
| aggression | 0.682 |

### FLUFE

papel: `regular`

| variável | valor |
|---|---|
| daring | 1 |
| precision | 9 |
| attack | 3 |
| block | 8 |
| composure | 1 |
| ambition | 5 |
| contest | 4 |
| pathKind | astar-euclidean |
| riskRegister | 253 |
| laneRegister | -0.631 |
| aggression | 0.630 |

### DAVE

papel: `regular`

| variável | valor |
|---|---|
| daring | 3 |
| precision | 1 |
| attack | 1 |
| block | 6 |
| composure | 9 |
| ambition | 10 |
| contest | 6 |
| pathKind | early-apex |
| riskRegister | 12 |
| laneRegister | -6.835 |
| aggression | 0.647 |

### RAZOR

papel: `regular`

| variável | valor |
|---|---|
| daring | 8 |
| precision | 2 |
| attack | 9 |
| block | 5 |
| composure | 1 |
| ambition | 6 |
| contest | 9 |
| pathKind | astar-euclidean |
| riskRegister | 104 |
| laneRegister | -0.412 |
| aggression | 0.581 |

### NIKKI

papel: `regular`

| variável | valor |
|---|---|
| daring | 8 |
| precision | 6 |
| attack | 8 |
| block | 1 |
| composure | 6 |
| ambition | 3 |
| contest | 7 |
| pathKind | centreline |
| riskRegister | 26 |
| laneRegister | 2.608 |
| aggression | 0.658 |

### DIEGO

papel: `regular`

| variável | valor |
|---|---|
| daring | 1 |
| precision | 9 |
| attack | 5 |
| block | 1 |
| composure | 2 |
| ambition | 6 |
| contest | 2 |
| pathKind | early-apex |
| riskRegister | 54 |
| laneRegister | -2.718 |
| aggression | 0.412 |

### LUNA

papel: `regular`

| variável | valor |
|---|---|
| daring | 5 |
| precision | 3 |
| attack | 3 |
| block | 2 |
| composure | 10 |
| ambition | 5 |
| contest | 9 |
| pathKind | astar-euclidean |
| riskRegister | 114 |
| laneRegister | -2.333 |
| aggression | 0.522 |

### BLAZE

papel: `regular`

| variável | valor |
|---|---|
| daring | 3 |
| precision | 2 |
| attack | 6 |
| block | 1 |
| composure | 7 |
| ambition | 4 |
| contest | 7 |
| pathKind | early-apex |
| riskRegister | 52 |
| laneRegister | -5.627 |
| aggression | 0.471 |

### KIRA

papel: `regular`

| variável | valor |
|---|---|
| daring | 9 |
| precision | 4 |
| attack | 6 |
| block | 4 |
| composure | 9 |
| ambition | 6 |
| contest | 7 |
| pathKind | wide-line |
| riskRegister | 107 |
| laneRegister | 2.718 |
| aggression | 0.788 |

### SNAKE

papel: `regular`

| variável | valor |
|---|---|
| daring | 8 |
| precision | 10 |
| attack | 5 |
| block | 2 |
| composure | 3 |
| ambition | 2 |
| contest | 4 |
| pathKind | centreline |
| riskRegister | 27 |
| laneRegister | -3.706 |
| aggression | 0.574 |

### RIO

papel: `regular`

| variável | valor |
|---|---|
| daring | 4 |
| precision | 1 |
| attack | 5 |
| block | 9 |
| composure | 5 |
| ambition | 6 |
| contest | 5 |
| pathKind | astar-euclidean |
| riskRegister | 35 |
| laneRegister | 6.012 |
| aggression | 0.824 |

### JETT

papel: `regular`

| variável | valor |
|---|---|
| daring | 9 |
| precision | 4 |
| attack | 6 |
| block | 6 |
| composure | 8 |
| ambition | 6 |
| contest | 3 |
| pathKind | astar |
| riskRegister | 160 |
| laneRegister | -3.761 |
| aggression | 0.393 |

### NOVA

papel: `regular`

| variável | valor |
|---|---|
| daring | 9 |
| precision | 2 |
| attack | 5 |
| block | 3 |
| composure | 7 |
| ambition | 1 |
| contest | 2 |
| pathKind | astar-euclidean |
| riskRegister | 66 |
| laneRegister | -5.792 |
| aggression | 0.533 |

### CRUZ

papel: `regular`

| variável | valor |
|---|---|
| daring | 3 |
| precision | 8 |
| attack | 1 |
| block | 8 |
| composure | 4 |
| ambition | 7 |
| contest | 1 |
| pathKind | astar-euclidean |
| riskRegister | 22 |
| laneRegister | -1.620 |
| aggression | 0.824 |

### ASH

papel: `regular`

| variável | valor |
|---|---|
| daring | 1 |
| precision | 4 |
| attack | 6 |
| block | 6 |
| composure | 6 |
| ambition | 8 |
| contest | 7 |
| pathKind | astar-euclidean |
| riskRegister | 123 |
| laneRegister | 2.498 |
| aggression | 0.576 |

### ZARA

papel: `regular`

| variável | valor |
|---|---|
| daring | 1 |
| precision | 5 |
| attack | 7 |
| block | 2 |
| composure | 6 |
| ambition | 2 |
| contest | 2 |
| pathKind | astar-euclidean |
| riskRegister | 121 |
| laneRegister | 7 |
| aggression | 0.846 |

### VINCE

papel: `regular`

| variável | valor |
|---|---|
| daring | 8 |
| precision | 2 |
| attack | 10 |
| block | 4 |
| composure | 8 |
| ambition | 6 |
| contest | 3 |
| pathKind | late-apex |
| riskRegister | 32 |
| laneRegister | -5.737 |
| aggression | 0.785 |

### RUBY

papel: `regular`

| variável | valor |
|---|---|
| daring | 2 |
| precision | 3 |
| attack | 7 |
| block | 5 |
| composure | 9 |
| ambition | 2 |
| contest | 3 |
| pathKind | astar-euclidean |
| riskRegister | 15 |
| laneRegister | -6.671 |
| aggression | 0.436 |

### HEX

papel: `regular`

| variável | valor |
|---|---|
| daring | 5 |
| precision | 6 |
| attack | 6 |
| block | 5 |
| composure | 7 |
| ambition | 4 |
| contest | 8 |
| pathKind | astar |
| riskRegister | 25 |
| laneRegister | 0.851 |
| aggression | 0.658 |

### VIKTOR

papel: `joker`

| variável | valor |
|---|---|
| daring | 7 |
| precision | 8 |
| attack | 1 |
| block | 10 |
| composure | 3 |
| ambition | 4 |
| contest | 2 |
| pathKind | astar |
| riskRegister | 135 |
| laneRegister | 5.792 |
| aggression | 0.770 |

### SEAMUS

papel: `joker`

| variável | valor |
|---|---|
| daring | 2 |
| precision | 7 |
| attack | 9 |
| block | 3 |
| composure | 9 |
| ambition | 4 |
| contest | 5 |
| pathKind | centreline |
| riskRegister | 5 |
| laneRegister | -2.443 |
| aggression | 0.803 |

### NEGAO

papel: `joker`

| variável | valor |
|---|---|
| daring | 4 |
| precision | 5 |
| attack | 3 |
| block | 6 |
| composure | 2 |
| ambition | 2 |
| contest | 8 |
| pathKind | centreline |
| riskRegister | 158 |
| laneRegister | -1.180 |
| aggression | 0.460 |

### LUCA

papel: `joker`

| variável | valor |
|---|---|
| daring | 1 |
| precision | 7 |
| attack | 2 |
| block | 6 |
| composure | 5 |
| ambition | 5 |
| contest | 8 |
| pathKind | astar |
| riskRegister | 211 |
| laneRegister | -1.675 |
| aggression | 0.928 |

### ZOR9

papel: `joker`

| variável | valor |
|---|---|
| daring | 6 |
| precision | 4 |
| attack | 3 |
| block | 9 |
| composure | 6 |
| ambition | 2 |
| contest | 9 |
| pathKind | centreline |
| riskRegister | 107 |
| laneRegister | -4.420 |
| aggression | 0.701 |

### KLYFF

papel: `creator`

| variável | valor |
|---|---|
| daring | 9 |
| precision | 9 |
| attack | 8 |
| block | 4 |
| composure | 10 |
| ambition | 1 |
| contest | 2 |
| pathKind | astar-euclidean |
| riskRegister | 190 |
| laneRegister | -2.773 |
| aggression | 0.555 |

