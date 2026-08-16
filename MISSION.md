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

**T-018 is DONE — the game opens on the splash with car select** (verified by reading five
screenshots). **The ONE thing still unclosed: nobody has ever heard `TitleMusic` in the game.** An
agent cannot hear; ask the owner to run `npm run dev`.

**1. T-037 + T-038 — the difficulty. Owner: "hoje está muito fácil para o jogador." Ship together.**
- **T-037**: one FELT advantage per car, not a stat delta — marauder wins contact, dirt-devil ignores
  dirt, havac is immovable, air-blade drafts. Perk ID as DATA in `tools/spritegen/cars/*.car.ts` ->
  `renderCar.ts`'s literal -> `cars.json` -> `parseCarSheet` -> `RacerEntry`/`RacerRuntime`; the
  tunables stay in code. Apply as DERIVED values at `RaceField`'s existing call sites (effective mass
  for contact, adjusted surface for dirt, raised `enginePower` for the draft). **No perk writes
  velocity.** **battle-trak's Arsenal cannot be felt — T-016 weapons do not exist**; ship it inert and
  give it a braking-grip perk for now.
- **T-038**: NPCs must RACE, not commute. Measured cause — `PaceDriver` follows the CENTRELINE inside
  the grip limit and never drifts (33 s lap), so any drifting human beats it. Extract its proven maths
  into shared `PursuitSteering`/`CornerSpeed` FIRST so decision 27 cannot be re-broken in a copy, then
  compose an `AIDriver`: curvature-offset racing line, overtaking, defending, bounded rubber-banding.
  `commandFor` must hand it a distilled rival view built from LIVE stage-1 distances, never the
  stage-5 standings, which are one step stale. `LapTimes.test.ts` drives ONE car with no `RaceField`
  and cannot show an overtake — a new multi-car harness is required.
  **Gate: the owner races and does NOT win first try.**

**2.** T-041 (results screen: victory, total time, best-lap record) then T-042 (3 tracks per world +
an 80-point gate) — **new owner scope, 2026-08-16.** T-042's SCORING IS SETTLED and confirmed by the
owner: ONE 0–100 world score where 80 means 80%, position paying 1st 10 / 2nd 6 / 3rd 4 / 4th 2 / 5th 1
for 70 of it and mean `parTime/playerTime` for the other 30. **Do not re-open the design; the owner
deferred only the BUILD ("isso é para o próximo plano").**

**3.** Then T-035's `CookieStore` + slot screen, then T-036 (`theme` on `TrackDefinition`, or all ten
planets render in Thunder Basin's colours).

**T-037 IS DONE** — five felt perks, each proved by an outcome test (dirt covers 1.73x the distance,
Anvil halves its own contact ΔV, a full draft lifts terminal speed 95.0 -> 108.3). **A speedometer in
Top Gear's style is mid-flight** (`SpeedoGauge` + `SevenSegment`); it has never been seen on screen —
build and read the bottom-right corner, holding `ArrowUp` or the dial reads 0.

**854 tests / 32 files, typecheck and build clean. Pushed to
`https://github.com/klyff/game-race-90s`.** **Read WORKLOG.md's LAST cleanup block first — it is the
handoff.** Full task detail lives there, not here.

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
