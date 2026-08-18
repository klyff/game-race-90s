# Carros novos — deixa os heróis aqui

Uma pasta. Tu pões os heróis. O Cursor faz a tira de todos.

## Nomes (sempre)

| Ficheiro | O que é |
| --- | --- |
| `car_1_hero.png` | A **matriz**. Apresenta o carro no jogo. Tamanho Hero. |
| `car_1_strip.png` | A **tira** completa (32 frames). O Cursor cria. |

O `1` sobe: `car_2_hero.png`, `car_3_hero.png`, …

## Onde fica cada coisa

```
public/assets/cars/new/
  car_1_hero.png        ← tu pões (matriz)
  car_2_hero.png

public/assets/cars/
  car_1_hero.png        ← o jogo mostra isto na garage
  car_1_strip.png       ← tira, só depois da corrida de teste
```

O hero nesta pasta já serve para o jogo apresentar o carro. Depois do strip, o mesmo hero vive ao lado da tira em `public/assets/cars/`.

## O que o Cursor faz

1. Lê cada `car_*_hero.png` desta pasta.
2. Desenha 32 poses (relógio, 128×128) a partir dessa matriz. Não roda o hero.
3. Empacota `car_N_strip.png`. Não instala até tu pedires.

Skill: `.cursor/skills/sprite-strip/`. Contrato e uso: `.cursor/skills/game-sprint-sprites-2d/` ([USAGE.md](../../../.cursor/skills/game-sprint-sprites-2d/USAGE.md)).

Melhor forma: deixas os `car_*_hero.png` aqui, no chat dizes **`strip de todos`**. O agente faz as âncoras de todos primeiro; tu olhas `anchors-preview.png`; depois os 28. Sem `--install` até à corrida.
