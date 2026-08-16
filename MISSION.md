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

**Wire `RaceField` into `RaceScene` for five cars**, then **T-015 `HudScene`** (own scene/layer:
position, lap, timer, ammo, countdown, standings, animated). T-013's domain work is DONE, including
`src/domain/race/RaceField.ts` — the whole field plus the locked five-stage step order, 18 tests.
`RaceScene` still draws exactly one car. **570 tests across 23 files, typecheck clean.**

**New scope taken from the user on 2026-08-15, in the plan and WORKLOG, not started:**
- **T-018 is now the splash screen WITH car select on it.** Art `src/assets/spash.jpeg` → move to
  `public/assets/ui/splash.jpeg`. The logo and credit are ALREADY painted into the top of the image
  (draw no title); the dark explosion void mid-frame is the only high-contrast area for text. Prompt
  "PRESS SPACE TO ROCK'N THE 90s" blinking slowly, ~1.0–1.4 s, **hard on/off cut, never an alpha
  tween**, from a pure `BlinkClock`. LEFT/RIGHT pick the player's car; SPACE starts.
- **T-031** NPCs always get cars the player did not pick, no duplicates (pure `assignNpcCars`).
- **T-032** Every track has one rival NPC with a small **handling** edge (grip, drift resistance,
  corner confidence — never engine power), as derived `VehicleStats`, bounded to ~3–5% of lap time.
- **T-033 (measured defect)** No car can explode today: wall `impactSpeed` is only the NORMAL
  component, so real driving crosses the 12 u/s threshold once or twice a lap and integrity falls
  1.00 → 0.90 at worst. Re-measure with `tools/measure-impacts.ts` after any change.

**Signed off by the user at the wheel on 2026-08-15:** the audio (T-023) and T-012's feel gate — the car
is controllable, it drifts, the five cars feel different. T-029 (tyre marks halved) still wants a glance.

**T-030 explosion pieces exist but are wired to NOTHING and have never been seen or heard:**
`src/adapters/audio/ExplosionVoice.ts`, `src/adapters/render/ExplosionEffect.ts`.

## Constraints

- **An agent session cannot run `npm run dev`** (`listen EPERM`, any port, sandbox on or off). When the
  user wants to play, ask them to run
  `cd /Users/klyffharlley/scm/concurrence-gamming && npm run dev` and open http://localhost:5173.
- **A headless browser cannot reach `localhost`** — the proxy answers 502. To see the screen yourself:
  `npm run build`, then load over `file://`.
- **Verify rendering by READING THE IMAGE, never object state.** A HUD sat off-viewport for two tasks
  while reporting `visible: true` with correct text (WORKLOG decision 25).
- **Trust the repo over any status text**, here or in WORKLOG.md. Run `npm test` and `npm run typecheck`.
- Git is on `main` with **zero commits**; every file untracked. Do not commit unless asked.

## Discarded

<!-- Proven wrong already. Do not propose these again. -->

- **`npm run dev` from an agent session** — `EPERM` everywhere. It worked once early, then stopped.
- **Verifying through `http://localhost:5173` headless** — 502. Use `file://` on the build output.
- **Reading status numbers here as truth** — they have gone stale before. Run the suite.
- **`setScrollFactor(0)` to pin a HUD** — does not survive camera zoom. Track `camera.worldView` and
  counter-scale by `1 / zoom`, as `TuningOverlay` does.

## Decisions

- Locked decisions live in WORKLOG.md under **Locked technical decisions** — several encode bugs already
  paid for once (23 `projectNear`, 25 the invisible HUD, 27 the pace-driver maths). Read them before
  touching projection maths, any HUD, or any AI driver.
- Subagents: one narrow single-file task each, default Haiku 4.5; the orchestrator writes the agent rows.
  **Check their physics and their assertions** — this round they shipped a dimensionally wrong speed law
  and tests that passed while nothing worked.

## Files

- Plan: `~/.claude/plans/fa-a-um-plano-para-compressed-beaver.md` — architecture, maths, agent briefs
- `npm run gen:preview -- --roster` / `npm run gen:track` — PNGs into `.preview/`; **read the image**
- `WORKLOG.md` — verbose ledger, ~19k tokens. Read it in slices.
