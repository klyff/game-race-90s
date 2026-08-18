# MISSION

<!-- mission-budget: 3700 -->

<!-- Inject every turn. Keep <3000 chars. `##` headings load-bearing for mission.py.
     Ledger: WORKLOG.md. Graph: graphify query, not GRAPH_REPORT dump. -->

## Objective

Isometric arcade racer for web, Rock N Roll Racing spirit. Car boxed by walls, reverse, mark tarmac, sound like engine, camera breathe with track.

## Next step

Read `docs/CLAUDE_HANDOFF.md` first. Wallet, coast-to-stop, WINNER IS, per-planet palettes + stand-in ground in. Claude team: Prompt A/B art → `public/assets/ui/planets/<slug>.jpeg` + `public/assets/ground/<slug>.png`, then Prompt C props. Thunder Basin only real select art today.

Owner close: race Thunder Basin, coast after flag, confirm WINNER IS + 2nd/3rd purse. Open other planet, check ground colour.

## Constraints

- Agent cannot `npm run dev` (`listen EPERM`). Owner play: `npm run dev` → http://localhost:5173.
- See screen: `npm run build`, then `tools/verify/screenshot.mjs` over `file://`. Read `tools/verify/README.md` first — system Chrome fails; two flags load-bearing.
- Verify render by READING THE IMAGE, never object state.
- Subagent reports = claims. Run suite; check physics; verify numbers.
- `Date.now()`, `new Date()`, `Math.random()` forbidden — pass time + seeds.
- Assets under `public/`, load by key, never `import` — Vite inlines.
- Commit AND push end of every iteration.

## Discarded

- `npm run dev` from agent — `EPERM`.
- `localhost` from headless browser — 502. Use `file://` on build.
- Status numbers as truth — stale. Run suite.
- `setScrollFactor(0)` pin HUD — dies under camera zoom. Separate scene zoom 1 (`HudScene`); `TuningOverlay` counter-scale if inside `RaceScene`.

## Decisions

- Locked decisions in WORKLOG.md **Locked technical decisions**. Bugs paid once: 23 `projectNear`, 25 invisible HUD, 27 pace-driver maths. Read before projection, HUD, AI driver.
- Subagents: one narrow single-file task, Haiku default; orchestrator writes agent rows.

## Files

- Graph first: `graphify query "…" --budget 2000`. Then `graphify-out/wiki/index.md`. `GRAPH_REPORT.md` only broad review.
- After code change: `graphify update .` (AST, 0 API). Agent lose graph history OK — re-query, do not stop.
- `SUMMARY.md` — 10-line north star (planets → cities, web, multiplayer).
- `JOURNAL.md` — 6-line daily. Skill `.cursor/skills/game-jornal/`.
- `WORKLOG.md` — ledger. Last cleanup block first. Rest in slices.
- `docs/art-briefs/planets.md` — Prompt A/B/C + ten planets.
- `tools/verify/README.md` — how to see screen.
