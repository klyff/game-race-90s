# Uso — melhor forma

O humano deixa heróis. O agente faz a tira. A skill não se “configura”: lê-se e executa-se.

## Invocar

No Cursor, chega uma destas frases (ou `@game-sprint-sprites-2d`):

| O humano diz | O agente faz |
| --- | --- |
| `strip de todos` | Lista `new/*_hero.png` e faz **cada** carro sem hero→tira |
| `faz a tira do car_4` | Só esse id |
| `continua as tiras` | Retoma âncoras já feitas; desenha os 28 em falta |
| `instala o car_4` | `--install` **só** se o humano pediu depois da corrida |

Não é preciso `/` nem flags. Não peças `IDENTITY.md`.

## Melhor forma (esta ordem)

1. **Heróis primeiro.** O humano põe `car_N_hero.png` em `public/assets/cars/new/`. 300×300. Pode olhar à esquerda ou à direita. Um PNG chega.
2. **Uma frase.** `strip de todos` (ou o id).
3. **Âncoras de todos, depois o resto.** Para cada carro: 00, 08, 16, 24 → fit 128 → preview. O humano olha `new/anchors-preview.png`. Só então os 28.
4. **Pack sem instalar.** `qa-strip` + `pack-redrawn` (sem `--install`) + `gen:collision-maps`.
5. **Corrida.** Faróis no nariz, spoiler na mala. Depois o humano pede o install.

Não desenhes os 32 de um carro até ao fim enquanto os outros ainda não têm âncoras. O teste esquerda/direita vive nas âncoras.

## O que o humano prepara

```
public/assets/cars/new/car_1_hero.png
public/assets/cars/new/car_2_hero.png
```

- Nome exacto: `car_N_hero.png` → tira `car_N_strip.png`. Id = `car_1`, `car_2`, …
- Tamanho Hero **300×300**. Se vier maior, o agente reduz a 300 (não estica um 64).
- Fundo preto ou transparente. Não é tabela de ângulos.
- Mistura esquerda/direita é **boa** — não “corrigir”.

## O que o agente não pede

- Pasta por carro, `IDENTITY.md`, front/side/rear.
- “De que lado está o hero?” para mudar o frame 0.
- Permissão para `--install` no mesmo turno em que desenha.
- A tira velha em `public/assets/cars/{id}.png` ou `old-version/`.

## Frases más → o que fazer em vez

| Evitar | Fazer |
| --- | --- |
| “Roda o hero que está ao contrário” | Desenha o yaw. Frame 0 = baixo-direita |
| “Usa a tira antiga como pose” | Só o hero. Poses mentem |
| “Encolhe este frame, está grande” | Sólidos fixos. Vazio na célula é correcto |
| “Faz um mapa de colisão por ângulo” | Um quadrado: `(min + max) / 2` |
| “Instala e vemos” | Pack para `redrawn/`. Install depois da corrida |

## Duas skills

| Skill | Quando |
| --- | --- |
| `game-sprint-sprites-2d` | Contrato: nomes, lado do hero, quadrado do meio, ordem de trabalho |
| `sprite-strip` | Execução: CLOCK, prompts, FIT, qa/pack |

O agente lê esta skill primeiro. Para desenhar um frame, abre `sprite-strip` + CLOCK + FIT.
