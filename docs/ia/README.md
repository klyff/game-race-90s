# Pacote IA — leitura para LLM

Pasta única com os testes de IA, perfis NPC, logs, linha de pista e desenhos.
Tudo o que um modelo precisa está em **texto**: Markdown, JSON, TSV, TXT, SVG.
PNGs são opcionais (há legenda ao lado).

Data do pacote: **2026-08-18**.

## Ordem de leitura

1. `V2.md` — cérebro **vivo** (futures → rollout → RaceCore). Não reverter.
2. Este ficheiro (`docs/ia/README.md`)
3. `FINDINGS.md` — baseline **antes** da V2 (RECOVER a 85–95%). Não é o brief actual.
4. `profiles/catalog.md` + `profiles/catalog.json` — 30 cérebros
5. `runs/mix-222-300s/` — teste de skill 2 experts / 2 médios / 2 bobos
6. `runs/lottery-177s/` — 14 NPCs, ~177 s
7. `runs/qa-live-300s/` — 3 pistas × 300 s + screenshots
8. `lines/` — geometria e racing line

Não leias `.tmp/reportIA*` nem `~/tmp/run-*` a menos que este pacote aponte para um binário.

## Mapa

```
docs/ia/
  V2.md                     ← cérebro vivo (NPC AI V2, commit 292c0ab)
  README.md                 ← estás aqui
  MANIFEST.json             índice máquina (paths + role)
  FINDINGS.md               ← baseline pré-V2, não o brief actual
  profiles/
    catalog.json            30 perfis + aliases resolvidos
    catalog.md              as mesmas tabelas
  lines/
    thunder-basin-2.md      geometria + como ler o SVG
    thunder-basin-2.svg     fita + racing line (texto)
    thunder-basin-2-mix-traces.png
    thunder-basin-2-mix-traces.md
  runs/
    lottery-177s/           headless 14 NPC ~177s
    mix-222-300s/           headless mix 2-2-2 300s
    qa-live-300s/           3 sims live 300s + índice de PNGs
```

## Como reproduzir

```
npm run debug:ia
npm run debug:ia -- --seconds 300 --mix 2:2:2
```

Código dos perfis: `src/domain/ai/DriverProfile.ts`, `DriverRoster.ts`.
Código da linha: `src/data/tracks/thunder-basin-2.track.ts`, `public/assets/lines/`.

## Convenções neste pacote

- Logs de piloto foram copiados de `.log` para `.txt` (gitignore do repo bloqueia `*.log`).
- Tempos em segundos de simulação, não wall-clock.
- Intent `RECOVER` nos logs **deste pack** = baseline pré-V2 (o cérebro pedia recuperação mesmo em TARMAC a 60 u/s). Depois de `292c0ab`, recover é modo de controlo, não táctica. Lê `V2.md`.
- `vehiclePhysics` / `localSteering` **não** mudam o carro; só o quanto o piloto usa o limite.
