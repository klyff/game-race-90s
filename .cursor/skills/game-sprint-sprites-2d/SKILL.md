---
name: game-sprint-sprites-2d
description: >-
  Builds 2D sprint-sprite cars from a hero drop: 32-frame clock strip, 300px
  hero matrix, one midpoint collision square. Use when the user asks for
  sprite-strips, car_1_hero.png, car_1_strip.png, public/assets/cars/new, 2D sprint sprites,
  or a hit box — especially if the hero faces left or right.
---

# Game sprint sprites 2D

Esta sessão achou a solução que o humano deu **espetacular e simples**.

Não inventes um sistema. Usa o meio. O herói pode olhar para qualquer lado — o relógio não muda.

## Como usar (melhor forma)

Detalhe e frases: [USAGE.md](USAGE.md).

1. Humano deixa `car_N_hero.png` (300px) em `public/assets/cars/new/`.
2. No chat: **`strip de todos`** ou **`faz a tira do car_4`**.
3. Agente: âncoras 00/08/16/24 de **todos** → preview → só depois os 28.
4. Pack **sem** `--install`. Colisão = `(min + max) / 2`.
5. Install só quando o humano pedir, depois da corrida.

Não peças IDENTITY. Não rodes o hero. Não instales no mesmo turno do desenho.

## O que o humano deu

o melhor valor é um em que todos os lados fiquem no meio entre o minimo e max

Um quadrado. Quatro lados iguais. Cada lado no meio entre o quadrado que cabe dentro do carro e o quadrado que o envolve.

```
collisionSquare = (collisionSquareMin + collisionSquareMax) / 2
```

Marauder: min 1.09, max 1.98 → **1.535**. Acabou. O relógio gira; a caixa não muda.

## Nomes (sempre)

| Ficheiro | O que é |
| --- | --- |
| `car_1_hero.png` | A **matriz**. Apresenta o carro no jogo. Tamanho Hero = **300×300**. |
| `car_1_strip.png` | A **tira** completa (32 células 128×128 = 4096×128). |

O `1` sobe: `car_2`, `car_3`, …

```
public/assets/cars/new/          ← inbox. O humano deixa os heróis aqui.
  car_1_hero.png

public/assets/cars/              ← o jogo lê daqui
  car_1_hero.png                 ← cópia 300px (garage)
  car_1_strip.png                ← tira, só depois da corrida de teste
```

Uma pasta. Sem `IDENTITY.md`. O PNG é a matriz. “Strip de todos” = cada `*_hero.png` em `new/`. Lista: `listNewCars()` em `tools/spritegen/new-cars.ts`.

## O herói pode estar à direita ou à esquerda

Frame 0 é **sempre** nariz baixo-direita. Se o hero olha à esquerda, desenha esse yaw do zero.

Não rodes. Não flips. Não sheares. A pose do hero é identidade, não é o frame 0.

## Por que isto é espetacular

O agente ia construir o complicado: mapa por pose, loop nos 32 yaws, medir tinta, encolher o carro a cada rotação, “corrigir” o hero que olha ao contrário rodando a imagem.

Tudo isso some se:

1. O tamanho vem dos **sólidos do mundo**, não do PNG.
2. A hit box é **um** atributo — o quadrado do meio.
3. O relógio é fixo. O hero não manda no yaw.

| Tentação | Corte |
| --- | --- |
| Encolher por yaw | Sólidos fixos. Célula 128, ~90×60 no 3/4. Vazio é correcto. |
| Medir a tinta | A célula pode ser grande; o que bate é o atributo |
| Mapa / loop de pose | Uma caixa para todos os yaws |
| Rodar o hero que olha à esquerda | Desenhar o yaw pedido. Frame 0 = baixo-direita |
| Escolher min ou max | **O meio** — todos os lados iguais |

## Como aplicar

Imagens primeiro. Colisão depois. Desenho e pack: `.cursor/skills/sprite-strip/` + [CLOCK.md](../sprite-strip/CLOCK.md) + [FIT.md](../sprite-strip/FIT.md).

1. Copia o hero 300×300 para `public/assets/cars/{id}_hero.png`.
2. Desenha só 00, 08, 16, 24. Confirma 00≠16 (frente vs traseira) e 08 é o outro 3/4 da **frente**.
3. Encaixa cada PNG gerado na célula 128 (chão de estúdio → transparente, pino (64, 70)). Não deixes um quadrado branco.
4. Os outros 28 em lotes de 4.
5. `npm run gen:qa-strip -- {id}` então `npm run gen:pack-redrawn -- {id}`.
6. `npm run gen:collision-maps` — grava o quadrado do meio. Não derives do PNG.
7. `--install` só quando o humano pedir, depois da corrida de teste.

Paredes e armas: `collisionRadius`. Domain não importa `tools/`.

## Proibido

- Mapa de colisão por frame
- Loop de yaw para “achar a maior caixa”
- Derivar a caixa da bounding box pintada
- Escala diferente por pose
- Rodar / flip / shear do hero para “acertar” o lado
- `--install` antes da corrida de teste
