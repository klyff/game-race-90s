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

**1. T-018 `SplashScene` — DOES NOT EXIST, and the owner has twice expected to see it.**
Art ready: `public/assets/ui/splash.jpeg`. Music ready and **never heard**:
`src/adapters/audio/TitleMusic.ts` (needs a user gesture, like `RaceAudio.resume()`).
**Draw NO title — logo and credit are painted into the art.** Text in the dark void mid-frame; scale
art to COVER, position against the IMAGE's rect not the viewport. "PRESS SPACE TO ROCK'N THE 90s"
blinking ~1.2 s with a **hard on/off cut, never an alpha tween**, from a pure `BlinkClock`.
LEFT/RIGHT pick the car, SPACE starts.

**2. T-037 + T-038 — the difficulty. Owner: "hoje está muito fácil para o jogador." Ship together.**
- **T-037**: one FELT advantage per car, not a stat delta — marauder wins contact, dirt-devil ignores
  dirt, havac is immovable, air-blade drafts, battle-trak out-guns. Author as DATA in
  `tools/spritegen/cars/*.car.ts`; rules pure; **no perk writes velocity directly.**
- **T-038**: NPCs must RACE, not commute. Measured cause — `PaceDriver` follows the CENTRELINE inside
  the grip limit and never drifts (33 s lap), so any drifting human beats it. Needs a
  curvature-offset racing line, overtaking, defending, bounded rubber-banding.
  **Gate: the owner races and does NOT win first try.**

**3.** Then T-035's `CookieStore` + slot screen, then T-036 (`theme` on `TrackDefinition`, or all ten
planets render in Thunder Basin's colours).

**640 tests / 26 files, typecheck and build clean. All pushed to
`https://github.com/klyff/game-race-90s`.** **Read WORKLOG.md's LAST cleanup block first — it is the
handoff.** Full task detail lives there, not here.

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

- **`npm run dev` from an agent session** — `EPERM` everywhere.
- **`localhost` from a headless browser** — 502. Use `file://` on the build output.
- **Reading status numbers as truth** — they go stale. Run the suite.
- **`setScrollFactor(0)` to pin a HUD** — does not survive camera zoom. A separate scene at zoom 1 is
  the clean fix (that is what `HudScene` does); `TuningOverlay`'s counter-scaling is the workaround
  for living inside `RaceScene`.

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
