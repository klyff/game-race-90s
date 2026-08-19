# Conclusões — testes IA 2026-08-18

**Baseline pré-V2.** O cérebro vivo está em `V2.md` (`292c0ab`). Não afines pesos de `RECOVER` a partir deste ficheiro.

## Estado

Perfis NPC **implementados** (30 linhas: 9 signature, 10 medium, 11 derived).
`profileFor(name)` é estável. FLUFE resolve para EMMA.

Equilíbrio de pista **não** está fechado. O próprio código marca `TUNING_STILL_REQUIRED`.

## O que os três testes mostram

| run | pasta | grelha | pista | resultado |
|---|---|---|---|---|
| lottery 177 s | `runs/lottery-177s/` | 14, sorteio | Thunder Basin II | ninguém fecha 3 voltas; RECOVER 728/854 (85%) |
| mix 2-2-2 300 s | `runs/mix-222-300s/` | 2+2+2 por skill | Thunder Basin II | P1 KLYFF 8 voltas; ordem expert→médio→bobo **excepto** PREDATOR |
| QA live 300 s | `runs/qa-live-300s/` | 14 lottery | Basin I, Basin II, Bogmire | Basin I/II fecham 3 voltas; Bogmire **0 voltas** |

## Mix 2-2-2 (o teste de personalidade)

Ordem final: KLYFF (expert, 8) → TECHNICIAN (expert, 8) → GUARDIAN (médio, 8) → BERSERKER (bobo, 7) → SEAMUS (bobo, 6) → PREDATOR (médio, 5).

- KLYFF toma P1 aos 60 s e não larga. Wipe de integridade ~75 s (spd 0 no TSV) e respawn; continua P1.
- BERSERKER lidera até ~45 s — único perfil que ainda faz BLOCK nos logs.
- PREDATOR estaciona dist≈278 de t=15 a t=75 (~11 u/s). Depois as voltas voadoras andam nos 36 s, iguais aos experts. Falhou a largada, não o ritmo.
- RECOVER ≈ 95% das amostras de 3 s mesmo no mix. O teste lê **ritmo**, não táctica.

Série de posição: `runs/mix-222-300s/position-series.tsv`.
Série de velocidade: `runs/mix-222-300s/speed-series.tsv`.

## Lottery 14 NPC

RACE desaparece depois dos ~30 s. OVERTAKE disparou 1 vez. Dirt não explica o recover (TARMAC 757 vs DIRT 97). Primeiro knob: histerese / saída de RECOVER no agente.

Detalhe por piloto: `runs/lottery-177s/analysis.json`.

## QA 3 pistas

- Basin I: KLYFF P1; pelotão fecha 3 voltas; rampa extra 15° usada (7430 ticks no ar).
- Basin II: GUARDIAN P1; NIKKI / DIEGO / LUCA destruídos — void 45° pune o landing.
- Bogmire: 0 voltas em 297 s; moinho de RECOVER. Rampas W3 existem no ficheiro da pista; o pelotão não as corre.

Índice de screenshots (binários fora do git, em `~/tmp/...`): `runs/qa-live-300s/screenshots.tsv`.

## Linha de pista

Thunder Basin II é um loop CCW: recta longa (45° a meio) → bowl este → S norte → recta oeste (30°) → hairpin SO.

SVG textual: `lines/thunder-basin-2.svg`.
PNG dos 6 traçados do mix: `lines/thunder-basin-2-mix-traces.png` + `.md`.

## Próximo ajuste (não é falta de perfil)

1. Sair de RECOVER quando o carro já está em TARMAC e velocidade alta.
2. Investigar a largada do PREDATOR (park em dist≈278).
3. Bogmire: grip / void / recovery, não a geometria das rampas.
