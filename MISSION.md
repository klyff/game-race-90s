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

**T-018: the splash screen with car select on it**, then T-032 (per-track rival), then T-016/T-017
(weapons). `TitleMusic` already exists (172 BPM E-minor punk/metal loop, 11 tests) but has **never
been heard** — the splash is what plays it.

T-018 spec, all from the user: background is `src/assets/spash.jpeg` → **move to
`public/assets/ui/splash.jpeg`** and load in `BootScene` (a Vite `import` would inline 1 MB).
**The logo and credit are already painted into the top of the art — draw no title.** The dark
explosion void mid-frame is the only high-contrast area for text. Prompt "PRESS SPACE TO ROCK'N THE
90s" blinking slowly, ~1.0–1.4 s, **hard on/off cut, never an alpha tween**, from a pure `BlinkClock`.
LEFT/RIGHT pick the player's car; SPACE starts. Scale the art to COVER and place text against the
IMAGE's rect, not the viewport.

**DONE this iteration — five cars race, and the HUD is real.** `RaceField` is wired into `RaceScene`
(one `VehicleView` per car, player starts at the back), `HudScene` is its own scene at zoom 1
(position, lap, timer, ammo, integrity bar, animated countdown, live standings), `assignNpcCars`
gives every NPC a different car, and the explosion is wired end to end. **Damage is now asymmetric:
the car that takes the hit takes full damage, the one that deals it takes 40%.** Wall damage now
reads TOTAL SPEED LOST in the step, not just the normal component — that was T-033's fix.
**599 tests across 25 files, typecheck and build clean. First commit landed: `fde7654`.**

**PUSH IS BLOCKED:** the user asked for commit + push each iteration, but `git remote -v` is EMPTY.
Ask them to run `git remote add origin <url> && git push -u origin main`, or
`gh repo create <repo> --private --source=. --remote=origin --push`.

**An agent CAN now see the screen — use `tools/verify/` and READ ITS README.** Do not re-derive this:
system Chrome fails (`SingletonSocket` bind), Playwright's cached headless shell works, and
`--allow-file-access-from-files` is mandatory or the game silently never boots on `file://`.

**Still unseen/unheard by anyone:** `TitleMusic`, and the polished `ExplosionEffect`.
T-029 (tyre marks halved) still wants the user's eye.

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
