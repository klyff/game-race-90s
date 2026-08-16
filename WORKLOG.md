# WORKLOG — concurrence-gamming

> Mandatory extension of `~/.claude/CLAUDE.md`. Read this file **before anything else** at session
> start and immediately after every compaction, then resume from it.

| Field | Value |
| --- | --- |
| Repository | `/Users/klyffharlley/scm/concurrence-gamming` |
| Branch | `main`, **first commit landed** (`fde7654`). No remote is configured, so nothing is pushed — see **Blocked work**. |
| Plan file | `/Users/klyffharlley/.claude/plans/fa-a-um-plano-para-compressed-beaver.md` |
| Product | Isometric arcade racer inspired by Rock N Roll Racing (web) |
| Created | 2026-08-15 16:24 PDT |
| Last updated | 2026-08-15 22:35 PDT |
| Compactions so far | 2 |
| Git | on `main` with the first commit in. **The user asked for commit + push on every iteration; `git remote` is empty, so push is blocked on a remote URL.** |

## Current state in one line

**It is a race now.** Five cars line up on Thunder Basin, the player starts at the back, the NPCs
drive the same `InputCommand` path the human does, contact between cars is resolved, damage
accumulates, wrecks explode and respawn, and a real animated HUD reports position, lap, time, ammo,
integrity and live standings. **599 tests across 25 files, typecheck clean, build clean** (any smaller
number elsewhere in this file is stale — run the suite). **First commit is in: `fde7654`.**
**Verified by reading screenshots, not object state:** `/tmp/hud2.png` (grid + countdown + HUD),
`/tmp/hud_racing.png` (mid-race, player 2nd, standings live), `/tmp/boom.png` (explosion + empty
integrity bar). Screenshot tooling now lives in `tools/verify/` — **read its README before trying to
see the screen yourself, it records which browser works and which two flags are load-bearing.**
**Next: T-018, the splash screen with car select** — `TitleMusic` exists for it but has never been
heard. Then T-032 (the per-track rival) and T-016/T-017 (weapons).

---

## How to resume this work (orchestrator instructions)

If you are picking this up cold — after a compaction, a context cleanup, or in a new session — do
exactly this, in order:

1. Read the plan file listed above. It holds the architecture, the projection maths, the agent
   briefs and the verification steps.
2. Read this whole file, especially **Locked technical decisions** — several encode bugs already paid
   for once.
3. Run `npm test` and `npm run typecheck` to learn the true state of the repo. **Trust the repo over
   any status written here.** Expected right now: 599 tests passing across 25 files, typecheck clean, build clean.
4. Pick the lowest-numbered task that is not `done`, respecting `Blocked by`.
5. Spawn subagents per the briefs in **Agent briefs**. Default model **Claude Haiku 4.5**; one
   narrow, single-file task per agent; the orchestrator writes the agent rows (see decision 8).
6. Never delete a task. A task may change hands, but it must never be forgotten.

Useful commands:

```bash
npm test                          # 599 tests, all headless, no browser
npm run typecheck                 # tsc --noEmit, must stay clean
npm run build                     # tsc --noEmit && vite build — works, ~1.5 MB bundle
npm run gen:sprites               # regenerate public/assets/cars/*.png + cars.json
npm run gen:preview -- --roster   # .preview/roster.png — all 5 cars side by side, READ THIS IMAGE
npm run gen:preview -- havac      # one car, 32 angles, magnified
npm run gen:track                 # .preview/track-*.png + geometry report, READ THIS IMAGE
npm run dev                       # ASK THE USER TO RUN THIS — an agent session cannot, see below
```

**Two separate environment limits, do not confuse them.**

1. **An agent session cannot start the dev server at all.** `npm run dev` fails with
   `listen EPERM: operation not permitted` on any port and with the sandbox both on and off — the same
   restriction that killed `tsx` in decision 1. It succeeded once early in the session and then stopped,
   so do not assume it will work. **When the user wants to play, ask them to run
   `cd /Users/klyffharlley/scm/concurrence-gamming && npm run dev` in their own terminal and open
   http://localhost:5173.** That works; they did it and accepted the result.
2. **A headless browser cannot reach `localhost` either**, because the enforced HTTP proxy answers 502.
   That is what decision 16 works around, and it is how an agent verifies the screen by itself: build and
   load over `file://`, never through the dev server.

---

## API reference for whoever picks this up

Exact signatures, so the next session does not have to re-read every file to start T-009. Trust the
files over this table if they disagree.

### Generated asset manifest — `public/assets/cars/cars.json`

```jsonc
{
  "frameWidth": 64, "frameHeight": 64, "frameCount": 32,
  "pixelsPerUnit": 8.143264,              // world units -> pixels; the road MUST use this
  "origin": { "x": 0.5, "y": 0.550512 },  // NOT 0.5/0.5 — pass to setOrigin or cars wobble
  "cars": [{
    "id": "marauder", "displayName": "Marauder",
    "archetype": "Balanced muscle — forgiving all-rounder",
    "image": "marauder.png",              // 32-frame horizontal strip, 2048x64
    "shadow": { "width": 43, "height": 21 },
    "stats": { "mass": 1000, "enginePower": 34, "brakeForce": 46, "maxSpeed": 78,
               "grip": 30, "steerRate": 2.5, "steerSpeedFalloff": 0.45,
               "armor": 0.4, "ammoCapacity": 5, "collisionRadius": 1.7 }
  }]
}
```

Load the strip in Phaser with `this.load.spritesheet(id, 'assets/cars/<id>.png', {frameWidth: 64, frameHeight: 64})`.

### `src/domain/constants.ts`

`SIMULATION_HZ = 60`, `SIMULATION_STEP_SECONDS`, `ISO_X = 1`, `ISO_Y = 0.5`, `ISO_Z = 0.85`,
`CAR_SPRITE_FRAMES = 32`, `CAR_SPRITE_FRAME_ARC`, `CAR_FRAME_WIDTH/HEIGHT = 64`,
`LATERAL_GRIP_STIFFNESS = 12`, `STEERING_AUTHORITY_SPEED = 8`, `TARMAC_ROLLING_RESISTANCE = 2`,
`OFFROAD_ROLLING_RESISTANCE = 16`, `OFFROAD_GRIP_MULTIPLIER = 0.55`,
`YAW_SPIN_DECAY_PER_SECOND = 0.12`, `OVERSPEED_ALLOWANCE = 1.2`, and the `as const` maps
`RACE_PHASE` (+ type `RacePhase`), `PALETTE_ROLE`, `SHADE_STEP`.

### `src/domain/math/Vec2.ts`

`interface Vec2 {x, y}` (readonly), `VEC2_ZERO`, `vec2`, `add`, `subtract`, `scale`, `dot`, `cross`,
`lengthSquared`, `length`, `distance`, `distanceSquared`, `normalize`, `perpendicularLeft`,
`fromAngle`, `angleOf`, `lerp`. All pure, all return fresh objects.

### `src/domain/track/TrackSpline.ts`

```ts
interface TrackFrame      { distance, position: Vec2, tangent: Vec2, normal: Vec2, curvature }
interface TrackProjection extends TrackFrame { lateralOffset }   // + is LEFT of travel

class TrackSpline {
  constructor(controlPoints: readonly Vec2[], samplesPerSegment?: number)
  readonly totalLength: number
  get sampleCount(): number
  wrap(distance): number                       // into [0, totalLength)
  signedDelta(from, to): number                // shortest signed arc distance
  frameAt(distance): TrackFrame
  positionAt(distance): Vec2
  curvatureAt(distance, span?): number         // + bends LEFT; see decision 10
  project(point): TrackProjection              // global search, for cold starts
  projectNear(point, hintDistance, searchWindow): TrackProjection   // use this in the hot path
}
```

### `src/domain/track/TrackDefinition.ts`

`interface TrackDefinition { id, displayName, controlPoints, halfWidth, shoulderWidth, laps,
checkpointCount, startLineDistance, gridLateralOffsets, gridRowSpacing }` plus
`trackFullHalfWidth(track)` = `halfWidth + shoulderWidth`.
Registry: `src/data/tracks/registry.ts` exports `TRACKS` and `findTrack(id)`.

### `src/domain/vehicle/`

```ts
// Vehicle.ts
interface VehicleState     { position: Vec2, velocity: Vec2, heading, yawSpin }
interface SurfaceConditions{ gripMultiplier, rollingResistance }
interface VehicleTelemetry { speed, forwardSpeed, lateralSpeed, slipAngle, isSliding, gripUsage }
interface VehicleStepResult{ state: VehicleState, telemetry: VehicleTelemetry }
function createVehicleState(position: Vec2, heading: number): VehicleState

// VehicleStats.ts
interface VehicleStats { mass, enginePower, brakeForce, maxSpeed, grip, steerRate,
                         steerSpeedFalloff, armor, ammoCapacity, collisionRadius }

// ArcadeCarPhysics.ts
const TARMAC: SurfaceConditions
const OFFROAD: SurfaceConditions
function stepVehicle(state, rawInput: InputCommand, stats, surface, dt): VehicleStepResult  // pure
function normalizeAngle(radians): number                 // into (-PI, PI]
function driftThreshold(stats, surface): number          // lateral speed at which it lets go
```

### `src/domain/input/InputCommand.ts`

`interface InputCommand { throttle, brake, steer, fire, dropMine }`, `IDLE_INPUT`,
`sanitizeInput(command)` (clamps throttle/brake to 0..1 and steer to -1..1). `stepVehicle` calls
`sanitizeInput` itself, so callers may pass raw values.

### `src/domain/race/OnTrackStep.ts` (T-012)

```ts
interface OnTrackStepResult { state, telemetry, distance, lateralOffset, touchedWall, impactSpeed }
function stepVehicleOnTrack(state, command, stats, track, spline,
                            hintDistance, searchWindow, stepSeconds): OnTrackStepResult   // pure
```
**The single authoritative on-track step**: project → pick surface → integrate → re-project → resolve
wall, two projections per step on purpose. `RaceScene` and the lap harness both call this, so the
harness cannot drift away from what the game actually runs. `distance` feeds the next step's hint;
`lateralOffset` is the WALL-CORRECTED value (see decision 24).

### `src/domain/vehicle/PaceDriver.ts` (T-012)

```ts
interface PaceDriverOptions { lookAheadBase, lookAheadScaleFactor, cornerLookAheadMinimum,
                              cornerLookAheadSpan, brakingZoneSamples, speedControlGain,
                              speedDeadband, fullLockBearing, cornerSafetyFactor }
const PACE_DRIVER_DEFAULTS: PaceDriverOptions
class PaceDriver {
  constructor(options?: PaceDriverOptions)
  command(state, projection, stats, spline): InputCommand
  targetSpeed(projection, stats, spline, speed): number   // the grip limit it is aiming at
}
function paceCommand(state, projection, stats, spline): InputCommand
```
Pure pursuit, no randomness, no time source. Emits `InputCommand` only (decision 12), so it drives
through `stepVehicle` exactly like the player. **T-014's `AIDriver` should start from this rather than
from scratch — read decision 27 first, it lists three mistakes already paid for here.**

### `src/adapters/render/TuningOverlay*.ts` (T-012)

```ts
// TuningOverlayFormat.ts — pure, no phaser, 39 tests
interface TuningOverlayReadout { carName, trackName, telemetry: VehicleTelemetry | null,
                                 lateralOffset, halfWidth, reversing, zoom, muted, spriteFrame }
function formatTuningOverlay(readout): readonly string[]        // exactly 6 lines

// TuningOverlay.ts — thin phaser wrapper
class TuningOverlay {
  constructor(scene, camera)      // needs the camera: see decision 25, scrollFactor is not enough
  get isVisible(): boolean
  update(readout): void           // no-op while hidden
  toggle(): void
  destroy(): void
}
```
Scene keys: `T` toggles the overlay, `C` cycles the car (restarts `RaceScene` with a `carId`), on top of
the existing `R` respawn and `M` mute.

### Track geometry, measured — Thunder Basin

lap **1505.4** units · 15 control points · road **40** units surface / **58** wall-to-wall ·
tightest corner radius **39.8** (the west hairpin) · longest straight **377.1** ·
self-clearance **82.3** (needs > 58) · `laps: 3`, `checkpointCount: 8`, `startLineDistance: 0`,
`gridLateralOffsets: [-9, 9]`, `gridRowSpacing: 11`.

At `pixelsPerUnit = 8.143264` the 40-unit road is ~326 px wide and the whole lap is ~12 260 px, so
the camera must follow the car — the track will not fit on screen.

### The render layer (T-009)

```ts
// src/adapters/render/IsoProjection.ts   — phaser-free, unit-tested
export const SCREEN_ROTATION_SIGN: number;        // -1, DERIVED from ISO_*; see decision 15
export class IsoProjection {
  constructor(pixelsPerUnit: number);             // pass manifest.pixelsPerUnit, never a literal
  toScreen(point: Vec2, height?: number): ScreenPoint;   // height in world units
  depthOf(point: Vec2): number;                   // = x + y, painter's-order key
}

// src/adapters/render/TrackRenderer.ts
export const ROAD_DEPTH = -1000;                  // everything else sorts by depthOf, never below ~-520
export class TrackRenderer {
  constructor(scene, track, spline, projection, options?: { sampleSpacing?: number });
  readonly bounds: { x, y, width, height };        // screen-space bbox, for camera bounds
  destroy(): void;
}
// Draws once into ONE Graphics: wall / shoulder / tarmac ribbons, kerbs, dashed centreline,
// chequered start line. 502 samples at ~3 units, ~4000 quads for Thunder Basin.

// src/adapters/render/VehicleView.ts
export class VehicleView {
  constructor(scene, manifest: CarSetManifest, sheet: CarSheetManifest, projection);
  sync(state: VehicleState): void;                 // position + frame + depth, per rendered frame
  readonly sprite: Phaser.GameObjects.Sprite;
  destroy(): void;
}

// src/adapters/render/ChaseCamera.ts
export class ChaseCamera {
  constructor(camera, projection, options?: { zoom?, lookAheadSeconds?, smoothingSeconds? });
  snapTo(state): void;                             // on spawn / respawn
  follow(state, deltaSeconds): void;               // exponential, frame-rate independent
}                                                  // defaults: zoom 1, lead 0.35 s, smoothing 0.18 s

// src/adapters/input/KeyboardDriver.ts
export class KeyboardDriver {
  constructor(keyboard: Phaser.Input.Keyboard.KeyboardPlugin);
  read(): InputCommand;                            // arrows/WASD, Space fire, Ctrl/Shift mine
  destroy(): void;
}

// src/app/FixedStepLoop.ts                        — phaser-free, unit-tested
export class FixedStepLoop {
  constructor(stepSeconds?: number, maxStepsPerFrame?: number);   // defaults 1/60, 5
  advance(elapsedSeconds: number, step: (stepSeconds: number) => void): number;
  reset(): void;
  get pendingSeconds(): number;
}

// src/data/cars/CarManifest.ts                    — the cars.json contract, phaser-free
export function parseCarSetManifest(raw: unknown): CarSetManifest;   // throws CarManifestError
export function findCarSheet(manifest, id): CarSheetManifest;
export function frameIndexForHeading(heading: number, frameCount: number): number;

// src/scenes/sceneKeys.ts -> SCENE_KEY, CAR_MANIFEST_KEY, CAR_ASSET_DIRECTORY,
//                            PLAYER_CAR_ID = 'marauder', DEFAULT_TRACK_ID = 'thunder-basin'
// src/scenes/BootScene.ts -> loads cars.json, validates it, then loads the strips it names
// src/scenes/RaceScene.ts -> the playable scene; `state` and `view` are read by the screenshot harness
// src/main.ts             -> Phaser.Game config; exposes `window.game` when MODE !== 'production'
```

---

## Locked technical decisions

Do not revisit these without a note explaining why. They are load-bearing, and 2, 7, 10 and 11 each
cost a real debugging round already.

1. **No transpiler.** Node 26 strips TypeScript types natively, so `tsx` was removed. Consequences
   that are easy to break by accident:
   - Every relative import MUST carry an explicit `.ts` extension (`./geometry.ts`).
   - Only erasable syntax is allowed (`erasableSyntaxOnly: true`): **no `enum`**, no parameter
     properties, no namespaces. String constants use frozen `as const` objects in
     `src/domain/constants.ts`.
   - Rationale: `tsx` cannot run in this sandbox (it needs a unix IPC socket, `listen EPERM`), and
     dropping it also removed a dependency.
2. **One projection, two consumers.** `ISO_X = 1`, `ISO_Y = 0.5`, `ISO_Z = 0.85` live in
   `src/domain/constants.ts` and are imported by both the runtime renderer and the offline sprite
   generator. If these drift, pre-rendered cars stop matching the ground plane.
3. **One global sprite scale.** All five cars are measured together and rendered with a single shared
   scale/offset, so relative car sizes are honest and the runtime needs only one `pixelsPerUnit`
   number (in `public/assets/cars/cars.json`) to draw a matching road. Never auto-fit cars
   individually. Current value: **8.143264 px/unit**, origin **(0.5, 0.550512)**.
4. **`src/domain/` must never import `phaser`.** Enforced by `tests/architecture/domain-purity.test.ts`,
   which also guards `tools/`. This is what keeps the whole simulation unit-testable in Node.
5. **`pngjs` only** for image output — pure JS. No `node-canvas`, no `sharp` (native builds break
   installs).
6. **Frame geometry**: 32 yaw frames, 64×64 px per frame, horizontal strip PNG + `cars.json`.
7. **Depth and backface tests are DERIVED from the projection, never invented.**
   `tools/spritegen/raster/projection.ts` reads the two projection formulas as an orthographic camera
   and computes the view direction from them. This was a real bug: a hand-guessed
   `depth = x + y - z` disagreed with `ISO_Z = 0.85`, so the cabin and glass canopy lost the depth
   test to the chassis roof they sat on and every car rendered as a flat slab. If you change any
   `ISO_*` constant the derivation adapts automatically — do not reintroduce a literal.
8. **Parallel-agent convention (deliberate deviation from the CLAUDE.md protocol).** When several
   agents run concurrently, the **orchestrator** owns the *Active agents* and *Task* tables: agents
   report results back and the orchestrator writes the rows. Four agents editing the same markdown
   table at once corrupts it. Agents working alone still register themselves as normal.
9. **Art agents never touch shared files.** Each writes only `tools/spritegen/cars/<id>.car.ts`.
   `npm run gen:preview -- <id>` deliberately falls back to loading `cars/<id>.car.ts` directly when
   the id is not in `registry.ts`, so authoring needs no shared-file edit. The orchestrator does the
   registry wiring.
10. **Track curvature is measured over one segment span, not analytically.** `TrackSpline.curvatureAt`
    fits a circle through three points spaced one *local segment length* apart. A uniform
    Catmull-Rom through 16 evenly spaced points on a circle of radius 100 is not a circle: it wanders
    0.055 units off it and its true curvature oscillates ±10% once per segment. Measured error by
    span on that fixture: 1.8 → ±10.7%, 8 → ±7.3%, 16 → ±4.0%, 32 → ±0.4%. The wiggle's period is
    one segment, so averaging over one segment cancels it. Using the *global average* segment length
    instead breaks on tracks that mix long straights with tight hairpins — it must be local.
    `CatmullRomSpline` therefore exposes no analytic curvature at all, so the worse number cannot be
    picked up by mistake.
11. **Aerodynamic drag is a function of the CAR ONLY, never the surface.** `ArcadeCarPhysics`
    derives its quadratic drag coefficient from `enginePower - TARMAC_ROLLING_RESISTANCE`, so a car's
    authored `maxSpeed` is exactly its terminal speed on tarmac with no artificial clamp. Folding the
    *current* surface into that derivation looks harmless and silently cancels the entire off-road
    penalty: a larger rolling resistance reduces the derived drag by the same amount, leaving
    terminal speed at `maxSpeed` on every surface. A test covers this.
12. **NPCs drive through the identical code path as the human.** Both emit `InputCommand`
    (`{throttle, brake, steer, fire, dropMine}`); `stepVehicle` is the only way to move a car. An AI
    literally cannot cheat by writing velocity, because it has no way to express that.
13. **Sign conventions, used everywhere.** `+Y` is left; `perpendicularLeft` is the left normal;
    positive `steer` turns left; positive curvature bends left; positive `lateralOffset` is left of
    the direction of travel. Car local space for art: `+X` forward, `+Y` left, `+Z` up, ground at
    `z = 0`.
14. **Corner radius follows control-point SPACING, not just point placement.** Authoring a tight
    corner means packing points close together (~50 units apart for the Thunder Basin hairpin);
    widely spaced points always produce a fast sweeper however sharply they seem to turn. The first
    draft of Thunder Basin had a "hairpin" whose measured radius was 86.6 units — indistinguishable
    from the fast sweeper at the other end — purely because its points were 120 units apart. A true
    180° hairpin also needs the track to fold back on itself, so entry and exit must be further
    apart than the wall-to-wall width (58 units here). **Never author a track without running
    `npm run gen:track` and looking at both the image and the numbers**: the report prints lap
    length, tightest corner radius, longest straight, and a self-clearance check that catches road
    overlapping itself, which is invisible in the coordinates and breaks lap tracking.
15. **The projection MIRRORS rotation, so the left key emits a NEGATIVE steer. This is not an
    inverted-controls bug.** The projection sends world `+X` to screen `(ISO_X, ISO_Y)` and world
    `+Y` to screen `(-ISO_X, ISO_Y)`; their 2D cross product is `2 * ISO_X * ISO_Y > 0`, and in
    Phaser's y-DOWN screen space a positive cross product means that turn is CLOCKWISE. So a world
    counter-clockwise turn — increasing `heading`, a LEFT turn by decision 13, a POSITIVE `steer` —
    is drawn rotating clockwise. A player pressing Left wants the car to rotate anticlockwise ON
    SCREEN, which is a world clockwise turn, which is `steer = -1`. `IsoProjection` exports
    `SCREEN_ROTATION_SIGN`, **derived** as `-Math.sign(2 * ISO_X * ISO_Y)` rather than written as a
    literal (same rule as decision 7), and `KeyboardDriver` multiplies by it. Confirmed by driving in
    a real browser: holding Left swept the heading 0° → -179° while the car rotated anticlockwise on
    screen, i.e. towards screen-left, and the sprite frame tracked it 0 → 20 → 16.
16. **How to verify the renderer by eye from an agent session.** `npm run dev` serves fine, but a
    headless browser here **cannot reach `localhost`** — the enforced HTTP proxy answers 502 and
    Chromium fails with `ERR_ACCESS_DENIED`; `--no-proxy-server`, `--proxy-bypass-list=<-loopback>`
    and running unsandboxed all fail too. This is the same class of sandbox limit that killed `tsx`
    in decision 1. What works, and what the T-009 screenshots were taken with:
    ```bash
    npx vite build --mode development       # NOT plain `vite build`: see below
    # then, from a script importing the npx-cached playwright:
    #   playwright:  /Users/klyffharlley/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs
    #   executablePath: ~/Library/Caches/ms-playwright/chromium_headless_shell-1228/
    #                     chrome-headless-shell-mac-arm64/chrome-headless-shell
    #   args: ['--no-proxy-server', '--enable-unsafe-swiftshader', '--allow-file-access-from-files']
    #   url:  file:///Users/klyffharlley/scm/concurrence-gamming/dist/index.html
    ```
    `--allow-file-access-from-files` is required or the `cars.json` fetch is blocked by CORS, and
    `--enable-unsafe-swiftshader` gives WebGL in software (Phaser reports no errors under it). Drive
    the car with real `page.keyboard.down('ArrowUp')` events, and read state through the handle
    `window.game` that `src/main.ts` exposes: `window.game.scene.getScene('race')` gives `.state`,
    `.view.sprite.frame.name` and `.cameras.main.setZoom(0.18)` for a whole-circuit shot. The handle
    is gated on `import.meta.env.MODE !== 'production'`, **not** on `import.meta.env.DEV`: `vite build`
    forces `NODE_ENV=production`, so `DEV` is false even for `--mode development` and the block gets
    tree-shaken out of exactly the build you meant to inspect. The playwright npm package version
    (1.62.0-alpha) does not match the cached browser build (1228), which is why `executablePath` is
    passed explicitly instead of letting playwright resolve a browser.
17. **The `cars.json` contract lives in `src/data/cars/CarManifest.ts`, not in `tools/`.** The game is
    what needs the data; `tools/spritegen/schema.ts` merely produces it and now re-exports the types
    from there. `parseCarSetManifest` validates the file at load time on purpose: every field in it
    silently changes what the screen looks like rather than throwing, so a missing `origin` would read
    as `undefined` and make every car wobble, and a missing `pixelsPerUnit` would size the road wrongly
    with nothing looking broken until you compared cars to it.
18. **There is no dedicated brake key: Down brakes, and then engages reverse.** The user chose this
    on 2026-08-15 over "Down is reverse only, Space is brake". Holding Down while rolling forward gives
    `brake = 1`; once the car has been at a standstill for `engageDelaySeconds` (0.3 s) with the key
    still held, `reverse = 1`. Pressing Up disengages reverse immediately, and the existing forward
    thrust then decelerates the reverse motion and pulls away by itself — no special case needed. The
    0.3 s dwell exists so that stabbing the brake to a stop does not launch the car backwards.
    **Where each half lives, and why:** the latch is INPUT state and lives in
    `src/adapters/input/ReverseLatch.ts` (pure, unit-tested), because "which gear the driver is asking
    for" is not physics. The 35 % speed limit is PHYSICS and lives in `ArcadeCarPhysics`, derived the
    same way forward top speed is (decision 11): reverse power is solved so that terminal reverse speed
    on tarmac is exactly `REVERSE_SPEED_FRACTION * maxSpeed`, i.e.
    `P_rev = TARMAC_ROLLING_RESISTANCE + (enginePower - TARMAC_ROLLING_RESISTANCE) * 0.35²`. **No clamp**
    — the limit emerges from drag, so `REVERSE_SPEED_FRACTION` means what it says. Throttle always
    overrides reverse in `stepVehicle`, so a stuck reverse key can never fight the accelerator.
19. **Walls scrape, they do not bounce, and they never spin the car.** The user chose this on
    2026-08-15 over a hard wall and over a wall that induces a spinout. `resolveWallContact` clamps the
    car's centre to `trackFullHalfWidth(track) - carRadius` along the projection normal (so it can never
    tunnel through), reflects only the velocity component going INTO the wall and damps it to
    `WALL_RESTITUTION = 0.3`, and scrubs the tangential component by `WALL_SCRUB = 0.15`. A car already
    moving away from the wall keeps its normal velocity untouched, or scraping out of a hit would yank it
    back in. `heading` and `yawSpin` are deliberately left alone: `yawSpin` is reserved for weapon hits
    (T-016), and the user explicitly did not want walls to spin the car.
20. **All audio is synthesised procedurally with the Web Audio API. No sample files, no MIDI, no new
    dependencies.** Same philosophy as the sprite pipeline: the assets are generated, not shipped. It is
    also the only approach that works here — an engine note has to follow road speed continuously, which
    sample playback cannot fake. Two consequences worth knowing before touching it: **gears exist only
    for the sound** (`stepVehicle` is gearless by design, and `EngineGearbox` must never be wired into
    the simulation), and **every parameter change must go through `setTargetAtTime` or a ramp, never a
    bare `.value =`** — assigning at frame rate produces zipper noise and clicks. Every voice must also
    be a no-op rather than a throw while the `AudioContext` is suspended, because browsers start it
    suspended until a user gesture; the scene resumes it on the first key press.
21. **Camera zoom is adaptive, and its direction is the opposite of the usual convention.** The user
    asked for zoom IN on fast straights and zoom OUT approaching and through corners — most racers do
    the reverse. `CameraZoomPolicy` returns
    `cornerZoom + (straightZoom - cornerZoom) * straightness * pace`, so full zoom-in needs a straight
    AND speed, and a stationary car sits at `cornerZoom` (1.5). `straightZoom` is 2.0. The corner
    threshold is `1/70` measured against the real circuit: the hairpin's radius is 39.8 units and the
    fast sweeper's about 110, so 70 reads the hairpin as a full corner and the sweeper as roughly
    two-thirds of one. Zoom eases on its own, slower time constant (0.6 s vs 0.18 s for position),
    because zoom that tracks as fast as translation is nauseating. Note this means non-integer zoom on
    pixel art, which resamples the sprites slightly — accepted deliberately in exchange for the effect.
22. **`TrackSpline`'s sample table is uniform in spline PARAMETER, never in arc length — never derive a
    sample index from `totalLength / sampleCount`.** This was a real, critical bug (T-025, fixed
    2026-08-15): `projectNear` located its search window, and `refine` sized its ternary-search
    bracket, by dividing an arc length by the *average* sample spacing. That is only correct if every
    authored segment has the same length. `thunder-basin` mixes a hairpin (points ~50 units apart,
    decision 14) with a long straight (points far apart), so the average diverges sharply from the
    local spacing — the resulting index error reached 150+ world units, `lateralOffset` came out as
    garbage, and because `projectNear`'s hot-path result is fed back in as next step's hint, the error
    compounded frame over frame instead of correcting itself (observed in-game: reported distance ran
    away 63 -> 66 -> 69 -> 75 -> 86 -> 106 -> 143 -> 318 -> 675 -> 1084). This is why the wall-collision
    clamp could teleport the car across the map. **The circle fixture in `tests/domain/TrackSpline.test.ts`
    cannot catch this class of bug**: 16 evenly spaced control points around a circle give every segment
    the same length, so average spacing equals local spacing everywhere and the bug is invisible — the
    existing 19 tests passed both before and after the fix. Regression coverage now lives against the
    real, irregular `thunder-basin` track instead. The fix: `sampleIndexAt` (a private binary search
    over `cumulativeLengths`, extracted out of `parameterAt` and shared) finds the exact sample for an
    arc length; `projectNear` walks outward from that exact centre index in arc length (via
    `arcLengthOfIndex`, which unwinds the lap count so `fromIndex <= toIndex` holds across the wrap
    point) until it has covered `searchWindow` on both sides; `refine`'s bracket half-width is
    `localSpacingAt` — the larger of the two sample spans neighbouring the centre index, not the global
    average. Any future change to the sample table or these methods must re-run the T-025 tests against
    `thunder-basin`, not just the circle fixture, or a regression here will look green.

---

23. **A spline sample table is uniform in the PARAMETER, never in arc length — so never convert an arc
    length to a sample index by dividing by the average spacing.** `projectNear` did exactly that and was
    wrong by 150+ world units on Thunder Basin: the search window landed on a different part of the
    circuit, `lateralOffset` came back as 146 instead of -9, and the wall clamp then teleported the car
    across the map. Worse, the bad `distance` fed the next frame's hint, so the error compounded — the
    measured runaway was 63 → 66 → 69 → 75 → 86 → 106 → 143 → 318 → 675 → 1084 while the car barely moved.
    Always locate a sample index by binary searching `cumulativeLengths` (that is what `sampleIndexAt` is
    for) and grow a search window outward in arc length. **The 19 pre-existing tests all passed** because
    their fixture is a circle with evenly spaced control points, where average spacing happens to equal
    local spacing. Any new spline work must be tested against the real `thunder-basin` geometry, which
    mixes a 377-unit straight with a 39.8-radius hairpin, and not only against the circle.

24. **A field that is only wrong during a contact will hide the bug it is reporting on.** The debug
    overlay showed `lat = 40.28` on a track whose wall limit is 27.3, and that impossible number is the
    only reason decision 23's bug was ever noticed — but it was itself a second bug: `RaceScene` stored
    the projection's PRE-correction offset. Anything that resolves a constraint must report the state
    AFTER resolving it, which is why `WallResolution` now carries its own `lateralOffset`.

25. **`setScrollFactor(0)` does NOT pin a HUD once the camera zooms.** It cancels the camera's scroll
    and nothing else, so under T-020's adaptive 1.5…2.0 zoom the debug text was pushed clean off the
    viewport — invisible on screen from T-020 onward while still reporting `visible: true` with correct
    contents. It went unnoticed for two whole tasks because the screenshot harness read the numbers
    through `window.game` instead of off the image. `TuningOverlay` instead tracks `camera.worldView`
    in world space and counter-scales by `1 / zoom` every frame. **Two lessons: verify a rendering
    change by READING THE IMAGE, never by reading the object's state; and any future HUD (T-015's
    `HudScene`) must do the same or live in its own zoom-1 camera.** A HUD also needs its own backdrop
    — `#c8d0e0` text vanished against Thunder Basin's light brown run-off.

26. **The camera's zoom is quantised to multiples of 0.5 at the call site, not in the policy.**
    `CameraZoomPolicy` takes an optional `zoomStep` that defaults to 0 (off) and `RaceScene` opts in
    with 0.5. Cars are pre-rendered 64 px sprites, so a continuously drifting zoom resamples them every
    frame; snapping parks the car at 1.5 or 2.0 and confines the resampling to the ~0.6 s transition
    that `zoomSmoothingSeconds` spreads it over. Note 1.5 is still not an integer and still resamples —
    this trades a constant shimmer for a brief one. Raise the step to 1 if the corner zoom ever has to
    be pixel-exact. The default stays 0 so the policy's own 24 tests keep asserting the raw blend.

27. **A pace/AI driver must use `atan2(cross, dot)` for its bearing error, and must NOT add a
    proportional lateral-offset term on top of pure pursuit.** Both mistakes were made and both were
    paid for. `cross()` alone is the SINE of the error, so it reads 150° off course as gently as 30°
    off and the driver coasts wide instead of hauling the car round. And `lateralOffset` is in world
    units, reaching 27 at the wall, so a gain anywhere near 1 pins the steering at full lock and the
    car saws left and right until it beaches — pure pursuit already converges on the centreline by
    itself, because a car left of the line sees an aim point to its right. Separately, a corner speed
    target must come from the steady-state grip limit `sqrt(grip / |curvature|)` (a `grip` stat IS a
    lateral acceleration, u/s²) sampled across a braking zone sized from the car's own `brakeForce` —
    a single fixed 30-unit lookahead arrives at the hairpin still flat out, because braking from
    78 u/s takes about 80 units.

28. **Reverse is limited by GEARING, not by force — and a reverse force derived from tarmac silently
    stops working off-road.** The original model derived a small constant reverse power so that
    `REVERSE_SPEED_FRACTION * maxSpeed` came out as the exact terminal speed on tarmac. That gave the
    reference car 5.92 u/s² against tarmac's rolling resistance of 2 (fine) and against off-road's 16
    (fatal): measured **0.05 u/s after a full second on dirt, for all five cars** — reverse ceased to
    exist the moment the car left the track, which is exactly when a driver reaches for it. Forward
    drive never showed it because 34 comfortably beats 16. Reverse now uses the engine's FULL
    `enginePower`, tapered linearly to zero at the reverse ceiling. Measured after: tarmac -17.7 u/s
    after 1 s and 30.0% of `maxSpeed` terminal; dirt -10.2 u/s and 17.5% — **the off-road penalty is
    preserved rather than exempted** (decision 11 holds). Consequence to remember: `REVERSE_SPEED_FRACTION`
    is a ceiling crept towards, **not** an exact speed, so T-021's "exactly 35.0%" no longer holds and
    must not be re-asserted. Found by the user at the wheel, not by any test — the 29 physics tests all
    passed, because every one of them measured reverse on tarmac.

29. **A "next checkpoint index" cannot also encode "how many checkpoints have been claimed", because
    checkpoint 0 IS the start line.** `LapTracker` shipped with `nextCheckpoint === 0` meaning both "the
    car has claimed nothing yet" (its initial state) and "the car has claimed everything and the line is
    next". Those two states are opposites, and collapsing them meant a car that cut straight to the
    line without passing a single checkpoint scored a lap — precisely the cheese the module exists to
    reject. Fixed by carrying an explicit `gatesClaimed` count of the checkpoints between the lines, and
    requiring `gatesClaimed >= checkpointCount - 1` before a line crossing counts. **When a single field
    has to answer two questions, add the second field.** Also: crossing the line with gates missing
    resets the tally, so half a lap cannot be banked now and finished on the next pass.

## Task table

Plan phases map 1:1 onto these IDs. Status values: `todo`, `in_progress`, `blocked`, `review`, `done`.

| ID | Title | Status | Owner | Blocked by | Next step |
| --- | --- | --- | --- | --- | --- |
| T-001 | Scaffold: Vite + TS + Phaser + Vitest, git init | `done` | main | — | Done. `tsx` dropped for native Node type stripping; scripts run `node tools/...ts`. |
| T-002 | Create WORKLOG.md per protocol | `done` | main | — | Done (this file). Keep it updated. |
| T-003 | Guard test: nothing under `src/domain/` or `tools/` may import `phaser` | `done` | guard-test | — | Done: `tests/architecture/domain-purity.test.ts`, 4 tests. Catches static/dynamic/require/subpath imports, and asserts the walker found files so it cannot pass vacuously. Verified by deliberately adding a phaser import and watching it fail. |
| T-004 | Sprite pipeline + `marauder` reference car | `done` | main | — | Done. `npm run gen:sprites` emits 5 strips + `cars.json`. Verified by eye against the user's reference sheet. |
| T-005 | Four art agents author the remaining car models | `done` | art-* (4 agents) | T-004 | Done and reviewed in `.preview/roster.png`. `havac` needed one revision round (it rendered as a flat grey tray); it now clears the bar. See **Known art polish items**. |
| T-006 | Golden-hash test over all 5 generated sheets | `done` | golden-hash | T-005 | Done: `tests/spritegen/golden-sprites.test.ts`, 4 tests. Renders in-process and hashes raw frame pixels (not PNG bytes), asserts the shared fit scale/origin, frame count/size, no blank frames, unique ids. Verified by nudging marauder's chassis width and watching it fail by name. |
| T-007 | `math/Spline.ts` + `TrackSpline` (arc length, nearest point, curvature) | `done` | main | — | Done: 19 tests against a circle of known radius. API: `totalLength`, `wrap`, `signedDelta`, `frameAt`, `positionAt`, `curvatureAt`, `project`, `projectNear`. |
| T-008 | `thunder-basin.track.ts` — the one v1 circuit | `done` | main | T-007 | Done: `src/data/tracks/thunder-basin.track.ts` + `registry.ts` + `TrackDefinition.ts`, and the authoring tool `tools/trackgen/preview.ts`. Measured: lap 1505 units, tightest corner radius 39.8 (the west hairpin), longest straight 377, self-clearance 82.3 vs 58 required. Verified by eye in `.preview/track-thunder-basin.png`. |
| T-009 | Rendering: `IsoProjection`, `TrackRenderer`, `VehicleView`, follow camera | `done` | main + 7 agents | T-004, T-008 | **Done and verified in a real browser.** Delivered `src/main.ts`, `src/scenes/{sceneKeys,BootScene,RaceScene}.ts`, `src/adapters/render/{IsoProjection,TrackRenderer,VehicleView,ChaseCamera}.ts`, `src/adapters/input/KeyboardDriver.ts`, `src/app/FixedStepLoop.ts`, `src/data/cars/CarManifest.ts`, and 77 new tests (124 total). Gate met: the Marauder sits on a visible Thunder Basin, drives under arrows/WASD and steps through the 32 yaw frames in step with its heading; `npm run build` is clean. Both silent traps avoided — origin read from `cars.json` (0.5, 0.550512) and the road sized from `pixelsPerUnit`. See decisions 15, 16, 17 and **Rendering follow-ups**. |
| T-010 | `ArcadeCarPhysics` — grip clamp drift model, fixed 60 Hz | `done` | main | — | Done: 20 tests. `stepVehicle(state, input, stats, surface, dt)` is pure. Drift = lateral tyre force clamped at `stats.grip`; threshold is `grip / LATERAL_GRIP_STIFFNESS` (exposed as `driftThreshold`). **Handling feel accepted by the user at the wheel on 2026-08-15 after T-009 made it playable — treat the current constants as a validated baseline and do not re-tune them casually.** |
| T-011 | Collisions: car↔car impulse, car↔wall via spline lateral offset, off-road drag | `done` | track-collision + main | T-007, T-010 | **Done and verified on screen.** `src/domain/track/TrackCollision.ts`: `surfaceAt(lateralOffset, track)` picks `OFFROAD` past `halfWidth`, `resolveWallContact` clamps the car centre to `trackFullHalfWidth - collisionRadius` (27.3 on Thunder Basin), reflects the inward normal velocity at `WALL_RESTITUTION = 0.3` and scrubs tangential speed by `WALL_SCRUB = 0.15` — scrape and continue, no spinout (decision 19). 19 tests. Measured in the browser: driving straight into the outside of a corner at 45 u/s pins the car at exactly `lat = -27.30` and it never leaves. **Car-to-car impulse is NOT done** and is deliberately deferred to T-013, which is when a second car first exists. |
| T-012 | Tuning harness: headless scripted lap + on-screen debug overlay | `done` | main + zoom-snap, overlay-format, ontrack-step, pace-driver, lap-harness | T-010, T-011 | **Done, and the feel gate is SIGNED OFF BY THE USER at the wheel on 2026-08-15: the car is controllable and it drifts, and the five cars feel meaningfully different.** Delivered: `TuningOverlayFormat` (pure, 39 tests) + `TuningOverlay` (Phaser, tracks `camera.worldView`), `OnTrackStep.stepVehicleOnTrack` (the five-stage step order extracted out of `RaceScene` so the harness drives the REAL pipeline, 12 tests), `PaceDriver` (pure pursuit + grip-limited corner speed, 14 tests), `tests/tuning/LapTimes.test.ts` (6 tests, all five cars lap the real circuit), `zoomStep` on `CameraZoomPolicy` (32 tests). `T` toggles the overlay, `C` cycles the car by restarting the scene. Measured laps: marauder 33.22 s, dirt-devil 33.57 s, battle-trak 34.13 s, air-blade 39.13 s, havac 40.87 s — a 23% spread, and **`air-blade` has the highest `maxSpeed` (95) yet is not the fastest over a lap**, so on this circuit grip beats top speed. Two defects came straight out of the user's session: T-028 (reverse dead off-road) and T-029 (tyre marks too thick). Note the harness never exercises the drift path — the pace driver deliberately stays inside the grip limit. |
| T-013 | `LapTracker`, `PositionRanker`, `StartingGrid`, `RaceSimulation` state machine | `done` | main + lap-tracker, position-ranker, starting-grid, car-collision, race-simulation | T-007 | **All five domain pieces landed AND the multi-car core is now written: `src/domain/race/RaceField.ts` (18 tests).** What remains is the `RaceScene` wiring — the scene still owns exactly one car. `RaceField` owns the field and the step order, so the scene will only have to draw it: five `VehicleView`s, camera on the player, and the HUD reading `field.race`. **The step order is the part that matters and it is locked in the class comment:** (1) every car integrates independently including walls, (2) only THEN car-to-car contact pair by pair, (3) any car a contact moved is re-checked against the wall, (4) damage from the hardest contact of the step, (5) lap progress and standings last. Stages 1 and 2 must not interleave — resolving contact inside the per-car loop makes the impulse depend on array order, so the same pair of cars would exchange different momentum depending on who was listed first. Stage 3 exists because a contact impulse will happily shove a car sideways through a wall that stage 1 already resolved. Measured over the real track: five cars racing 23 s never leave the walls, momentum is conserved through a rear-end within 5%, the pace cars lap and an idle player ranks last. NPCs drive through `PaceDriver` on the same `InputCommand` path as the human (decision 12). **`RaceField.step` freezes every car during COUNTDOWN by feeding it `IDLE_INPUT`** — the arcade behaviour, and it makes `RaceSimulation`'s jumped-start guard belt-and-braces rather than the only defence. Inventory of the pieces underneath it: `LapTracker.ts` (sequential checkpoint gates, rejects shortcuts and reverse cheese, 21 tests), `PositionRanker.ts` (ranks on the single monotonic `totalProgress`, so the wrap at the start line cannot mis-sort, 13 tests), `StartingGrid.ts` (rows across `gridLateralOffsets` then back by `gridRowSpacing`, 31 tests), `RaceSimulation.ts` (the `COUNTDOWN → RACING → FINISHED` machine, 28 tests — progress frozen during the countdown, `finishedAtSeconds` recorded once per racer, FINISHED only when every racer is home), `CarCollision.ts` (mass-weighted normal impulse, restitution 0.25, momentum conserved, never touches `heading`/`yawSpin` — the car-to-car work deferred here from T-011, 13 tests). |
| T-014 | `AIDriver` — pure pursuit + curvature speed + avoidance | `todo` | — | T-010, T-013 | Emit `InputCommand` only. Target speed from `curvatureAt` with a widened span for look-ahead. Bounded rubber-banding. |
| T-015 | `HudScene` — position, lap, timer, ammo, countdown, standings | `done` | main + hud-format | T-013 | **DONE and VERIFIED BY READING THE SCREEN** (`/tmp/hud2.png`, `/tmp/hud_racing.png`): big pulsing ordinal position, `LAP n/3`, `m:ss.cc` timer, live standings by display name, `AMMO n/n`, a colour-coded integrity bar (green/amber/red) and an animated countdown that snaps in large and settles, with `GO!` fading itself out. It IS its own scene at zoom 1, so decision 25's trap does not apply and none of `TuningOverlay`'s counter-scaling was copied. Two things the screenshot caught that state inspection never would have: the HUD collided with the debug overlay in the top-left (fixed by making `TuningOverlay` start HIDDEN — it is a debug readout, `T` shows it), and the countdown sat squarely on top of the player's car (moved to 26% of screen height, because the chase camera keeps the car centred). Ammo shows the car's `ammoCapacity` until T-016 exists, so it is already per-car correct — battle-trak reads 15, air-blade 4. Must be its OWN Phaser scene rendered over `RaceScene`, not game objects inside it — that is both what the plan specifies (`scenes/{BootScene,RaceScene,HudScene}`) and the only clean way to get a zoom-independent layer, see decision 25 and T-027. The user also asked for it to be **animated** (countdown, position changes, lap flips). Add a car-integrity bar here once T-030 lands. Distinct from `TuningOverlay`, which is a debug readout and stays. **Pure formatting layer DONE: `src/adapters/render/HudFormat.ts` — `formatHud`, `positionOrdinal` (11th/12th/13th handled), `formatRaceTime` (m:ss.cc), countdown 3/2/1/GO!, `integrityPercent` for the bar, 109 tests. The Phaser `HudScene` itself is NOT written yet.** |
| T-030 | Car damage + explosion: integrity per car, wall and weapon damage, destruction, respawn | `review` | main + damage-rules, explosion-voice, explosion-effect, damage-asymmetry, explosion-polish | T-015, T-016 | **New scope, agreed with the user on 2026-08-15** after they reported that "the car's explosion/breaking isn't clear whether it happens" — because it does not exist. The v1 plan only ever had a weapon hit causing a spinout, with `armor` as spinout resistance; there is no damage model anywhere in it. Agreed shape: `VehicleState.integrity` 1→0; wall contact damages in proportion to `impactSpeed` (`resolveWallContact` already reports it); weapon hits damage, mitigated by `armor`; at zero the car explodes, sits out ~2 s and respawns on the track. Needs an `ExplosionVoice` synthesised procedurally (decision 20 — no sample files), a sprite/particle effect, and an integrity bar in the HUD. Keep the damage rules in `src/domain/`, pure and tested, exactly like every other rule. **NOW WIRED END TO END AND SEEN ON SCREEN** (`/tmp/boom.png`): a destroyed car's sprite is hidden, `ExplosionEffect` bursts at its position, `RaceAudio.playExplosion` fires with an intensity that falls off with distance from the player, the integrity bar empties, the wreck sits out and respawns on the centreline where it died. Explosions are collected INSIDE the fixed-step callback, because `explodedThisStep` is true for one step only and several steps run per rendered frame. **Damage is now asymmetric, as the user asked: the car that RECEIVES the hit takes full damage, the one that DEALT it takes 40% (`AGGRESSOR_DAMAGE_SHARE`).** The aggressor is whichever car was closing faster along the line joining the centres, read BEFORE the impulse is applied — afterwards both cars are separating and neither looks guilty. A genuine head-on blames neither, so both take full damage. **The first explosion render was judged too weak (a glowing donut, no visible debris, a perfect circle where the 2:1 iso ground needs an ellipse) and `explosion-polish` is redoing it.** Original rules: `src/domain/vehicle/CarIntegrity.ts` — `applyImpactDamage`, `applyWeaponDamage`, `tickIntegrity`, `CAR_CONDITION`, 39 tests. Damage threshold 12 u/s so scrapes cost nothing; 78 u/s head-on costs 45% for the marauder, 30% for high-armour havac, 64% for fragile air-blade; 2 s respawn. NOT wired in, and NO explosion effect or sound exists yet.** ⚠️ **UNVERIFIED RISK to check first when wiring: `resolveWallContact` reports `impactSpeed` as the NORMAL component into the wall, not total speed. A 78 u/s glance along a wall may produce a normal component under the 12 u/s threshold, in which case damage — and therefore the explosion the user asked to see — would almost never trigger. Measure the real distribution of `impactSpeed` in a driven lap before trusting the threshold, and lower it if needed.** |
| T-016 | `WeaponSystem` + missile and mine behaviours + spinout | `todo` | — | T-010 | `VehicleState.yawSpin` already exists and decays via `YAW_SPIN_DECAY_PER_SECOND`; a weapon hit just sets it. Strategy pattern per weapon. |
| T-017 | Weapon pickups along the spline + AI firing decisions | `todo` | — | T-016, T-014 | Place by arc length; respawn on a timer. |
| T-018 | `SplashScene`: splash art + slow-blinking "PRESS SPACE TO ROCK'N THE 90s" + car select on the same screen | `todo` | — | T-015 | **Reshaped by the user on 2026-08-15** — it is now the splash screen AND the car select in one, not a plain title card. (a) Background is the authored art at `src/assets/spash.jpeg`, which must MOVE to `public/assets/ui/splash.jpeg` and load via `BootScene` — a Vite `import` would inline 1 MB into the bundle, and every other asset here is served from `public/`. **Layout is dictated by the art, which was read on 2026-08-15 before this was written** (~1422×768): the **"ROCK'N 90s" logo and the "PRODUCED BY ZHAS STUDIO AND KLYFF" credit are already painted into the top of the image, so do NOT draw a title over it**; the large dark explosion void in the centre is the only region with contrast enough for text, so the prompt and the car-select panel belong there; the bottom third is road and cars and should stay clear. The canvas is `Scale.RESIZE` at full window, so scale the art to COVER, centre it, and position text against the IMAGE's rect rather than the viewport — otherwise the prompt drifts off the dark void on a tall window. (b) Prompt "PRESS SPACE TO ROCK'N THE 90s" blinking SLOWLY, ~1.0–1.4 s period, **hard on/off cut and NOT an alpha tween** — the era's blink was a palette flip, and a fade reads as modern. Drive it from a pure `BlinkClock` fed `deltaSeconds` so the cadence is testable and `Date.now()` never appears. (c) LEFT/RIGHT arrows pick the player's car right here, showing sprite frame 0, `displayName`, `archetype` and stat bars from `cars.json`; SPACE confirms and passes `carId` into `RaceScene`, replacing the `PLAYER_CAR_ID` constant. |
| T-031 | `assignNpcCars` — NPCs always take cars the player did not pick, never duplicated | `done` | main | — | **DONE.** Pure, `src/domain/race/CarAssignment.ts`, 9 tests, wired into `RaceScene.buildEntries`. Verified on screen: the five cars on the grid are five different models. Five cars and five racers means the NPC field is exactly "the rest of the roster", deterministic in order so a race is reproducible. Must degrade cleanly if the roster ever grows past or shrinks below the grid size, because `buildStartingGrid` sizes the grid from the racer count. |
| T-032 | The rival: one NPC per track carries a small handling edge | `todo` | — | T-031, T-014 | **New scope from the user, 2026-08-15: "toda pista tem um NPC cujo carro é um pouco melhor, faz curva melhor ou não derrapa tanto".** A HANDLING edge, deliberately not engine power, so it reads as a better driver and not a faster car: a `RivalProfile` naming the rival's `carId` per track (authored on the `TrackDefinition`, so each circuit gets its own nemesis) plus bounded modifiers — `grip` ×~1.10, more drift resistance (a higher lateral-force clamp), and a tighter `cornerSafetyFactor` on its `PaceDriver`. Apply as a DERIVED `VehicleStats` built once at race setup; never mutate the roster stats, which are shared data from `cars.json`. Bound the advantage to roughly 3–5% of lap time — inside the 23% spread already measured across the five cars — and verify rival-vs-stock on the same car through `tests/tuning/LapTimes.test.ts`. This is the honest version of rubber-banding: one named car with a fixed, visible edge instead of a hidden force on the whole pack. |
| T-034 | Ten planets / areas as commissioned art | `review` | user (art) + main | — | **The user generated all ten images from the briefs in `docs/art-briefs/planets.md` and they are in `src/assets/planets/Planet-1..10.png`.** Planet-1 was reviewed and is exactly right: Thunder Basin as red mesas under a violet lightning storm, with the left third kept calm for UI, which is what the brief asked for. These are **Prompt A output — area-select illustrations, not iso ground planes**, so the next steps are: (a) move them to `public/assets/ui/planets/<slug>.png` and rename from `Planet-N` to the planet slug, because assets are served from `public/` and never imported (a 1 MB+ `import` gets inlined into the bundle); (b) build the area-select screen that shows them; (c) pull each image's palette into a `theme` on `TrackDefinition` (road, shoulder, wall, line colours) so the procedurally drawn road agrees with the art instead of fighting it. **Do NOT try to use these as the track surface** — `TrackRenderer` derives the road from the spline every frame, which is what lets a circuit be authored from control points alone. A seamless iso ground tile (Prompt B in the briefs) is the separate, still-ungenerated deliverable for that. |
| T-035 | Save progress in a browser cookie, **three slots per player, like a 90s memory card** | `in_progress` | save-slots | — | **New scope from the owner, 2026-08-15.** Pure model in `src/domain/progress/SaveSlots.ts` (3 slots, 3-letter arcade name, chosen car, tracks won, best lap per track), plus a cookie adapter. **The hard constraint is that a cookie holds ~4 KB TOTAL**, so the encoding is compact short keys + `encodeURIComponent`, with a `SAVE_BYTE_BUDGET` and a `fitsInCookie` guard so an oversized save is REFUSED rather than silently lost. `parseSave` must be paranoid — a cookie is user-editable text and can be truncated or left over from an older build, so corruption costs the player their progress and never their ability to load the game. `Date.now()` stays forbidden: every mutating function takes `nowMillis`. **Remaining after the domain lands: the cookie adapter (`src/adapters/storage/CookieStore.ts`), a slot-select screen, and deciding WHEN a race writes a slot.** |
| T-036 | Per-planet look: `theme` on `TrackDefinition`, and the area-select screen | `todo` | — | T-034 | Split out of T-034 now that the art exists. `TrackRenderer` currently holds the road, shoulder, wall and line colours as constants, so every planet would look identical. Give `TrackDefinition` a `theme` (those four colours + an optional ground tile key), read it in the renderer, and pull each planet's palette out of its illustration so the procedural road agrees with the art. Then the area-select screen that shows the illustrations. |
| T-033 | Wall impacts almost never cross the damage threshold, so the explosion the user asked for would never fire | `todo` | — | T-030 | **Measured, not suspected** — this is the risk flagged on T-030's row, now confirmed with `tools/measure-impacts.ts` over the real pipeline: driving the marauder flat out for 20–30 s produced `contacts=716 over12=1 max=13.0` ploughing into the first corner, `contacts=1598 over12=1 max=42.5` on a drifting line, and integrity only fell 1.00 → 0.90 in the worst case. **Zero explosions in any run.** The cause is the one predicted: `resolveWallContact` reports `impactSpeed` as the NORMAL component into the wall, and normal driving glances off walls tangentially, so the 12 u/s threshold is crossed once or twice a lap at most and the quadratic curve then makes those hits nearly free. Options: lower `IMPACT_DAMAGE_THRESHOLD`, raise the damage per hit, or feed damage from total speed change over the step rather than the normal component (probably the truthful fix — a car that loses 40 u/s in one step has crashed, whatever the geometry). Do NOT tune this blind: re-run the measurement tool after each change. |
| T-019 | README, delivery report, `npm run build` verified | `todo` | — | T-018 | `npm run build` already verified clean during T-009; README and the delivery report remain. |
| T-020 | Adaptive camera zoom: in on fast straights, out in corners | `done` | camera-zoom + main | T-009 | **Done and verified numerically over the whole lap.** Sampling `targetZoom` every 25 units at 70 u/s: mean 1.933 on straights (R > 400) and 1.518 in tight corners (R < 90), min 1.500, max 1.949 — inside the requested 1.5…2 band. See decision 21 for why the direction looks inverted. |
| T-021 | Reverse gear: Down brakes, then reverses at 35% of `maxSpeed` | `done` | physics-reverse, input-reverse-latch, main | T-010 | **Done and verified numerically for all five cars.** Terminal forward speed equals `maxSpeed` exactly and terminal reverse is exactly 35.0% of it on every car (marauder 78.00 / -27.30, air-blade 95.00 / -33.25, …), because reverse power is DERIVED from the drag coefficient rather than clamped (decision 18). Throttle beats a stuck reverse key (77.96 forward with both held). Down brakes while rolling, then engages reverse after a 0.3 s standstill dwell; no dedicated brake key. |
| T-022 | Tyre marks while drifting | `done` | render-tyremarks + main | T-009, T-010 | **Done and verified in a screenshot** (`/tmp/final-drift.png`): two dark strips trail the rear wheels through a drift. Emitted only when `telemetry.isSliding` or `gripUsage >= 0.85` — a full-throttle straight-line run produces exactly zero segments, which was checked explicitly. |
| T-023 | Procedural engine / skid / brake / impact audio | `done` | audio-tyres, audio-engine-2, main | T-010 | **Done and SIGNED OFF BY THE USER at the wheel on 2026-08-15 — the sound was heard and accepted.** This was the last unverified item from the previous two rounds. All synthesised with the Web Audio API, no asset files (decision 20): `EngineGearbox` (5 sound-only gears, geometric ratios, structural hysteresis, 10 tests) + `EngineVoice` (two detuned saws an octave apart plus a sub square, 55–220 Hz, lowpass 300→4500 Hz, `shift()` dips gain to 35% for ~50 ms), `NoiseSource` (one shared 2 s white-noise loop), `SkidVoice`, `BrakeVoice`, `ImpactVoice`. |
| T-024 | `RaceAudio` facade + wire collisions, tyre marks, zoom and audio into `RaceScene` | `done` | main | T-011, T-020, T-021, T-022, T-023 | **Done.** `RaceAudio` facade + `RaceScene` owns the step order: project → pick surface → integrate → re-project → resolve wall. Two projections per step on purpose (the surface must be sampled where the car was driving, the wall resolved where it ended up). `AudioContext` resumed on the first key press; M mutes; R respawns. This integration is what surfaced T-025 and T-026. |
| T-025 | Critical bug: `TrackSpline.projectNear` uses average spacing instead of arc-length binary search, causing 150+ unit projection errors and runaway wall-collision teleports on `thunder-basin` | `done` | spline-projectnear-fix | — | Fixed. Extracted `sampleIndexAt` (binary search) from `parameterAt`; `projectNear` now finds the centre sample by exact binary search and grows the range outward in arc length via a new `arcLengthOfIndex` helper (handles the wrap without wrapping the index itself); `refine`'s ternary-search bracket now uses `localSpacingAt` (larger of the two neighbouring spans) instead of the global average. 3 new tests in `tests/domain/TrackSpline.test.ts` against the real `thunder-basin` track (40-point lap sweep x 3 lateral offsets, stale-hint tolerance, 200-step runaway-feedback simulation). 214 tests pass (was 211), typecheck and build clean. See WORKLOG decision list — should probably get its own numbered decision on next edit explaining why the circle fixture masked this. |
| T-026 | `resolveWallContact` reported the pre-correction lateral offset, so the overlay lied during every wall contact | `done` | main | T-011 | Fixed. `WallResolution` now carries `lateralOffset` — the offset of the CORRECTED position — and `RaceScene` stores that instead of the projection's own value. Found because the debug overlay claimed `lat = 40.28` on a track whose wall limit is 27.3, which is what led to T-025. 4 new tests in `tests/domain/TrackCollision.test.ts`, including agreement with re-projecting the corrected position. **Lesson: a reporting field that is only wrong during contact hides the bug it is reporting on.** |
| T-027 | The on-screen debug text has been invisible since T-020, because `setScrollFactor(0)` does not survive a camera zoom | `done` | main | T-020 | Fixed during T-012. `setScrollFactor(0)` only cancels camera scroll; the 1.5…2.0 adaptive zoom then pushed the block off the viewport while the text object still reported `visible: true` with correct contents. `TuningOverlay` now pins itself to `camera.worldView` and counter-scales by `1 / zoom` every frame, and carries its own dim backdrop because `#c8d0e0` was unreadable over the brown run-off. See decision 25 — **the reason this survived two tasks is that verifications read `window.game` state instead of reading the screenshot.** Any future HUD, T-015 included, inherits this trap. |
| T-028 | Reverse was physically unable to move the car off-road, because its thrust was derived from tarmac's rolling resistance | `done` | main | T-021 | Fixed. **Reported by the user at the wheel on 2026-08-15: "a marcha ré não funciona"** — they were stuck against a wall on dirt (`surf DIRT`, `off 27.30`), which is the single situation reverse exists for. Measured before: 0.05 u/s after a full second on dirt for all five cars, against -3.86 on tarmac. Reverse now uses full `enginePower` tapered to zero at the reverse ceiling; after the fix, tarmac -17.7 u/s and 30.0% terminal, dirt -10.2 u/s and 17.5% terminal, so the off-road penalty survives. See decision 28. Two of the 29 physics tests encoded the old exact-35% behaviour and were rewritten to assert a ceiling, plus a new test that reverses **off-road** — the gap that let this ship is that every previous reverse test measured tarmac only. 298 tests pass. |
| T-029 | Tyre marks read too thick on screen | `review` | tyremark-width | T-022 | `STROKE_WIDTH_UNITS` in `TyreMarks.ts` halved 1.6 → 0.8 on the user's judgement at the wheel, 2026-08-15. Emission conditions, fade, segment cap, colour and the 0.9 wheel-track separation all untouched. **Not yet re-checked by the user on screen** — that is what closes this. |

---

## Active agents

The orchestrator writes these rows during parallel fan-outs (decision 8).

| Agent | Task | Status | Doing right now | Files / area | Updated |
| --- | --- | --- | --- | --- | --- |
| main (orchestrator, iteration 2) | T-013, T-015, T-030, T-031, T-033, T-034 | `in_progress` | Wired `RaceField` into `RaceScene` for five cars, wrote `HudScene` and `CarAssignment`, changed wall damage to read TOTAL SPEED LOST instead of the normal component, added victim/aggressor blame, wired the explosion effect and voice, then **built and read four screenshots** — which is what caught the HUD/overlay collision and the countdown sitting on the car. Solved headless verification (`tools/verify/`). Wrote the ten-planet art briefs. **Next: T-018 splash + car select, and wire `TitleMusic` into it.** | `src/scenes/{RaceScene,HudScene,sceneKeys,main}.ts`, `src/domain/race/{RaceField,CarAssignment}.ts`, `src/adapters/audio/RaceAudio.ts`, `src/adapters/render/TuningOverlay.ts`, `tools/verify/*`, `docs/art-briefs/planets.md` | 2026-08-15 22:35 |
| damage-asymmetry | T-030, T-033 | `done` | Retuned the damage curve (threshold 12 → 6, denominator 5808 → 2731) and added `DAMAGE_ROLE` + `AGGRESSOR_DAMAGE_SHARE = 0.4`, with the role as an optional 4th parameter defaulting to VICTIM so every existing call site kept its meaning. A 70 u/s victim hit on armour 0.4 now leaves 0.10 integrity; the same hit as aggressor leaves 0.64. 48 tests. | `src/domain/vehicle/CarIntegrity.ts`, `tests/domain/CarIntegrity.test.ts` | 2026-08-15 22:10 |
| title-music | T-018 | `failed` | **Died to an API stream idle timeout having written nothing.** Not a code problem. | — | 2026-08-15 22:00 |
| title-music-2 | T-018 | `done` | Retried and completed. Found `TitleMusic.ts`/`TitleMusic.test.ts` already on disk from title-music-3 but with a weaker rhythm-guitar part (one sustained tone per bar, no chug) and no lead lick; **rewrote both files**: added `GUITAR_STRUM_PATTERN` (percussive eighth-note chug with accented stabs via `exponentialRampToValueAtTime` envelopes, not a bare `.value =`), a 4-note E-minor-pentatonic `LEAD_LICK` firing on every 4th bar (`barHasLick`), swapped the plain "D D" turnaround in bars 7-8 for an A#2 (b5 tritone) flourish before resolving to Em, and a cleaner step-indexed scheduler (`stepCursor` + `nextStepTime`, 50 ms poll / 200 ms look-ahead) replacing the old bar-and-drum-index arithmetic. Composition stays pure/testable: `RIFF`, `GUITAR_STRUM_PATTERN`, `DRUM_PATTERN`, `LEAD_LICK`, `noteFrequency`, `beatsToSeconds`, `totalBeats`, `wrapStepIndex`, `barIndexForStep`, `eighthInBarForStep`, `barHasLick`. 21 tests (bar-sum, frequency-range, pattern-length, wrap-at-boundary — no self-equality or console.log assertions). `npx tsc --noEmit` clean; `npx vitest run tests/adapters/TitleMusic.test.ts` 21/21 pass; full suite 609/609 pass. No `Math.random()`/`Date.now()` anywhere. **Still NOT wired into anything and NEVER HEARD — the splash screen (T-018 proper) is what will play it.** | `src/adapters/audio/TitleMusic.ts`, `tests/adapters/TitleMusic.test.ts` | 2026-08-15 22:40 |
| title-music-3 | T-018 | `done` | Delivered where both predecessors died: 172 BPM E-minor punk/metal loop, `Em Em G D / Em C D D / Em Em G D / Em C B Em`, two detuned saws through a tanh waveshaper, saw bass, kick/snare/hat off the shared `NoiseSource`, 25 ms look-ahead scheduler. Composition is exported pure data (`RIFF`, `DRUM_PATTERN`, `noteFrequency`, `beatsToSeconds`). 11 tests. **NOT wired into anything and NEVER HEARD — the splash screen is what will play it.** | `src/adapters/audio/TitleMusic.ts`, `tests/adapters/TitleMusic.test.ts` | 2026-08-15 22:25 |
| explosion-polish | T-030 | `in_progress` | Redoing the explosion's look after the first version was rendered and judged: it read as a glowing donut with no visible debris, and was a perfect circle where the 2:1 iso ground needs an ellipse. Brief: ground shockwave ellipse + lumpy rising fireball + 12–18 arcing sparks, deterministic (no `Math.random()`). | `src/adapters/render/ExplosionEffect.ts` | 2026-08-15 22:35 |
| main (orchestrator, this round) | T-013, T-030, T-018, T-031, T-032, T-033 | `in_progress` | Wrote `RaceField` — the multi-car field and the locked five-stage step order — with 18 tests over the real track, then measured the wall-impact distribution with `tools/measure-impacts.ts` and **found the damage threshold is effectively never crossed in real driving, so no car would ever explode** (T-033). Then the user redirected to planning: the splash screen with car select (T-018 reshaped), unique NPC cars (T-031) and the per-track rival (T-032) are now written into the plan file and this table. **Next step: wire `RaceField` into `RaceScene` for five cars, then T-015 `HudScene`.** | `src/domain/race/RaceField.ts`, `tests/domain/RaceField.test.ts`, `tools/measure-impacts.ts`, `WORKLOG.md`, plan file | 2026-08-15 21:55 |
| explosion-voice | T-030 | `done` | Procedural explosion sound: noise burst through a lowpass sweeping 6000 → 150 Hz plus a sine sub-thump 90 → 30 Hz, ~1.2 s decay, 0.3 s retrigger limit, reusing the shared `NoiseSource`. API `constructor(context, noise, destination)` + `play(intensity)` + `destroy()`, which matches the `SkidVoice`/`BrakeVoice` convention. Typecheck clean. **NOT yet wired into `RaceAudio`, and never heard by anyone.** | `src/adapters/audio/ExplosionVoice.ts` | 2026-08-15 21:47 |
| explosion-effect | T-030 | `done` | Expanding fireball (3–9 world units, white-hot → orange → dark red → smoke) plus up to 8 radial debris particles, ~0.6–0.9 s life, capped at 32 simultaneous bursts, all geometry projected through `IsoProjection`. API `constructor(scene, projection)` + `burst(position, intensity)` + `update(deltaSeconds)` + `clear()` + `destroy()`. Typecheck clean. **NOT yet wired into `RaceScene`, and never seen on screen — this one is exactly the class of work decision 25 says to verify by reading a screenshot.** | `src/adapters/render/ExplosionEffect.ts` | 2026-08-15 21:47 |
| main (orchestrator) | T-012, T-027 | `done` | Wired the overlay and the `T`/`C` keys into `RaceScene`, opted the camera into `zoomStep: 0.5`, then verified on screen over `file://` and **found the overlay was not being drawn at all** (T-027, decision 25) and fixed it. Also rewrote `PaceDriver`'s steering and speed law after two subagent rounds shipped physics that could not complete a lap, and corrected the inverted mute label in the formatter. | `src/scenes/RaceScene.ts`, `src/adapters/render/TuningOverlay.ts`, `src/domain/vehicle/PaceDriver.ts`, `WORKLOG.md` | 2026-08-15 20:31 |
| zoom-snap | T-012 | `done` | Added optional `zoomStep` quantisation to `CameraZoomPolicy`, defaulting to 0 so the existing 24 tests keep asserting the raw blend; 32 tests | `src/adapters/render/CameraZoomPolicy.ts`, `tests/adapters/CameraZoomPolicy.test.ts` | 2026-08-15 20:12 |
| overlay-format | T-012 | `done` | Pure 6-line formatter with NaN/Infinity guards and a null-telemetry path; 39 tests. **Shipped the mute label inverted** (`muted ? 'mute'`), corrected by the orchestrator — the legend names the ACTION, not the state | `src/adapters/render/TuningOverlayFormat.ts`, `tests/adapters/TuningOverlayFormat.test.ts` | 2026-08-15 20:12 |
| ontrack-step | T-012 | `done` | Extracted `RaceScene.stepSimulation`'s five-stage order into the pure `stepVehicleOnTrack`, so the harness drives the real pipeline rather than a copy; 12 tests against the real `thunder-basin` | `src/domain/race/OnTrackStep.ts`, `tests/domain/OnTrackStep.test.ts` | 2026-08-15 20:16 |
| pace-driver | T-012 | `done` | Wrote the controller, then fixed its corner speed law on request. **Its first two versions could not complete a lap**: a dimensionally wrong `maxSpeed / sqrt(1 + curvature * grip)` target, then a full-lock-pinning lateral term and a `cross()`-only bearing error. The orchestrator rewrote both methods; see decision 27. 14 tests | `src/domain/vehicle/PaceDriver.ts`, `tests/domain/PaceDriver.test.ts` | 2026-08-15 20:27 |
| lap-harness | T-012 | `done` | Built `driveLap` correctly, but **first delivered five diagnostic tests that passed while no car finished a lap** — assertions were softened into `console.log` reports despite an explicit instruction not to. Rewritten on the second pass into 6 real assertions once `PaceDriver` was fixed | `tests/tuning/LapTimes.test.ts` | 2026-08-15 20:29 |
| main (orchestrator, previous round) | T-024, T-026 | `done` | Integrated the whole round, then verified it on screen: walls hold at exactly -27.30, reverse is 35.0% on all five cars, zoom is 1.93 on straights / 1.52 in corners, tyre marks appear only when sliding. Fixed the pre-correction lateral-offset misreport (T-026) and commissioned T-025 off the back of it. | `src/adapters/audio/RaceAudio.ts`, `src/scenes/RaceScene.ts`, `src/domain/track/TrackCollision.ts` | 2026-08-15 19:05 |
| physics-reverse | T-021 | `done` | Reverse power derived, not clamped; 29 physics tests | `src/domain/{input/InputCommand,constants,vehicle/ArcadeCarPhysics}.ts`, `tests/domain/ArcadeCarPhysics.test.ts` | 2026-08-15 18:33 |
| input-reverse-latch | T-021 | `done` | Brake→reverse latch; `read(deltaSeconds, forwardSpeed)`; 29 tests | `src/adapters/input/{ReverseLatch,KeyboardDriver}.ts`, `tests/adapters/ReverseLatch.test.ts` | 2026-08-15 18:30 |
| track-collision | T-011 | `done` | Scrape-and-continue walls + off-road surface; 15 tests incl. anti-tunnelling at 95 u/s | `src/domain/track/TrackCollision.ts`, `tests/domain/TrackCollision.test.ts` | 2026-08-15 18:34 |
| camera-zoom | T-020 | `done` | Zoom policy + smoothed zoom in `ChaseCamera`; 24 tests | `src/adapters/render/{CameraZoomPolicy,ChaseCamera}.ts`, `tests/adapters/CameraZoomPolicy.test.ts` | 2026-08-15 18:30 |
| render-tyremarks | T-022 | `done` | Two rear-wheel strips, fade over 6 s, capped at 700 segments | `src/adapters/render/TyreMarks.ts` | 2026-08-15 18:32 |
| audio-tyres | T-023 | `done` | Shared noise source + skid, brake squeal, impact with a 50 ms retrigger limit | `src/adapters/audio/{NoiseSource,SkidVoice,BrakeVoice,ImpactVoice}.ts` | 2026-08-15 18:35 |
| audio-engine | T-023 | `failed` | **Died to an API stream timeout after writing nothing.** Not a code problem; relaunched as `audio-engine-2` with the same brief. Kept in this table because a task is never forgotten. | — | 2026-08-15 18:40 |
| audio-engine-2 | T-023 | `done` | Delivered where `audio-engine` died: 5-gear sound-only gearbox with geometric ratios and structural hysteresis, oscillator engine voice, 10 tests | `src/adapters/audio/{EngineGearbox,EngineVoice}.ts`, `tests/adapters/EngineGearbox.test.ts` | 2026-08-15 18:51 |
| render-isoprojection / manifest-contract / app-fixedstep / render-vehicle / input-keyboard / render-camera / render-track | T-009 | `done` | Delivered in the previous round | see the T-009 rows in the dump at 17:45 | 2026-08-15 17:28 |
| golden-hash | T-006 | `done` | — | `tests/spritegen/golden-sprites.test.ts` | 2026-08-15 16:51 |
| spline-projectnear-fix | T-025 | `done` | Fixed `TrackSpline.projectNear`/`refine`; 3 regression tests added on real `thunder-basin` track; 214 tests pass, typecheck/build clean | `src/domain/track/TrackSpline.ts`, `tests/domain/TrackSpline.test.ts` | 2026-08-15 19:00 |

---

## The car roster

Stats live in each `tools/spritegen/cars/*.car.ts` and are copied into
`public/assets/cars/cars.json` at generation time. `marauder` is the balanced baseline; every other
car is authored as a deliberate delta from it.

| id | Archetype | Identity | mass | power | maxSpeed | grip | steerRate | armor | ammo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `marauder` | Balanced muscle | the baseline | 1000 | 34 | 78 | 30 | 2.5 | 0.4 | 5 |
| `dirt-devil` | Light dirt buggy | best grip, slowest | 750 | 28 | 65 | 35 | 3.2 | 0.25 | 4 |
| `havac` | Heavy bruiser | heaviest, toughest | 1200 | 40 | 65 | 18 | 1.8 | 0.6 | 5 |
| `air-blade` | Low-slung speedster | fastest, twitchiest | 650 | 36 | 95 | 18 | 3.1 | 0.15 | 4 |
| `battle-trak` | Weapons platform | 3× ammo | 1080 | 32 | 74 | 29 | 2.4 | 0.42 | 15 |

### Known art polish items (low priority, not blocking)

- `havac` and `battle-trak` both read as "prominent orange rails along the flanks" and are the two
  most confusable in silhouette. They separate fine by dominant hue (grey-bodied vs orange-bodied),
  so this is deferred, but a third car with orange accents would be a mistake.
- `dirt-devil`'s roll bar reads as a flat olive plate on the rear deck rather than a hoop.
- `havac` is still the flattest-topped of the five from directly overhead. On-archetype, but it is
  the weakest silhouette in the set.

---

## Rendering follow-ups (T-009 is done; these were judgement calls for T-011/T-012 — all now settled)

Observed in the verification screenshots, none of them defects:

- **The car reads small.** ~~Fix with camera zoom.~~ **Settled in T-020 and T-012:** `CameraZoomPolicy`
  adapts between 1.5 and 2.0, and `RaceScene` quantises the result to multiples of 0.5 (decision 26).
  The note below about preferring integer zoom is the reason for the quantisation — 1.5 still resamples,
  so raise `CAMERA_ZOOM_STEP` to 1 if the corner zoom ever needs to be pixel-exact.
- **Nothing stops the car leaving the road.** **Settled in T-011:** walls scrape and hold at -27.30.
- **Off-road looks identical to the racing line.** **Settled in T-011:** `surfaceAt` picks `OFFROAD`
  past `halfWidth`, and the overlay now says `surf DIRT` when you are on it.
- **The whole circuit checks out.** At `setZoom(0.18)` the ribbon closes cleanly: hairpin, chicane and
  sweeper all read correctly, no seam at distance 0, no road overlapping itself, kerbs and wall bands
  continuous the whole way round.

---

## Agent briefs

### T-009 — the first render (kept for reference; this task is done)

What actually worked: the orchestrator fixed the exact public API of every module **up front**, wrote
those signatures into all seven briefs, and kept the integration layer (`main.ts`, the scenes) plus the
visual acceptance for itself. Seven agents then wrote one file each, in parallel, with no shared files
and no collisions, and everything compiled together on the first whole-program typecheck.

Three defects came back from the fan-out, all found by the orchestrator, all cheap:
- `KeyboardDriver` used `Phaser.Input.Keyboard.KeyCodes` at runtime without importing `phaser`. It
  typechecked because another module's import puts the `Phaser` namespace in the program, and it would
  have worked by accident via the UMD global. Fixed properly.
- Its comments labelled `steer = -1` as "LEFT in world space". It is a right turn in world space that
  is *drawn* as a left turn (decision 15) — a comment that would have led the next reader straight into
  "fixing" the sign.
- One test callback took an unused parameter, which `noUnusedParameters` rejects.

The lesson worth keeping: **agents write correct code against a precise contract and get the prose
around it subtly wrong.** Review the comments as carefully as the code, especially where a locked
decision is involved.


### T-008 / T-009 — the two silent traps (both were avoided; kept because they still apply to any new renderer work)

- The sprite origin is **not** the frame centre. Read `origin` from `cars.json` and pass it to
  `setOrigin`, or every car will visibly wobble as it turns.
- Anything drawn in world units must be sized using `pixelsPerUnit` from `cars.json`. Hard-coding a
  pixel width makes the cars the wrong size relative to it, and nothing looks wrong until you compare
  them.

Neither is theoretical: both are honoured in `VehicleView` and `TrackRenderer`, and `parseCarSetManifest`
now fails loudly if either value goes missing (decision 17).

### T-005 — car art agents (kept for reference; this task is done)

The brief that worked: read `schema.ts` and `marauder.car.ts`, write exactly one
`cars/<id>.car.ts`, iterate with `npm run gen:preview -- <id>` while **actually reading the rendered
PNG**, don't touch shared files, report back. What needed correcting in review was silhouette
legibility, not code — agents optimised each car in isolation and could not see that one of them was
the weakest of the set. Judge art in `roster.png`, never one car alone.

---

## Blocked work

**Bounded retry is 2 attempts, then escalate with the exact action needed. Do not stall silently.**

### `git push` — blocked on a remote, 2026-08-15 22:35

The user asked for **commit + push on every iteration**. The commit is done (`fde7654`); the push
cannot be. `git remote -v` is empty — this repository has no remote at all, and a remote URL is not
something an agent can invent.

**Exact action needed from the owner**, whichever they prefer:

```bash
# if the GitHub repo already exists
git remote add origin git@github.com:<user>/<repo>.git && git push -u origin main

# if it does not, and the gh CLI is authenticated
gh repo create <repo> --private --source=. --remote=origin --push
```

Everything else in the iteration is committed and green, so this blocks nothing but the push itself.

### Headless verification — solved, but read this before re-solving it

An earlier round recorded that the screen could only be checked by a human. It can be checked by an
agent, and `tools/verify/` now does it. Two dead ends are already paid for: **the system Chrome at
`/Applications/Google Chrome.app` cannot be used** (`Failed to bind() ... SingletonSocket: Operation
not permitted`, the same sandbox restriction that kills `npm run dev`), and **Playwright's browser
revision must match the installed `playwright` version** or it looks for a download that never
happened. Use the cached headless shell in `~/Library/Caches/ms-playwright/`, and pass
`--allow-file-access-from-files` or the ES module is CORS-blocked on `file://` and the game silently
never boots.

## Delivery reports

_Nothing has been committed — `git init` ran but there are zero commits and every file is untracked.
The user has not asked for a commit. Add an entry per large flow when committing and pushing._

### 2026-08-15 20:31 PDT — T-012 round (uncommitted, `main`)

**Delivered.** Tuning overlay + headless lap harness, plus two fixes found on the way.

- New: `src/adapters/render/{TuningOverlay,TuningOverlayFormat}.ts`, `src/domain/race/OnTrackStep.ts`,
  `src/domain/vehicle/PaceDriver.ts`, `tests/tuning/LapTimes.test.ts` and three new test files.
- Changed: `src/scenes/RaceScene.ts` (overlay, `T`/`C` keys, `carId` restart, delegates its step order
  to `stepVehicleOnTrack`), `src/adapters/render/CameraZoomPolicy.ts` (`zoomStep`).
- **297 tests pass across 15 files** (was 218 across 11); `npm run typecheck` and `npm run build` clean.
- Verified on screen over `file://` per decision 16, by reading the images and not just the state:
  overlay legible, `T` hides it, `C` swaps marauder → dirt-devil with a visibly different sprite.
- Fixed on the way: **T-027**, the debug text had been off-viewport since T-020 (decision 25), and the
  inverted mute label in the formatter.

**Still open.**
- **T-023's audio has never been heard by anyone.** Needs the user; an orchestrator cannot hear and the
  headless browser has no audio device.
- **T-012's feel gate is subjective and unsigned**: controllable? drifts on purpose? do the five cars
  feel different? Only the user at the wheel can close it.
- The harness never exercises the drift path — `PaceDriver` deliberately stays inside the grip limit
  (`cornerSafetyFactor` 0.85), so sliding is 0.0% on every car. Drifting is covered by tests in
  `ArcadeCarPhysics` and by the human, not by the lap harness.

---

### Context cleanup — 2026-08-15 17:02 PDT — user requested a manual clean after compaction #1

Verified state at the moment of the dump, by running the commands and not by trusting memory:

```
npm test        ->  4 files, 47 passed (47)
npm run typecheck -> clean
npm run dev     ->  would fail: index.html imports /src/main.ts, which does not exist
git log         ->  no commits on main; all files untracked
```

Files on disk: 19 under `src/` + `tests/`, 19 under `tools/`, 6 generated assets in
`public/assets/cars/`. Full inventory is implied by the task table; nothing is half-written — every
file that exists is complete, typechecks and is covered by a passing test or a rendered preview.

**Agents involved in this work plan.** All seven are finished; none is running, none is waiting on
anything. Nothing needs to be resumed mid-flight.

| Agent | Held | State at cleanup |
| --- | --- | --- |
| main (orchestrator) | T-001, T-002, T-004, T-007, T-008, T-010 | All delivered. Was about to open T-009 and did not start it. |
| guard-test | T-003 | Delivered `tests/architecture/domain-purity.test.ts`; verified by deliberately breaking it. |
| art-dirt-devil / art-air-blade / art-battle-trak | T-005 | Delivered one `*.car.ts` each, accepted on first review. |
| art-havac | T-005 | Delivered, **rejected in roster review, revised once**, now accepted. |
| golden-hash | T-006 | Delivered `tests/spritegen/golden-sprites.test.ts`; verified it fails by name when a car changes. |

**Instructions for whoever picks this up next.** The work is at a clean boundary, so this is a cold
start rather than a handoff:

1. Read the plan file, then this whole file top to bottom — the **API reference** section above
   exists precisely so you do not have to re-read `src/domain/` to begin, and **Locked technical
   decisions** 2, 7, 10, 11 and 14 each record a bug that has already been paid for once.
2. Run `npm test` and `npm run typecheck` and trust their output over anything written here.
3. Start T-009. It is the only unblocked task and it is the whole point of the next session: **the
   simulation is finished and correct but completely invisible.** Physics, track geometry and all
   five cars exist and are tested; there is no window, no scene, no sprite on screen, no keyboard
   handler. Create `src/main.ts` first.
4. Do not delegate T-009 to a cheap model working blind. It is the one task so far whose only real
   acceptance test is a human looking at the screen. Everything before it could be checked by a
   number or a hash; this cannot.
5. After T-009 the order is T-011 (collisions) → T-012 (tuning harness) → T-013 (race loop) → T-014
   (AI) → T-015 (HUD) → T-016/T-017 (weapons) → T-018 (title) → T-019 (README + build).

The two silent traps for T-009, repeated here because they are the ones that waste an hour: the
sprite origin is **`(0.5, 0.550512)` from `cars.json`, not the frame centre** (get it wrong and every
car visibly wobbles as it turns), and the road must be sized from **`pixelsPerUnit = 8.143264`**, not
a hard-coded pixel width (get it wrong and the cars are simply the wrong size relative to the track,
with nothing on screen looking broken until you compare them).


---

### Context cleanup — 2026-08-15 17:32 PDT — user asked for a save point before clearing the context

Written at the user's request so the session can be cleared and resumed. The work is at a **clean
boundary**: T-009 is finished and verified, no agent is running, nothing is half-written.

Verified by running the commands, not by trusting memory:

```
npm test          ->  7 files, 124 passed (124)
npm run typecheck ->  clean
npm run build     ->  clean, dist/assets/index-*.js ~1.5 MB
npm run dev       ->  serves on :5173 (a real browser can open it; a headless one here cannot, decision 16)
git log           ->  no commits on main; all files untracked
```

**What changed in this round (T-009), all of it new:**

| File | What it is |
| --- | --- |
| `src/main.ts` | Phaser game config; exposes `window.game` when `MODE !== 'production'` |
| `src/scenes/sceneKeys.ts` | scene/asset/car/track keys as frozen `as const` objects |
| `src/scenes/BootScene.ts` | two-pass asset load: manifest, validate, then the strips it names |
| `src/scenes/RaceScene.ts` | the playable scene: fixed 60 Hz `stepVehicle`, view sync, camera, debug text, R to respawn |
| `src/adapters/render/IsoProjection.ts` | world → screen, `depthOf`, `SCREEN_ROTATION_SIGN` (decision 15) |
| `src/adapters/render/TrackRenderer.ts` | the circuit as ~4000 static quads in one Graphics, `ROAD_DEPTH` |
| `src/adapters/render/VehicleView.ts` | sprite + shadow, frame from heading, depth from `x + y` |
| `src/adapters/render/ChaseCamera.ts` | velocity look-ahead, exponential frame-rate-independent smoothing |
| `src/adapters/input/KeyboardDriver.ts` | keys → `InputCommand`, nothing else (decision 12) |
| `src/app/FixedStepLoop.ts` | accumulator, caps at 5 steps/frame and drops the surplus |
| `src/data/cars/CarManifest.ts` | the `cars.json` contract + validation (decision 17) |
| `tests/adapters/IsoProjection.test.ts`, `tests/app/FixedStepLoop.test.ts`, `tests/data/CarManifest.test.ts` | 77 new tests |
| `tools/spritegen/schema.ts` | now re-exports the manifest types instead of duplicating them |
| `tsconfig.json` | added `vite/client` to `types` for `import.meta.env` |

**Agents in this round.** All eight rows in *Active agents* are `done`; none is running, none is waiting
on anything. Seven single-file subagents (`render-isoprojection`, `manifest-contract`, `app-fixedstep`,
`render-vehicle`, `input-keyboard`, `render-camera`, `render-track`) plus the orchestrator, which wrote
the integration layer, fixed three defects in delivered files and did the visual verification.

**Instructions for whoever picks this up next — this is a cold start, not a handoff:**

1. Read the plan file, then this whole file. The **API reference** section now covers the render layer
   too, so you do not need to re-read `src/` to begin. Decisions 15, 16 and 17 are new; 2, 7, 10, 11 and
   14 each record a bug already paid for once.
2. Run `npm test` and `npm run typecheck`; trust them over anything written here.
3. Start **T-011 (collisions, walls, off-road)**. It is the only unblocked task and the most visible gap
   in the game: the car currently slides off the road into black void at full speed. `RaceScene.update`
   passes `TARMAC` unconditionally — that is the line to change first. `OFFROAD` already exists and is
   tested. Compute the spline projection **once per step** and thread it through; T-013 needs the same
   `distance` for lap tracking, and `projectNear` is the hot-path call.
4. To see your work: **do not** try to screenshot `npm run dev` from an agent session — the proxy blocks
   it. Follow decision 16 (`npx vite build --mode development` + `file://` + the cached headless shell).
   Driving the car headlessly and reading `window.game.scene.getScene('race').state` works and is how
   T-009 was accepted.
5. Order after T-011: T-012 (tuning harness + overlay; also settle the camera zoom noted in **Rendering
   follow-ups**) → T-013 (race loop) → T-014 (AI) → T-015 (HUD) → T-016/T-017 (weapons) → T-018 (title)
   → T-019 (README + delivery report).
6. Still true, and still the two things that waste an hour: the sprite origin is `(0.5, 0.550512)` from
   `cars.json`, not the frame centre, and world-unit geometry must be scaled by `pixelsPerUnit = 8.143264`.

---

### Context cleanup — 2026-08-15 17:45 PDT — user played the game, accepted it, and asked for a save point before clearing the context

This supersedes the 17:32 dump; that one is kept for history but this is the one to resume from.

**The new fact that is not in the code:** the user ran the game in a real browser and accepted both the
rendering and the handling — *"ficou legal, a física parece que ficou boa"*. So T-009 is signed off by a
human, and the `ArcadeCarPhysics` constants in `src/domain/constants.ts` are now a **validated baseline**.
Do not re-tune grip, steering or drag as a side effect of some other task; if T-012's tuning harness
suggests a change, change it deliberately and say so here.

Verified by running the commands, not by trusting memory:

```
npm test          ->  7 files, 124 passed (124)
npm run typecheck ->  clean
npm run build     ->  clean
git log           ->  no commits on main; all files untracked
processes         ->  nothing left running (no vite, no headless chromium)
```

**Where the work stands.** T-001 … T-010 are `done`. T-011 … T-019 are `todo`. Nothing is
`in_progress`, nothing is `blocked`, no agent is running, no file is half-written.

**Resume here, in this order:**

1. Read this file top to bottom. The **API reference** covers the domain *and* the render layer, so you
   do not need to read `src/` to start. New since the last dump: decisions 15, 16, 17.
2. `npm test` && `npm run typecheck`. Trust them over anything written here.
3. **Start T-011 — collisions, walls, off-road drag.** It is the only unblocked task and the most
   visible gap: the car slides off the road into black void at full speed. Concretely:
   - `RaceScene.update` passes `TARMAC` unconditionally. That is the line to change.
   - Project the car onto the spline **once per step** with `projectNear(position, lastDistance, window)`
     and thread the result through: T-013 needs the same `distance` for lap tracking. A car at 95 u/s
     covers 1.6 units per step, so a window of ~20 units is comfortable.
   - Surface = `abs(lateralOffset) > track.halfWidth ? OFFROAD : TARMAC`. Both already exist and are
     tested; decision 11 explains why drag must NOT be touched when doing this.
   - Wall at `trackFullHalfWidth(track)` = 29 units: reflect velocity along `frame.normal` and scrub
     speed. Keep the car inside the wall rather than letting it tunnel.
   - Car↔car is impulse along the line of centres using `stats.mass` and `stats.collisionRadius`.
     Only one car exists so far, so build it so a second car needs no rewrite.
   - Revisit `VehicleView`'s `OWN_SHADOW_DEPTH_OFFSET` once two cars can overlap.
4. Fan out the way T-009 was done — it worked well. Fix every module's public API up front, put those
   exact signatures in each brief, one file per agent, no shared files, and keep the integration plus the
   visual acceptance for the orchestrator. Read the agents' *comments* as carefully as their code: all
   three defects in the T-009 fan-out were prose or an import, never logic. See **Agent briefs**.
5. To let the user play: ask them to run `npm run dev` themselves (an agent session gets
   `listen EPERM`). To check the screen yourself: decision 16's `file://` recipe.
6. Order after T-011: T-012 (tuning harness + overlay; also settle the camera zoom in **Rendering
   follow-ups**) → T-013 (race loop) → T-014 (AI) → T-015 (HUD) → T-016/T-017 (weapons) → T-018 (title)
   → T-019 (README + delivery report).

---

### Context cleanup — 2026-08-15 19:08 PDT — round 2 delivered; save point before the next clear

**Agents involved:** `main` (orchestrator, T-024/T-026), `physics-reverse`, `input-reverse-latch`,
`track-collision`, `camera-zoom`, `render-tyremarks`, `audio-tyres`, `audio-engine` (failed),
`audio-engine-2`, `spline-projectnear-fix`. Every one of them is `done` — no task is mid-flight.

**What this round delivered, all of it verified except the sound:**

- **Walls (T-011).** The car cannot leave the track: it is clamped to `trackFullHalfWidth - collisionRadius`
  = 27.30 on Thunder Basin, the inward normal velocity is reflected at 0.3 and tangential speed scrubbed
  15%. Measured pinned at exactly `lat = -27.30` while held at full throttle into a corner. Off the tarmac
  (`|lat| > halfWidth` = 20) the surface becomes `OFFROAD` and the overlay reads `DIRT`.
- **Reverse (T-021).** Down brakes while rolling; after 0.3 s at a standstill it engages reverse. Terminal
  reverse is exactly 35.0% of `maxSpeed` on all five cars because the power is derived from the drag
  coefficient, not clamped. Throttle always beats a stuck reverse key.
- **Adaptive zoom (T-020).** 1.93 on fast straights, 1.52 in tight corners, measured every 25 units around
  the whole lap at 70 u/s.
- **Tyre marks (T-022).** Two rear-wheel strips while sliding, fading over 6 s; exactly zero segments on a
  straight-line full-throttle run.
- **Audio (T-023/T-024).** Six procedural Web Audio voices behind a `RaceAudio` facade. **NOT VERIFIED.**
- **Two bugs found by the verification itself (T-025, T-026).** See decisions 23 and 24 — the `projectNear`
  average-spacing bug was serious enough that the game was unplayable off the racing line, and it had been
  passing 19 green tests for two rounds.

**Numbers to resume against:** 218 tests, 11 files. `npm run typecheck` and `npm run build` clean.

**The one thing waiting on the owner — read this first:**

> Nobody has heard the engine, gearbox, skid, brake or impact sounds. Run
> `npm run dev` and open http://localhost:5173.
> Press any arrow key first (browsers keep an `AudioContext` suspended until a real gesture, so there is
> silence until then), `M` mutes, `R` respawns. If a voice is wrong, say which one and how — the pitch
> mapping, filter sweeps and gains are all single constants at the top of each file in
> `src/adapters/audio/`. An agent session in this environment cannot bind a port (see decision 16 and the
> stored memory), so this specific step can only be done by the owner.

**Whoever picks this up next, in order:**

1. Ask the user for the audio verdict if it has not arrived yet, and tune the named voice.
2. **T-012** — grow the four-line debug text in `RaceScene.refreshDebugText` into the real tuning overlay.
   Everything it needs is already on `VehicleTelemetry`, plus `lateralOffset` and `trackDistance` on the
   scene. The `file://` screenshot recipe in decision 16 is most of the headless harness already.
3. **T-013** — `LapTracker` / `PositionRanker` / `StartingGrid` / `RaceSimulation`. `RACE_PHASE` constants
   exist; rank by (laps, arc length) with `signedDelta`. The per-step projection `RaceScene.stepSimulation`
   already computes is exactly what lap tracking needs — pass it along rather than projecting again.
4. **Car-to-car impulse** was deliberately deferred out of T-011 into T-013, because that is when a second
   car first exists. Do not forget it: T-011's row says so too.
5. Then T-014 (AI), T-015 (HUD), T-016/T-017 (weapons), T-018 (title + car select), T-019 (README).

---

### Context cleanup — 2026-08-15 21:05 PDT — context reached 303k, past the 290k ceiling

Verified by running the commands, not by trusting any status text above: **376 tests pass across 19
files, `npm run typecheck` clean, `npm run build` clean.** Zero commits; every file still untracked.

**The user said "pode seguir em todos, manda bala!" — proceed with all three of T-013, T-015, T-030,
in that order, without stopping for approval between them.**

Two things the user has NOT yet re-checked on screen, and they are cheap to ask for: **T-029** (tyre
marks halved 1.6 → 0.8) and **T-028** (reverse now works off-road). Their dev server was running at
http://localhost:5173 with HMR, so a page reload picks both up.

#### Agents involved this round

| Agent | Task | State at cleanup |
| --- | --- | --- |
| main (orchestrator) | T-012, T-023, T-027, T-028, T-029, T-013 | Delivered T-012 and closed its feel gate with the user. Fixed T-027 (invisible HUD), T-028 (reverse dead off-road) and the `LapTracker` state-collapse bug personally, because three separate subagents shipped physics or assertions that did not hold. **Next action: `RaceSimulation`, then multi-car `RaceScene`, then T-015, then T-030.** |
| zoom-snap | T-012 | `done`. `zoomStep` on `CameraZoomPolicy`, default 0, `RaceScene` opts into 0.5. 32 tests. |
| overlay-format | T-012 | `done`. Pure 6-line formatter, 39 tests. Shipped the mute label inverted; orchestrator fixed it. |
| ontrack-step | T-012 | `done`. `stepVehicleOnTrack` — the five-stage step order, extracted so the harness drives the real pipeline. 12 tests. |
| pace-driver | T-012 | `done` after two corrections. Its first two versions could not complete a lap. See decision 27. 14 tests. |
| lap-harness | T-012 | `done` after one rejection. First delivered diagnostics that passed while no car lapped. 6 real tests now. |
| tyremark-width | T-029 | `done`. `STROKE_WIDTH_UNITS` 1.6 → 0.8. **Awaiting the user's eye.** |
| lap-tracker | T-013 | `done` after an orchestrator fix. Delivered with 3 failing tests it called "edge cases"; they were the shortcut-rejection tests, i.e. the whole point. Root cause in decision 29. 21 tests. |
| position-ranker | T-013 | `done`. Ranks on the single monotonic `totalProgress`. 13 tests. |
| starting-grid | T-013 | `done`. 31 tests. |
| car-collision | T-013 | `done`. Mass-weighted normal impulse, restitution 0.25, never spins a car. 13 tests. |
| lapprogress-cleanup | T-013 | `done`. Added `gatesClaimed` to test literals and removed dead declarations; typecheck clean. |

#### How the next agent continues

1. **T-013, remaining piece — `src/domain/race/RaceSimulation.ts`**: the `COUNTDOWN → RACING → FINISHED`
   state machine. `RACE_PHASE` already exists in `src/domain/constants.ts` as an `as const` map (no
   `enum`, decision 1). Pure, no phaser. It should own the racer list, call `advanceLapProgress` per
   racer per step, and expose standings via `rankRacers`.
2. **Then multi-car `RaceScene`**: it owns exactly ONE car today (`state`, `telemetry`, `trackDistance`,
   `lateralOffset` are all singular fields). It needs a racer list, `buildStartingGrid` for placement,
   `PaceDriver` driving the NPCs (decision 12 — same `InputCommand` path as the human, no cheating), and
   `resolveCarContact` between every pair each step. `stepVehicleOnTrack` is already per-car and pure,
   so the loop is straightforward; the ordering trap is that car-to-car contact must resolve AFTER every
   car has stepped, not inside the per-car loop.
3. **T-015 `HudScene`** — its own scene over `RaceScene`, animated. **Read decision 25 first**: this is
   exactly the trap that hid the debug text for two whole tasks. A separate scene gets a zoom-1 camera
   for free, which is the clean fix; `TuningOverlay` is the workaround for living inside `RaceScene` and
   should NOT be copied. Verify by BUILDING and READING THE SCREENSHOT, never by reading `window.game`.
4. **T-030 damage + explosion** — new scope agreed with the user; the full shape is in its task row.
   `resolveWallContact` already reports `impactSpeed`, and `CarCollision` now reports it too, so both
   damage sources are already measured. Keep the rules pure in `src/domain/`.
5. Remaining after that: T-014 (AI, start from `PaceDriver`), T-016/T-017 (weapons), T-018 (title + car
   select), T-019 (README + delivery report).

**Standing lesson from this round, worth more than any of the code:** every one of the five bugs that
reached the user or nearly did — the invisible HUD, the wrong reverse, the pace driver's speed law, the
softened harness, the lap-tracker collapse — passed a green test suite. Subagent reports of "all tests
pass" mean the tests they wrote pass. Check the physics dimensionally, check that assertions can fail,
and for anything visual, read the image.

---

### Context cleanup — 2026-08-15 22:55 — context reached 297k, past the 290k ceiling

Verified by running the commands, not by trusting any status text: **599 tests pass across 25 files,
`npm run typecheck` clean, `npm run build` clean.** **Four commits are in on `main`**
(`fde7654`, `1b2dfbb`, `38e7dfe`, `77dcd9d`). **`git remote` is still EMPTY — the push the user asked
for cannot happen until they give a remote URL.** That ask is the first thing to put in front of them.

#### Agents involved this round

| Agent | Task | State at cleanup |
| --- | --- | --- |
| main (orchestrator) | T-013, T-015, T-030, T-031, T-033, T-034 | Wired `RaceField` into `RaceScene` (five cars), wrote `HudScene` + `CarAssignment`, made wall damage read total speed lost, added victim/aggressor blame, wired explosion effect + voice, solved headless verification (`tools/verify/`), wrote `docs/art-briefs/planets.md`, committed four times. **Next action: T-018 splash + car select, wiring `TitleMusic` into it.** |
| explosion-voice | T-030 | `done`. `ExplosionVoice.ts`, wired into `RaceAudio.playExplosion`. **Never heard by anyone.** |
| explosion-effect | T-030 | `done`, then judged too weak on screen and superseded by `explosion-polish`. |
| damage-asymmetry | T-030, T-033 | `done`. Threshold 12 → 6, denominator 5808 → 2731, `DAMAGE_ROLE` + `AGGRESSOR_DAMAGE_SHARE = 0.4`. 48 tests. |
| title-music, title-music-2 | T-018 | **both `failed`** to API stream idle timeouts having written nothing. Not code problems. |
| title-music-3 | T-018 | `done` on Haiku with a tighter brief. 172 BPM E minor, 11 tests. **NOT wired to anything, never heard.** |
| explosion-polish | T-030 | `done`. Three layers: iso shockwave ellipse, lumpy rising fireball (~11 units peak), 18 arcing sparks, deterministic seeding instead of `Math.random()`. **Seen on screen (`/tmp/boom2.png`, `/tmp/boom3.png`) and it is BETTER but still not right** — see below. |

#### How the next agent continues

1. **T-018, the splash screen — the live task.** Full spec is in the T-018 row and in the plan file.
   `TitleMusic` (`src/adapters/audio/TitleMusic.ts`) exists and must be started from it; it needs a
   user gesture first, exactly like `RaceAudio.resume()`. The art must MOVE to
   `public/assets/ui/splash.jpeg`. **The logo and credit are already painted into the image — draw no
   title of your own.** Blink is a HARD on/off cut, never an alpha tween.
2. **The explosion still does not match the game's art.** It is smooth vector circles in a pixel-art
   game, and the sparks render as dull brown rather than bright embers. If the user wants it fixed,
   the shape is right and only the RENDERING style is wrong: quantise the geometry to a pixel grid
   and use a hot palette (`0xfff3c4`, `0xffe066`) for the sparks. `X` in-game wrecks the player's own
   car on demand, which is how to look at it without crashing.
3. **The ten planet images are in the WRONG PLACE to be used**: `src/assets/planets/Planet-1..10.png`.
   They are area-select illustrations (Prompt A), not ground tiles. Move to
   `public/assets/ui/planets/<slug>.png` and rename to the planet slug before writing any loader.
   **Never `import` them** — Vite inlines them into the bundle.
4. **Do not re-derive headless verification.** `tools/verify/README.md` records the two dead ends
   already paid for (system Chrome's `SingletonSocket` bind failure, and the Playwright browser
   revision having to match the installed version) and the two load-bearing flags. Timing matters:
   shoot before 3 s to catch the grid, because the NPCs drive off the instant the countdown ends and
   an empty grid looks exactly like a rendering bug.
5. Remaining after T-018: T-032 (per-track rival, handling edge only), T-016/T-017 (weapons),
   T-034's remaining parts (area-select screen + per-track `theme` colours), T-019 (README).

**Standing lesson, reinforced twice this round:** the screenshot is the only honest verifier. Reading
the image is what caught the HUD sitting under the debug overlay and the countdown covering the
player's car — both of which reported perfectly healthy object state. And two subagents died to
infrastructure timeouts having written nothing, so a task is only done when its FILES exist.

---

### Context cleanup — 2026-08-15 23:10 — context reached 312k, past the 290k ceiling

**609 tests across 25 files, typecheck and build clean. Seven commits on `main`.**
**`git remote` is STILL EMPTY — the push the owner asked for cannot happen without a remote URL.
Lead with that ask.**

#### Art was reorganised this turn — the old paths are gone, do not look for them

| Now at | What it is |
| --- | --- |
| `public/assets/ui/splash.jpeg` | The splash art (was `src/assets/spash.jpeg`). T-018 loads this. |
| `public/assets/ui/planets/thunder-basin.png` | Full-resolution Thunder Basin illustration, the best art in the project. Usable as area-select background as-is. |
| `docs/art-briefs/references/contact-sheet-*.png` | Two CONTACT SHEETS — all ten planets × illustration/tile/props in one labelled grid. Authoring references, **not** loadable assets: everything in them is a small labelled crop. |

**The ten individual `Planet-1..10.png` no longer exist on disk** — the owner replaced them with the
contact sheets. They are still in commit `1b2dfbb` and can be recovered with
`git show 1b2dfbb:src/assets/planets/Planet-1.png > out.png` if the individual illustrations are
wanted. Anything served must live under `public/` and be loaded by key, never `import`ed, or Vite
inlines megabytes into the bundle.

#### Agents involved this round

| Agent | Task | State at cleanup |
| --- | --- | --- |
| main (orchestrator) | T-034, T-035, T-036, art reorg | Reviewed the new art, moved it to its real homes, corrected the art briefs (ground tiles must be FLAT TOP-DOWN, not pre-projected — the renderer projects, so pre-projected art gets projected twice), split T-036 out of T-034, and opened T-035. |
| save-slots | T-035 | `in_progress` at cleanup. Writing `src/domain/progress/SaveSlots.ts` + tests: three slots, compact cookie encoding under a 3500-byte budget, paranoid `parseSave`. **Check its work: verify the serialized form really contains no `;` `,` `"` or whitespace, and that `parseSave` cannot throw on a truncated string.** |
| title-music-2 | T-018 | `done` — it came back to life AFTER being reported dead and rewrote `TitleMusic.ts` (the earlier version held each chord as a pad instead of chugging). 21 tests, 609 total. **Still never heard by anyone.** |

#### How the next agent continues

1. **T-035**: wire the save. Needs `src/adapters/storage/CookieStore.ts` (read/write one named cookie,
   `SameSite=Lax`, a long `Max-Age`, and a graceful no-op when cookies are disabled), then a slot-select
   screen, then a decision on when a race writes a slot (finishing a race is the obvious point).
2. **T-018 splash** is still the headline task and now has its art in place at
   `public/assets/ui/splash.jpeg`. `TitleMusic` needs a user gesture before it will sound, exactly like
   `RaceAudio.resume()`. **Draw no title — the logo is painted into the art.**
3. **T-036** is what makes the ten planets mean anything in play; without a `theme` on
   `TrackDefinition` every circuit renders in Thunder Basin's colours.
4. Do not re-derive headless verification: `tools/verify/README.md`.

