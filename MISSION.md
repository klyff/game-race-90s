# MISSION

<!-- mission-budget: 3700 -->

<!-- Injected into EVERY turn by ~/.claude/hooks/mission.py, so it survives compaction, /clear and
     model switches. It is paid for on every request: keep it under 3000 characters.
     The `##` headings are load-bearing - mission.py looks for these exact names.
     Verbose ledger stays in WORKLOG.md; this is only the resume state. -->

## Objective

Isometric arcade racer for the web, inspired by Rock N Roll Racing. The car is boxed in by walls,
reverses, marks the tarmac, sounds like an engine, and the camera breathes with the track.

## Next step

**Read `docs/CLAUDE_HANDOFF.md` first.** Wallet, coast-to-stop, WINNER IS ceremony, and
per-planet palettes + stand-in ground tiles are in. Claude team: drop real Prompt A/B
art into `public/assets/ui/planets/<slug>.jpeg` and `public/assets/ground/<slug>.png`,
then place Prompt C props. Only Thunder Basin has a real select illustration today.

**Owner close:** race Thunder Basin, watch cars coast after the flag, confirm
WINNER IS + 2nd/3rd purse. Then open another planet and check the ground colour changed.

## Constraints

- **An agent session cannot run `npm run dev`** (`listen EPERM`). When the owner wants to play, ask
  them to run `npm run dev` → http://localhost:5173.
- **To see the screen yourself:** `npm run build`, then `tools/verify/screenshot.mjs` over `file://`.
  **Read `tools/verify/README.md` first** — system Chrome fails and two flags are load-bearing.
- **Verify rendering by READING THE IMAGE, never object state.** A HUD sat off-viewport for two tasks
  reporting `visible: true` with correct text.
- **Subagent reports are claims.** Run the suite; check physics dimensionally; verify numbers yourself.
- **`Date.now()`, `new Date()`, `Math.random()` are forbidden** — pass time and seeds in.
- **Assets live under `public/`, loaded by key, never `import`ed** — Vite inlines them.
- **Commit AND push at the end of every iteration.** Remote is set and in sync.

## Discarded

<!-- Proven wrong already. Do not propose these again. -->

- **`npm run dev` from an agent session** — `EPERM` everywhere.
- **`localhost` from a headless browser** — 502. Use `file://` on the build output.
- **Reading status numbers as truth** — they go stale. Run the suite.
- **`setScrollFactor(0)` to pin a HUD** — does not survive camera zoom. A separate scene at zoom 1 is
  the clean fix (that is what `HudScene` does); `TuningOverlay`'s counter-scaling is the workaround
  for living inside `RaceScene`.

## Decisions

- Locked decisions are in WORKLOG.md under **Locked technical decisions** — several encode bugs already
  paid for once (23 `projectNear`, 25 the invisible HUD, 27 the pace-driver maths). Read them before
  touching projection maths, any HUD, or any AI driver.
- Subagents: one narrow single-file task each, Haiku by default; the orchestrator writes the agent rows.

## Files

- Plan: `~/.claude/plans/fa-a-um-plano-para-compressed-beaver.md`
- `WORKLOG.md` — the ledger. **Read its last cleanup block first.** Read the rest in slices.
- `docs/art-briefs/planets.md` — the three image-AI prompts and the ten planets.
- `tools/verify/README.md` — how to see the screen. `tools/measure-impacts.ts` — damage measurement.
