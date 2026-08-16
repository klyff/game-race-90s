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

**1. T-046 WEAPONS — the biggest lever on the owner's standing "muito fácil" complaint, and it
unblocks T-037's `ARSENAL`, which is defined and PINNED INERT by a test today.** Owner's spec, keys
`1`/`2`/`3`, inventory refills on crossing the finish line. **Missiles**: straight line along the car's
heading at launch, 1.4x car max velocity, 50% of a car's energy per hit, so a car under half dies and
BOTH missile and car explode; **3 on the grid for every car, refilling to that car's own
`ammoCapacity` at the line** (owner confirmed 2026-08-16 — battle-trak reloads to 15, air-blade to 4,
and Arsenal makes that faster / raises the ceiling). NPCs aim with an invisible cone ~300 ft in scale
and **every NPC prioritises a Player in range**. **Oil**: 1.9x car footprint, 2 per car, lifetime =
the time of a 1.6-lap run ON THAT TRACK (derived, not a constant), a car crossing it spins out and
loses >=4 s of control — use `yawSpin`, which decision 19 reserved for exactly this. **Landmines**:
half a car, instant destruction. Rules PURE in `src/domain/`, hazards placed by ARC LENGTH, resolved
INSIDE `RaceField`'s locked five-stage order.

**2. T-043 SEARCH the racing line, then T-038.** Owner confirmed 2026-08-16: an **offline
`npm run gen:lines`** writing `public/assets/lines/<track>.json`, same philosophy as `gen:sprites` /
`gen:track`, printing a report to read. >=5 candidate lines per track (centreline, outside-apex,
late apex, early apex, drift entry) driven through the REAL pipeline, fastest with zero wall contacts
wins. `driveLap` in `tests/tuning/LapTimes.test.ts` already has the evaluator's shape. T-047's
`parTime` falls out of the same run. Then T-038: extract `PaceDriver`'s maths into shared
`PursuitSteering`/`CornerSpeed` FIRST so decision 27 cannot be re-broken in a copy, feed the driver
the searched line, and hand it a rival view built from LIVE stage-1 distances, never stage-5
standings. **Gate: the owner races and does NOT win first try.**

**3. T-044** three more cars — AirBoat, SnowCar, Delorean (unlockable, occasional rival, needs a
stated weakness or it is strictly dominant). One agent per `*.car.ts`, judged in `.preview/roster.png`,
never one car alone. **Re-read T-031: `assignNpcCars` assumes the NPC field is "the rest of the
roster", which changes at 8 cars on a 5-car grid.**

**4.** T-041 results screen, then T-042 (scoring SETTLED: one 0-100 score, 80 means 80%, position pays
1st 10 / 2nd 6 / 3rd 4 / 4th 2 / 5th 1 for 70 of it, mean `parTime/playerTime` for the other 30 —
**do not re-open the design, only the build was deferred**), then T-035's `CookieStore`, then T-036.

**T-018, T-037 and T-045 are DONE.** Splash + car select ships; five felt perks, each proved by an
outcome test; the speedometer is Top Gear's shape (tight circular knee then a flat run) and has been
READ in a screenshot. **Use `tools/verify/drive.mjs` to see the road — `screenshot.mjs` holds one key
and cannot get past the splash.**

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
