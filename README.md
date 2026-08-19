# Concurrence Racing

Arcade isométrico no browser (Phaser + Vite). Sem backend: a “chamada” é um `GET` na página, com query string.

**Produção:** [https://game-race-90s.vercel.app](https://game-race-90s.vercel.app)

## Execução local

Requisito: **Node 24.x** (`package.json` → `engines.node`).

```bash
npm ci          # ou npm install
npm run dev     # servidor de desenvolvimento
```

Abre **http://localhost:5173**. O Vite não abre o browser sozinho (`open: false`).

Outros comandos úteis:

```bash
npm run build       # typecheck + build estático em dist/
npm run preview     # serve dist/ em http://localhost:4173
npm test            # vitest, sem browser
npm run typecheck
npm run debug:ia    # simulação headless (sem porta, sem Phaser)
```

### Porta

| Comando | Porta esperada | Onde muda |
| --- | --- | --- |
| `npm run dev` | **5173** | `vite.config.ts` → `server.port` |
| `npm run preview` | **4173** | `vite.config.ts` → `preview.port` (ainda não definido; default do Vite) |

Override pontual, sem editar o ficheiro:

```bash
npm run dev -- --port 3000
npm run preview -- --port 4174
```

Se 5173 estiver ocupada, o Vite tenta a seguinte (5174, …), a menos que passes `--strictPort`.

## Deploy na Vercel

O jogo é um **static site** Vite. Não há API serverless nem env vars obrigatórias.

1. O repo GitHub `klyff/game-race-90s` está ligado ao projecto Vercel **game-race-90s** (team `klyffs-projects`, Node **24.x**).
2. **Push em `main`** → deploy de **produção**.
3. **Push noutra branch / PR** → deploy de **preview** (URL única).
4. Build remoto, definido em `vercel.json`:
   - install: `npm ci --no-audit --no-fund`
   - build: `npx tsc --noEmit && npx vite build`
   - output: `dist/`
5. A Vercel publica `dist/` em HTTPS. Query params da tabela abaixo funcionam iguais em local e em produção.

URLs estáveis:

| Papel | URL |
| --- | --- |
| Produção | https://game-race-90s.vercel.app |
| Alias do projecto | https://game-race-90s-klyffs-projects.vercel.app |
| Branch `main` | https://game-race-90s-git-main-klyffs-projects.vercel.app |
| Dashboard | https://vercel.com/klyffs-projects/game-race-90s |

CLI (opcional; o fluxo normal é git push):

```bash
npx vercel          # preview
npx vercel --prod   # produção (equivalente a push em main)
```

Não há catch-all SPA extra: o `index.html` na raiz de `dist/` basta. Assets em `public/` saem em `/assets/…`.

## Parâmetros da chamada (browser)

Tudo é **GET** na raiz (`/` local, `/` na Vercel). Tipo **Query**. Não há path params nem body.

Valores “ligado” aceites em flags booleanas: ausente com chave (`?tour`), `1`, `true`, `all` (case-insensitive). Outro valor (ex. `0`, `no`) ignora a flag.

Prioridade no boot: **`debugia` > `watch` > splash**. `debugia` e `watch` também ligam o tour nessa sessão (mapas desbloqueados; nada vai para o save).

| Método | Tipo | Parâmetro e valores | Resultado esperado |
| --- | --- | --- | --- |
| GET | Query | `tour` = `1` \| `true` \| `all` \| *(vazio)* | Sessão tour: todos os planetas/pistas abertos. Começa no splash. Equivale a escrever TOUR no splash. |
| GET | Query | `allmaps` = iguais a `tour` | Alias de `tour`. |
| GET | Query | `watch` = `1` \| `true` \| `all` \| *(vazio)* | Salta o splash. Corre 10 NPCs médios na pista II (default `thunder-basin-2`). Tour ligado. |
| GET | Query | `debugia` = `1` \| `true` \| `all` \| *(vazio)* | Salta o splash. Grelha debug-IA (default **15** NPCs, câmara longe). Tour ligado. Tem prioridade sobre `watch`. |
| GET | Query | `track` = id da pista (ver lista abaixo) | Com `watch` ou `debugia`: escolhe o circuito. Id desconhecido → ignora e cai no default. Sem esses modos, não faz nada. |
| GET | Query | `world` = `1`…`10` | Com `pista` (ou alias): resolve o id de campanha. Precisa dos dois. Alias: `planet`, `mundo`. |
| GET | Query | `pista` = `1` \| `2` \| `3` | Circuito dentro do mundo. Alias: `circuit`, `tracknum`. Ex.: `world=3&pista=2` → `bogmire-deep-2`. Ganha sobre `track` se ambos existirem. |
| GET | Query | `seed` = inteiro `> 0` | Com `debugia`: semente da lotaria / mix. Sem valor válido → `Date.now()`. |
| GET | Query | `mix` = `experts:mediums:bobos` (ex. `2:2:2` ou `2,2,2`) | Com `debugia`: grelha por banda de skill em vez da lotaria de 15. Soma dos três ≥ 1; números ≥ 0. Inválido → lotaria default. |
| GET | Query | `npcs` = inteiro `> 0` | Com `debugia`: quantos NPCs. Alias: `npc`. Default **15**. |

Exemplos:

```
http://localhost:5173/
http://localhost:5173/?tour=1
http://localhost:5173/?watch=1
http://localhost:5173/?watch=1&track=thunder-basin-2
http://localhost:5173/?debugia=1
http://localhost:5173/?debugia=1&track=bogmire-deep-2&seed=1
http://localhost:5173/?debugia=1&mix=2:2:2&npcs=6
http://localhost:5173/?debugia=1&world=3&pista=2
https://game-race-90s.vercel.app/?debugia=1&mix=2:2:2
```

### Ids de pista (`track`)

Formato `{planeta}-{n}`, excepto mundo 1 pista 1 = `thunder-basin`.

| Mundo (`world`) | Planeta | `pista=1` | `pista=2` | `pista=3` |
| --- | --- | --- | --- | --- |
| 1 | Thunder Basin | `thunder-basin` | `thunder-basin-2` | `thunder-basin-3` |
| 2 | Chrome Verge | `chrome-verge-1` | `chrome-verge-2` | `chrome-verge-3` |
| 3 | Bogmire Deep | `bogmire-deep-1` | `bogmire-deep-2` | `bogmire-deep-3` |
| 4 | Cryo Hollow | `cryo-hollow-1` | `cryo-hollow-2` | `cryo-hollow-3` |
| 5 | Ferro Rust | `ferro-rust-1` | `ferro-rust-2` | `ferro-rust-3` |
| 6 | Vulkanis | `vulkanis-1` | `vulkanis-2` | `vulkanis-3` |
| 7 | Neon Kasbah | `neon-kasbah-1` | `neon-kasbah-2` | `neon-kasbah-3` |
| 8 | Ash Reach | `ash-reach-1` | `ash-reach-2` | `ash-reach-3` |
| 9 | Voidport | `voidport-1` | `voidport-2` | `voidport-3` |
| 10 | Verdant Fault | `verdant-fault-1` | `verdant-fault-2` | `verdant-fault-3` |

## CLI headless (`npm run debug:ia`)

Não é HTTP. Flags da mesma família, para logs em `.tmp/reportIA/` (ou pasta `--out`).

```bash
npm run debug:ia
npm run debug:ia -- --seconds 300 --mix 2:2:2
npm run debug:ia -- --track thunder-basin-2 --seed 1 --world 1 --pista 2
```

| Flag | Valores | Resultado |
| --- | --- | --- |
| `--seconds` | número ≥ 3 (default `180`) | Duração da simulação. |
| `--seed` | inteiro ≥ 1 (default `1`) | Semente da grelha. |
| `--track` | id da tabela acima (default `thunder-basin-2`) | Circuito. |
| `--world` + `--pista` | `1`…`10` e `1`…`3` | Sobrepõem `--track` se os dois existirem. |
| `--mix` | `2:2:2` | Grelha por skill; sem mix = lotaria. |
| `--laps` | inteiro ≥ 1 | Voltas; senão estica para caber nos segundos. |
| `--out` | path | Pasta de logs. |

Código das query strings: `src/adapters/progress/{TourMode,WatchMode,DebugIaMode,CampaignSearch}.ts`, lidas em `src/scenes/BootScene.ts`.
