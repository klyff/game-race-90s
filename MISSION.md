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

**1. T-018 `SplashScene` — the owner has now twice expected to see it and it DOES NOT EXIST.** Art is
ready at `public/assets/ui/splash.jpeg`; `src/adapters/audio/TitleMusic.ts` is ready (172 BPM E-minor
punk/metal, 21 tests) and **has never been heard**. Needs a user gesture before it sounds, like
`RaceAudio.resume()`. **Draw NO title — the logo and credit are painted into the art.** Text goes in
the dark explosion void mid-frame; scale the art to COVER and position against the IMAGE's rect, not
the viewport. Prompt "PRESS SPACE TO ROCK'N THE 90s" blinking ~1.0–1.4 s with a **hard on/off cut,
never an alpha tween**, from a pure `BlinkClock`. LEFT/RIGHT pick the car, SPACE starts.

**2. T-037 + T-038 — the difficulty. Owner, 2026-08-15: "hoje está muito fácil para o jogador."**
Ship them together; one alone will not move it.
- **T-037** every car gets ONE FELT advantage, not a stat delta: marauder Bulldozer (wins contact),
  dirt-devil Off-road Ace (small off-road penalty), havac Anvil (immovable, shrugs off damage),
  air-blade Slipstream (draft bonus), battle-trak Arsenal. Author as DATA in
  `tools/spritegen/cars/*.car.ts`; rules pure in `src/domain/`; **no perk writes velocity directly.**
- **T-038** the NPCs must RACE, not commute. Measured cause: `PaceDriver` follows the CENTRELINE
  inside the grip limit and never drifts, lapping in 33 s, so any drifting human beats it. Give it a
  curvature-offset racing line (outside-apex-outside), overtaking and defending, permission to use its
  grip, and bounded rubber-banding. **Gate: the owner races and does NOT win first try.**

**3.** Then T-035's `CookieStore` + slot screen, then T-036 (`theme` on `TrackDefinition`, or all ten
planets render in Thunder Basin's colours).

**State: 640 tests / 26 files, typecheck and build clean. Nine commits, all PUSHED to
`https://github.com/klyff/game-race-90s`.** Read WORKLOG.md's last cleanup block first — it is the
handoff and it lists the traps that have each already cost this project a task.

**Unseen/unheard by anyone:** `TitleMusic`, and the polished `ExplosionEffect` (which is still
smooth-vector art in a pixel-art game; `X` in-game wrecks the player's car so it can be judged).

## Constraints

- **An agent session cannot run `npm run dev`** (`listen EPERM`, any port, sandbox on or off). When the
  user wants to play, ask them to run
  `cd /Users/klyffharlley/scm/concurrence-gamming && npm run dev` and open http://localhost:5173.
- **A headless browser cannot reach `localhost`** — the proxy answers 502. To see the screen yourself
  use `tools/verify/screenshot.mjs` over `file://` and **read its README first**; system Chrome cannot
  be used (`SingletonSocket` bind fails) and `--allow-file-access-from-files` is mandatory.
- **Verify rendering by READING THE IMAGE, never object state.** A HUD sat off-viewport for two tasks
  while reporting `visible: true` with correct text (WORKLOG decision 25).
- **Trust the repo over any status text**, here or in WORKLOG.md. Run `npm test` and `npm run typecheck`.
- **Commit AND push at the end of every iteration** (owner, 2026-08-15). Remote is
  `https://github.com/klyff/game-race-90s`; local and `origin/main` are in sync. No longer blocked.

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
