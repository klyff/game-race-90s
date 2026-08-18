# Graph Report - game-race-90s  (2026-08-17)

## Corpus Check
- 381 files · ~84,808,744 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2870 nodes · 7415 edges · 165 communities (137 shown, 28 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e95a4c1a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- 20 REGULARS — every planet
- IsoProjection.ts
- CarPerk.test.ts
- SplashAttract.ts
- TrackRenderer.ts
- vec2
- RaceAudio.ts
- TrackSpline.ts
- scripts
- Circuitos
- TrackSpline
- RaceScore.ts
- fromAngle
- RaceScene
- ProgressStore.ts
- fit-redrawn.ts
- Pilotos
- compilerOptions
- renderCar.ts
- MusicScore.ts
- import-fleet.ts
- planetMusic.ts
- SCENE_KEY
- constants.ts
- generate-metal-scraps.ts
- Clock — 32 poses
- analyzeTrackCameras.ts
- color.ts
- PlannedClip
- geometry.ts
- strip-fit.ts
- generate-weapons.ts
- RaceAudio
- Vec2.ts
- GarageScene.ts
- PauseScene
- EngineVoice
- TitleAudio
- fleet.ts
- HudFormat.ts
- generate-planet-select.ts
- ResultsScene
- pack-redrawn.ts
- MusicPlayer
- WORKLOG — concurrence-gamming
- API reference for whoever picks this up
- generate-ground-tiles.ts
- Art briefs — the ten planets (T-034)
- Handoff — Claude team, 2026-08-16 ~05:00
- EngineGearbox
- MISSION
- GarageScene
- ImpactVoice
- SeasonPoints.ts
- Delivery reports
- Decisões de design (arcade, não real)
- ReverseLatch
- RaceField
- New tasks opened 2026-08-16 by the owner (T-043..T-047)
- Final handoff — 2026-08-16 01:05 — the owner called the end of the session ("logo vao acabar os tokens")
- PlanetSelectScene.ts
- NarratorPlayer
- vercel.json
- Context cleanup — 2026-08-16 00:25 — context reached 344k, past the 290k ceiling
- Context cleanup — 2026-08-16 00:55 — context reached 312k, past the 290k ceiling
- RacingAgent.ts
- domain-purity.test.ts
- Verification helpers — seeing the game with your own eyes
- Context cleanup — 2026-08-15 23:40 — the owner is clearing the session to start clean
- Context cleanup — 2026-08-15 23:55 — the owner stopped implementation and asked for a save point
- Context cleanup — 2026-08-16 00:05 — the owner is clearing the session
- trackgen/generate.ts
- BootScene.ts
- Context cleanup — 2026-08-15 23:10 — context reached 312k, past the 290k ceiling
- circuit-maps.ts
- drive.mjs
- probe.mjs
- screenshot.mjs
- .create
- VehicleTelemetry
- CameraZoomPolicy.ts
- MetalScrapEffect.ts
- CarStatBars.test.ts
- IsoProjection
- HudScene
- NarratorBank.ts
- NarratorPlan.ts
- Iso car strip
- Wallet.ts
- TyreMarks
- ExplosionEffect
- RaceField.ts
- Music brief — 10 original race beds
- spritegen/preview.ts
- DriverProfile.ts
- RaceSimulation.ts
- trackgen/preview.ts
- CarManifest.ts
- NarratorDirector
- TourMode.ts
- Sprite-strip
- sprite-strip/SKILL.md
- RivalAgent.ts
- Game sprint sprites 2D
- GuitarSolo.ts
- Carros novos — deixa os heróis aqui
- TrackLines.ts
- car-1 — Marauder
- Uso — melhor forma
- car-1/README.md
- redrawn/README.md
- MetalScrapEffect
- generate-lab.ts
- Clock — 32 poses
- Collision — one square, midpoint
- CATALOG.md
- CameraPreset.ts
- MismatchedProfiles.test.ts
- Regras — tira de relógio (car-1)
- TrackSelectScene
- car-1 — Marauder
- RaceScene.ts
- Clock — 32 poses
- CLAUDE.md
- LEIA-ME.md
- PLAN.md
- UtilityEvaluator.ts
- FixedStepLoop
- SevenSegment.test.ts
- PlanetSelectScene
- OpponentMemory.ts
- CameraDirector.ts
- WatchField.ts
- .drawWeapons
- LapTimes.test.ts
- Intercept.ts
- TrajectoryPlanner.ts
- RivalTraits.ts
- NarratorDirector.ts
- Coast.ts
- MenuController
- SpeedoGauge.ts
- HudScene.ts
- Isometric cam man — numbers
- ResultsScene.ts
- PilotRoster.ts
- PLANETS
- HelpScene
- CameraImpulse
- TrackCameras.ts
- PubBackgrounds.ts
- HitRewardEffect
- Game jornal
- DriverCards.ts
- AiOverlayFormat.test.ts
- UiPlaque.ts
- Final handoff — 2026-08-16 ~01:40 — Cursor session (Grok) picked up from the 01:05 Claude handoff
- AccidentWatch
- JOURNAL
- SUMMARY.md

## God Nodes (most connected - your core abstractions)
1. `vec2` - 92 edges
2. `GarageScene` - 71 edges
3. `RaceScene` - 70 edges
4. `TrackSpline` - 68 edges
5. `RaceField` - 57 edges
6. `scale()` - 56 edges
7. `add()` - 51 edges
8. `VehicleStats` - 44 edges
9. `VehicleState` - 35 edges
10. `fromAngle()` - 34 edges

## Surprising Connections (you probably didn't know these)
- `main()` --indirect_call--> `findTrack()`  [INFERRED]
  tools/trackgen/preview.ts → src/data/tracks/registry.ts
- `candidateAtGap()` --calls--> `vec2`  [EXTRACTED]
  tests/domain/Slipstream.test.ts → src/domain/math/Vec2.ts
- `Chosen` --references--> `TrackDefinition`  [EXTRACTED]
  tools/trackgen/generate.ts → src/domain/track/TrackDefinition.ts
- `RenderedCar` --references--> `CarSheetManifest`  [EXTRACTED]
  tools/spritegen/renderCar.ts → src/data/cars/CarManifest.ts
- `getCarStats()` --calls--> `parseCarSetManifest()`  [EXTRACTED]
  tests/domain/OnTrackStep.test.ts → src/data/cars/CarManifest.ts

## Import Cycles
- None detected.

## Communities (165 total, 28 thin omitted)

### Community 0 - "20 REGULARS — every planet"
Cohesion: 0.07
Nodes (29): 10. KIRA, 11. SNAKE, 12. RIO, 13. JETT, 14. NOVA, 15. CRUZ, 16. ASH, 17. ZARA (+21 more)

### Community 1 - "IsoProjection.ts"
Cohesion: 0.42
Nodes (5): SCREEN_ROTATION_SIGN, ISO_X, ISO_Y, ISO_Z, Projected

### Community 2 - "CarPerk.test.ts"
Cohesion: 0.07
Nodes (42): FIELDS, planningCapabilities(), planningStats(), StatNormalizer, HOME_WORLD_STAT_BONUS, applyImpactDamage(), applyWeaponDamage(), CarCondition (+34 more)

### Community 3 - "SplashAttract.ts"
Cohesion: 0.06
Nodes (47): BlinkClock, CARD_FLIP_SECONDS, CARD_GAP_SECONDS, CARD_GROW_FADE_SECONDS, CARD_GROW_SCALE, CARD_SEQUENCE_DELAY_SECONDS, cardBeatSeconds(), cardStartAt() (+39 more)

### Community 4 - "TrackRenderer.ts"
Cohesion: 0.24
Nodes (8): propHash(), sampleCenterline(), ScreenBounds, shade(), TrackRenderer, TrackRendererOptions, PlanetTheme, TrackFrame

### Community 5 - "vec2"
Cohesion: 0.10
Nodes (22): BURN_COLORS, BurnBlotch, BurnMark, Burst, BurstOptions, ExplosionEffectOptions, FIREBALL_COLORS, METAL_COLORS (+14 more)

### Community 6 - "RaceAudio.ts"
Cohesion: 0.14
Nodes (17): isAudioMuted(), setAudioMuted(), BedPlayer, clearLoadedMusicBeds(), loaded, loadedMusicBeds(), markMusicBedLoaded(), pickLoadedMusicBed() (+9 more)

### Community 7 - "TrackSpline.ts"
Cohesion: 0.11
Nodes (33): AgentTickInput, InputCommand, cross(), offsetAt(), RacingLine, trackSurfaceGrip(), TrackProjection, AI_DEFAULT_AGGRESSION (+25 more)

### Community 8 - "scripts"
Cohesion: 0.04
Nodes (47): dependencies, phaser, description, devDependencies, pngjs, @types/pngjs, typescript, vite (+39 more)

### Community 9 - "Circuitos"
Cohesion: 0.05
Nodes (41): Ash Reach, Ash Reach I, Ash Reach II, Ash Reach III, Bogmire Deep, Bogmire Deep I, Bogmire Deep II, Bogmire Deep III (+33 more)

### Community 10 - "TrackSpline"
Cohesion: 0.09
Nodes (30): distanceSquared(), stepVehicleOnTrack(), buildLineCandidates(), clamp(), TrackSpline, nextCornerMarks(), carSetManifest, carsJsonPath (+22 more)

### Community 11 - "RaceScore.ts"
Cohesion: 0.47
Nodes (7): clamp01(), computeRaceScore(), POSITION_WEIGHT, positionFraction(), RaceScoreInput, TIME_WEIGHT, timeFraction()

### Community 12 - "fromAngle"
Cohesion: 0.13
Nodes (30): dot(), fromAngle(), normalize(), perpendicularLeft(), subtract(), aggressorOf(), computeRawDraft(), DraftCandidate (+22 more)

### Community 14 - "ProgressStore.ts"
Cohesion: 0.12
Nodes (43): activateSlot(), activeSlotIndex(), beginSlot(), CLEAR_POSITION, creditWallet(), debitWallet(), equipCar(), loadActiveName() (+35 more)

### Community 15 - "fit-redrawn.ts"
Cohesion: 0.08
Nodes (55): chroma(), isInkBlack(), isPaper(), luma(), main(), nearest(), parseArgs(), poseBudget() (+47 more)

### Community 16 - "Pilotos"
Cohesion: 0.06
Nodes (31): Agent (derivado do mesmo seed), ALINE, ASH, BLAZE, CRUZ, DAVE, DIEGO, Driver Personality (+23 more)

### Community 17 - "compilerOptions"
Cohesion: 0.07
Nodes (28): DOM, DOM.Iterable, ES2022, src, tests, tools, vite/client, vitest/globals (+20 more)

### Community 18 - "renderCar.ts"
Cohesion: 0.13
Nodes (30): CAR_SPRITE_FRAME_ARC, bestCollisionBox(), collisionBoxForCarId(), collisionBoxFromDef(), FLEET_MODEL_ID, rounded(), withCollisionBox(), buildFaces() (+22 more)

### Community 19 - "MusicScore.ts"
Cohesion: 0.14
Nodes (26): clampUnit(), barCount(), barHasLick(), barIndexForStep(), BEATS_PER_BAR, beatsToSeconds(), ChordStep, eighthInBarForStep() (+18 more)

### Community 20 - "import-fleet.ts"
Cohesion: 0.24
Nodes (16): cellBounds(), contentBox(), contentRowRange(), extractFrame(), importCar(), isContent(), main(), ORIGIN (+8 more)

### Community 21 - "planetMusic.ts"
Cohesion: 0.10
Nodes (20): ASH_REACH_SCORE, BOGMIRE_DEEP_SCORE, CHROME_VERGE_SCORE, CRYO_HOLLOW_SCORE, DOUBLE_KICK_DRUM, everyPlanetHasMusic(), FERRO_RUST_SCORE, HEAVY_STRUM (+12 more)

### Community 22 - "SCENE_KEY"
Cohesion: 0.21
Nodes (9): controlBlock(), ControlRow, formatHelpBody(), MENU_CONTROLS, RACE_DRIVE_CONTROLS, RACE_SYSTEM_CONTROLS, RACE_WEAPON_CONTROLS, HelpSceneData (+1 more)

### Community 23 - "constants.ts"
Cohesion: 0.25
Nodes (14): CAR_PERK, PALETTE_ROLE, SIMULATION_HZ, airBlade, airBoat, battleTrak, delorean, dirtDevil (+6 more)

### Community 24 - "generate-metal-scraps.ts"
Cohesion: 0.21
Nodes (15): chunk(), crc32(), drawScrap(), EDGE, emptyFrame(), encodePng(), fillPoly(), fillRect() (+7 more)

### Community 25 - "Clock — 32 poses"
Cohesion: 0.18
Nodes (7): Claude Code — desenhar um carro (tira de relógio), Anchors (draw these first), Clock — 32 poses, Full table, Lights and parts by yaw, Size — fixed world, not fill-the-cell, Handoff — modelo X → tira de relógio

### Community 26 - "analyzeTrackCameras.ts"
Cohesion: 0.11
Nodes (21): TRACKS, analyzeTrackCameras(), classify(), collectSegments(), countTriggers(), RawSegment, referenceZoomOut50(), SampleKind (+13 more)

### Community 27 - "color.ts"
Cohesion: 0.11
Nodes (18): SHADE_STEP, ShadeStep, clampByte(), parseHex(), quantize(), RAMP_FACTORS, RampTable, ResolvedPalette (+10 more)

### Community 28 - "PlannedClip"
Cohesion: 0.13
Nodes (11): PlannedClip, NarratorOffer, ScheduledBanter, NARRATOR_MAX_SEQUENCE, NARRATOR_PRIORITY, NarratorPriority, NarratorQueue, A (+3 more)

### Community 29 - "geometry.ts"
Cohesion: 0.24
Nodes (12): PaletteRole, cross(), dot(), Face, length(), prismFaces(), sectionCorners(), sub() (+4 more)

### Community 30 - "strip-fit.ts"
Cohesion: 0.39
Nodes (6): Box, boxFromPoses(), centerInBox(), containScale(), innerCell(), Size

### Community 31 - "generate-weapons.ts"
Cohesion: 0.19
Nodes (18): chunk(), crc32(), drawMine(), drawMissile(), drawOil(), drawTurbo(), emptyFrame(), encodePng() (+10 more)

### Community 32 - "RaceAudio"
Cohesion: 0.08
Nodes (8): BrakeVoice, clampUnit(), clampUnit(), ExplosionVoice, NoiseSource, RaceAudio, clampUnit(), SkidVoice

### Community 33 - "Vec2.ts"
Cohesion: 0.07
Nodes (41): computeBounds(), VehicleViewExtras, GENERATED_TRACKS, thunderBasin, innerWallParkPose, OFFROAD_GRIP_MULTIPLIER, OFFROAD_ROLLING_RESISTANCE, OVERSPEED_ALLOWANCE (+33 more)

### Community 34 - "GarageScene.ts"
Cohesion: 0.13
Nodes (31): buyCar(), cashInPoints(), loadActiveCareer(), loadCleared(), loadPoints(), loadWonTracks(), sellCar(), isTourModeOn() (+23 more)

### Community 38 - "fleet.ts"
Cohesion: 0.09
Nodes (21): CAR_FRAME_WIDTH, WORLD_ADVANTAGE, WorldAdvantage, carsDir, manifest, projectRoot, testFileDir, templateCar (+13 more)

### Community 39 - "HudFormat.ts"
Cohesion: 0.32
Nodes (9): formatCountdown(), formatHud(), formatIntegrityPercent(), formatRaceTime(), formatSpeed(), formatSpeedDigits(), formatSpeedFraction(), MPH_PER_WORLD_UNIT (+1 more)

### Community 40 - "generate-planet-select.ts"
Cohesion: 0.20
Nodes (12): bandedGradient(), calmFactor(), here, lerp(), outDir, Rgb, SelectSpec, silhouetteHeightAt() (+4 more)

### Community 42 - "pack-redrawn.ts"
Cohesion: 0.16
Nodes (20): CarSheetManifest, cartStripFile(), CAR_SPRITE_FRAMES, main(), OUTPUT_DIRECTORY, REPO_ROOT, CARS_DIRECTORY, installStrip() (+12 more)

### Community 43 - "MusicPlayer"
Cohesion: 0.22
Nodes (3): MusicPlayer, DrumStep, MusicScore

### Community 44 - "WORKLOG — concurrence-gamming"
Cohesion: 0.12
Nodes (16): Active agents, Agent briefs, Blocked work, Current state in one line, `git push` — RESOLVED, 2026-08-15 23:40, Headless verification — solved, but read this before re-solving it, How to resume this work (orchestrator instructions), Known art polish items (low priority, not blocking) (+8 more)

### Community 45 - "API reference for whoever picks this up"
Cohesion: 0.15
Nodes (13): API reference for whoever picks this up, Generated asset manifest — `public/assets/cars/cars.json`, `src/adapters/render/TuningOverlay*.ts` (T-012), `src/domain/constants.ts`, `src/domain/input/InputCommand.ts`, `src/domain/math/Vec2.ts`, `src/domain/race/OnTrackStep.ts` (T-012), `src/domain/track/TrackDefinition.ts` (+5 more)

### Community 46 - "generate-ground-tiles.ts"
Cohesion: 0.23
Nodes (10): blotchParity(), here, onCrackEdge(), outDir, Pattern, Swatch, SWATCHES, worley() (+2 more)

### Community 47 - "Art briefs — the ten planets (T-034)"
Cohesion: 0.20
Nodes (9): Art briefs — the ten planets (T-034), Prompt A — area-select illustration (one per planet), Prompt B — seamless ground tile (one per planet), Prompt C — props and objects in the world (this is where the 2:1 angle matters), Style anchor, The projection constraint — the part that is easy to get wrong, The ten planets, What the engine can and cannot use (+1 more)

### Community 48 - "Handoff — Claude team, 2026-08-16 ~05:00"
Cohesion: 0.20
Nodes (9): Constraints (paid for already — do not rediscover), Do not, Handoff — Claude team, 2026-08-16 ~05:00, How to wire a real tile or illustration, Images — where they live, Track geometry (if a planet's layout is wrong), Verify before you call it done, What is already in (+1 more)

### Community 49 - "EngineGearbox"
Cohesion: 0.27
Nodes (4): clampUnit(), EngineGearbox, GearboxOptions, GearboxState

### Community 50 - "MISSION"
Cohesion: 0.25
Nodes (7): Constraints, Decisions, Discarded, Files, MISSION, Next step, Objective

### Community 51 - "GarageScene"
Cohesion: 0.08
Nodes (4): findCarSheet(), activeSlotSafe(), GarageScene, HUB_FOCUS

### Community 53 - "SeasonPoints.ts"
Cohesion: 0.15
Nodes (19): BASE_FIRST_POINTS, CASH_IN_PAYOUT, cashInBatches(), CONTACT_HIT_POINTS, firstPlacePoints(), hitScale(), MINE_HIT_POINTS, MISSILE_HIT_POINTS (+11 more)

### Community 54 - "Delivery reports"
Cohesion: 0.10
Nodes (21): 2026-08-15 20:31 PDT — T-012 round (uncommitted, `main`), 2026-08-16 — T-018 delivered: the game opens on the splash screen, Agents involved this round, Agents involved this round, Agents involved this round, Context cleanup — 2026-08-15 17:02 PDT — user requested a manual clean after compaction #1, Context cleanup — 2026-08-15 17:32 PDT — user asked for a save point before clearing the context, Context cleanup — 2026-08-15 17:45 PDT — user played the game, accepted it, and asked for a save point before clearing the context (+13 more)

### Community 55 - "Decisões de design (arcade, não real)"
Cohesion: 0.10
Nodes (19): 1. Launch = base da zona + soma do carro no ponto zero, 1b. Sem força positiva → a rampa ganha (ré sozinha), 2. “Velocidade normal + turbo” — o *hot approach*, 3. Ângulo da rampa é dado, não derivado, 4. Turbo a meio do salto — segundo kick, uma vez, 5. Aterragem dura só na 45° quente, 6. Trajetória fora da pista → cai, explode, volta depois da rampa, 7. O que o ângulo **não** muda (+11 more)

### Community 56 - "ReverseLatch"
Cohesion: 0.17
Nodes (4): KeyboardDriver, DriveIntent, ReverseLatch, ReverseLatchOptions

### Community 57 - "RaceField"
Cohesion: 0.06
Nodes (33): CameraContactEvent, isWarTankPerk(), lerp(), RacerStanding, meanCornerTightness(), RaceField, RaceState, findLineForCar() (+25 more)

### Community 58 - "New tasks opened 2026-08-16 by the owner (T-043..T-047)"
Cohesion: 0.17
Nodes (12): Agents involved this round, Context cleanup — 2026-08-16 01:00 — context reached 375k, past the 290k ceiling, Context cleanup — 2026-08-16 06:20 — context reached 408k, past the 290k ceiling, owner restarting for mobile, Final handoff — 2026-08-16 ~03:35 — Cursor session (Opus) — Competitive NPCs / Aim / Race Flow / 30 Tracks, How the next agent continues — unchanged order, now with the decisions settled, Known balance finding (honest, not a bug), New tasks opened 2026-08-16 by the owner (T-043..T-047), Session start — 2026-08-16 ~05:00 — Claude team picks up T-034 (planet maps and art) (+4 more)

### Community 59 - "Final handoff — 2026-08-16 01:05 — the owner called the end of the session ("logo vao acabar os tokens")"
Cohesion: 0.29
Nodes (7): Final handoff — 2026-08-16 01:05 — the owner called the end of the session ("logo vao acabar os tokens"), Shipped this session, Start here next session, in this order, The two owner decisions, settled — do not re-open either, Tooling added this session — do not re-derive it, Two gates only the owner can close, Two questions put to the owner and NOT yet answered

### Community 60 - "PlanetSelectScene.ts"
Cohesion: 0.16
Nodes (15): bindMenuKeys(), MenuKeyHandlers, MENU_KIND, MENU_PROMPT_LIST, MENU_PROMPT_OPTIONS, MenuActionSpec, MenuControllerOptions, MenuItemSpec (+7 more)

### Community 62 - "vercel.json"
Cohesion: 0.33
Nodes (5): buildCommand, framework, installCommand, outputDirectory, rewrites

### Community 63 - "Context cleanup — 2026-08-16 00:25 — context reached 344k, past the 290k ceiling"
Cohesion: 0.33
Nodes (6): A new verification tool exists — do not re-derive it, Agents involved this round, Context cleanup — 2026-08-16 00:25 — context reached 344k, past the 290k ceiling, How the next agent continues, Standing lessons, all already paid for here, The owner opened a LOT of new scope this turn. All of it is recorded below as T-043..T-047

### Community 64 - "Context cleanup — 2026-08-16 00:55 — context reached 312k, past the 290k ceiling"
Cohesion: 0.33
Nodes (6): Agents involved this round, Context cleanup — 2026-08-16 00:55 — context reached 312k, past the 290k ceiling, How the next agent continues, Standing lessons, every one already paid for here, T-037 is functionally complete. The measured outcomes, so nobody re-derives them, What the owner asked for this session, in their own words

### Community 65 - "RacingAgent.ts"
Cohesion: 0.14
Nodes (23): relativeSpeedAlong(), OpponentMemoryEntry, AgentDebugSnapshot, AgentDecision, AgentRival, closestAhead(), closestBehind(), emptyCapabilities() (+15 more)

### Community 67 - "Verification helpers — seeing the game with your own eyes"
Cohesion: 0.40
Nodes (4): probe.mjs, screenshot.mjs, Setup, Verification helpers — seeing the game with your own eyes

### Community 68 - "Context cleanup — 2026-08-15 23:40 — the owner is clearing the session to start clean"
Cohesion: 0.40
Nodes (5): Agents involved this round, Context cleanup — 2026-08-15 23:40 — the owner is clearing the session to start clean, The next session should do this, in this order, Traps that have each already cost this project a task or more, What the owner said this turn, verbatim in intent

### Community 69 - "Context cleanup — 2026-08-15 23:55 — the owner stopped implementation and asked for a save point"
Cohesion: 0.40
Nodes (5): Context cleanup — 2026-08-15 23:55 — the owner stopped implementation and asked for a save point, Delivered this turn, Next steps, in order, T-018 was started and stopped — what is on disk, The trap that produced T-039, stated plainly because it will happen again

### Community 70 - "Context cleanup — 2026-08-16 00:05 — the owner is clearing the session"
Cohesion: 0.40
Nodes (5): Context cleanup — 2026-08-16 00:05 — the owner is clearing the session, Next steps, unchanged order, No agent is mid-flight, Sign-offs so far, so nobody re-litigates them, Standing lessons this project has already paid for

### Community 71 - "trackgen/generate.ts"
Cohesion: 0.14
Nodes (25): campaignSlotForTrackId(), campaignTracks(), isPlanetUnlocked(), isTrackUnlocked(), nextCampaignTrack(), planetTracks(), ANCHOR_TRACK_ID, PlanetDefinition (+17 more)

### Community 72 - "BootScene.ts"
Cohesion: 0.14
Nodes (24): CAMERAS_ASSET_DIRECTORY, camerasCacheKey(), CAR_ASSET_DIRECTORY, CAR_MANIFEST_KEY, CART_PORTRAIT_SIZE, DEBRIS_ASSET_DIRECTORY, GARAGE_ART_FILE, GARAGE_ART_KEY (+16 more)

### Community 73 - "Context cleanup — 2026-08-15 23:10 — context reached 312k, past the 290k ceiling"
Cohesion: 0.50
Nodes (4): Agents involved this round, Art was reorganised this turn — the old paths are gone, do not look for them, Context cleanup — 2026-08-15 23:10 — context reached 312k, past the 290k ceiling, How the next agent continues

### Community 74 - "circuit-maps.ts"
Cohesion: 0.15
Nodes (17): COLOR_BACKGROUND, COLOR_GUIDE, COLOR_PURSUIT, COLOR_PURSUIT_LINE, COLOR_ROAD, COLOR_START, createBitmap(), drawSegment() (+9 more)

### Community 78 - ".create"
Cohesion: 0.30
Nodes (5): musicBedKey(), cartPortraitKey(), sheetCellSize(), BootScene, linesCacheKey()

### Community 79 - "VehicleTelemetry"
Cohesion: 0.21
Nodes (5): TuningOverlay, formatTuningOverlay(), safeFormat(), TuningOverlayReadout, VehicleTelemetry

### Community 80 - "CameraZoomPolicy.ts"
Cohesion: 0.29
Nodes (6): CameraZoomPolicy, CameraZoomPolicyOptions, CAMERA_CLOSE_ZOOM, CAMERA_CORNER_CURVATURE, CAMERA_HOME_ZOOM, CAMERA_WIDE_ZOOM

### Community 83 - "MetalScrapEffect.ts"
Cohesion: 0.23
Nodes (14): FlyingScrap, SCRAP_HARD_COUNT, SCRAP_HARD_SPEED, SCRAP_LIGHT_COUNT, SCRAP_MEDIUM_COUNT, SCRAP_MEDIUM_SPEED, SCRAP_ROSTER_SIZE, SCRAP_SPRITES (+6 more)

### Community 84 - "CarStatBars.test.ts"
Cohesion: 0.16
Nodes (11): normalise(), safeStat(), STAT_BAR_FIELDS, StatBar, statBars(), BASE_STATS, carIds, carsJsonPath (+3 more)

### Community 85 - "IsoProjection"
Cohesion: 0.15
Nodes (5): ChaseCamera, ChaseCameraOptions, IsoProjection, ScreenPoint, VehicleView

### Community 87 - "NarratorBank.ts"
Cohesion: 0.18
Nodes (13): createElement(), BANTER_EXTRA_IDS, LINES_BY_ID, NARRATOR_CATEGORY, NARRATOR_LAB_DIRECTORY, NARRATOR_LINES, NARRATOR_STASH_DIRECTORY, NarratorClip (+5 more)

### Community 88 - "NarratorPlan.ts"
Cohesion: 0.23
Nodes (17): banterLines(), linesInCategory(), pickNarratorVoice(), buildEventPool(), clampInt(), clipFor(), clipsInPlan(), finalLapHoles() (+9 more)

### Community 89 - "Iso car strip"
Cohesion: 0.20
Nodes (10): After images exist, Contract (not negotiable), Forbidden, Image prompt (game cell), Image prompt (HQ still), Inputs (refuse if missing), Iso car strip, Next car (+2 more)

### Community 90 - "Wallet.ts"
Cohesion: 0.21
Nodes (18): BASE_FIRST_PRIZE, CONTACT_HIT_BOUNTY, contactHitBounty(), firstPlacePrize(), hitScale(), MINE_HIT_BOUNTY, mineHitBounty(), MISSILE_HIT_BOUNTY (+10 more)

### Community 91 - "TyreMarks"
Cohesion: 0.21
Nodes (3): freshAlphaFor(), slideIntensity(), TyreMarks

### Community 92 - "ExplosionEffect"
Cohesion: 0.19
Nodes (5): ExplosionEffect, lerpColor(), sampleFireballColor(), seededRandom(), resolveBurstScale()

### Community 93 - "RaceField.ts"
Cohesion: 0.06
Nodes (74): CarPerkId, IDLE_INPUT, distance(), CONTACT_SIDE, ContactSide, RacerEntry, RacerRuntime, CAR_CONDITION (+66 more)

### Community 94 - "Music brief — 10 original race beds"
Cohesion: 0.33
Nodes (5): Delivery, Music brief — 10 original race beds, Specs, Style, Use

### Community 95 - "spritegen/preview.ts"
Cohesion: 0.13
Nodes (21): CAR_FRAME_HEIGHT, CARS_DIRECTORY, isContent(), manifest, opaqueBounds(), portraitFromFrame(), REPO_ROOT, HERE (+13 more)

### Community 96 - "DriverProfile.ts"
Cohesion: 0.15
Nodes (23): deriveProfile(), WEIGHT_SALTS, clampWeights(), DERIVED_SPECS, DRIVER_PROFILE_TIER, DRIVER_WEIGHT_IDS, DriverProfile, DriverProfileTier (+15 more)

### Community 97 - "RaceSimulation.ts"
Cohesion: 0.18
Nodes (14): advanceLapProgress(), checkpointDistance(), createLapProgress(), LapProgress, IMPORTANT: Use the starting value of nextCheckpoint for the checkpoint index…, RacerProgress, rankRacers(), advanceRace() (+6 more)

### Community 98 - "trackgen/preview.ts"
Cohesion: 0.15
Nodes (20): COLOR_BACKGROUND, COLOR_CHECKPOINT, COLOR_CONTROL, COLOR_FAST, COLOR_SHOULDER, COLOR_START, COLOR_SURFACE, COLOR_TIGHT (+12 more)

### Community 99 - "CarManifest.ts"
Cohesion: 0.12
Nodes (26): CarManifestError, cartHeroFile(), cartPortraitFile(), cartPortraitLegacyFile(), cartPortraitToken(), foldCollisionStats(), KNOWN_CAR_PERKS, parseCarSetManifest() (+18 more)

### Community 101 - "TourMode.ts"
Cohesion: 0.47
Nodes (6): enableTourMode(), enableTourModeFromSearch(), feedTourCode(), resetTourMode(), TOUR_CODE, tourModeFromSearch()

### Community 102 - "Sprite-strip"
Cohesion: 0.20
Nodes (10): After images exist, Contract (not negotiable), Forbidden, Image prompt (game cell), Image prompt (HQ still), Inputs (refuse if missing), Next car, Outputs (+2 more)

### Community 103 - "sprite-strip/SKILL.md"
Cohesion: 0.25
Nodes (4): 3/4 painted size (frames 0, 8, 16, 24), Check, Fit — generated still → 128 cell, Steps

### Community 104 - "RivalAgent.ts"
Cohesion: 0.22
Nodes (12): LineCandidate, chooseLineByAccount(), clamp(), hash32(), lineAccount(), meanAbsOffset(), PATH_CANDIDATE, PATH_KINDS (+4 more)

### Community 105 - "Game sprint sprites 2D"
Cohesion: 0.25
Nodes (8): Como aplicar, Como usar (melhor forma), Game sprint sprites 2D, Nomes (sempre), O herói pode estar à direita ou à esquerda, O que o humano deu, Por que isto é espetacular, Proibido

### Community 106 - "GuitarSolo.ts"
Cohesion: 0.48
Nodes (5): createContext(), distortionCurve(), GUITAR_SOLO_DURATION_SECONDS, playGuitarSolo(), SOLO_NOTES

### Community 107 - "Carros novos — deixa os heróis aqui"
Cohesion: 0.40
Nodes (4): Carros novos — deixa os heróis aqui, Nomes (sempre), O que o Cursor faz, Onde fica cada coisa

### Community 108 - "TrackLines.ts"
Cohesion: 0.52
Nodes (5): parseLine(), parseTrackLinesManifest(), requireNumber(), requireString(), TrackLinesError

### Community 109 - "car-1 — Marauder"
Cohesion: 0.33
Nodes (5): car-1 — Marauder, Do not change, Lock, Outputs, Refs in this pack

### Community 110 - "Uso — melhor forma"
Cohesion: 0.29
Nodes (7): Duas skills, Frases más → o que fazer em vez, Invocar, Melhor forma (esta ordem), O que o agente não pede, O que o humano prepara, Uso — melhor forma

### Community 114 - "generate-lab.ts"
Cohesion: 0.21
Nodes (12): NARRATOR_VOICES, NarratorCategory, narratorClipFile(), BASE_INSTRUCTIONS, CATEGORY_INSTRUCTIONS, FORCE, LAB_DIRECTORY, main() (+4 more)

### Community 115 - "Clock — 32 poses"
Cohesion: 0.40
Nodes (5): Anchors (draw these first), Clock — 32 poses, Full table, Lights and parts by yaw, Size — fixed world, not fill-the-cell

### Community 116 - "Collision — one square, midpoint"
Cohesion: 0.40
Nodes (4): After a new strip, Collision — one square, midpoint, One box for every yaw, Where it lives

### Community 118 - "CameraPreset.ts"
Cohesion: 0.19
Nodes (14): ClusterCandidate, CameraImpulseSample, ImpulseKind, CAMERA_ACCIDENT_HOLD_SECONDS, CAMERA_CLUSTER_RADIUS_UNITS, CAMERA_EXPLOSION_KICK, CAMERA_EXPLOSION_ZOOM_IN, CAMERA_EXPLOSION_ZOOM_OUT (+6 more)

### Community 119 - "MismatchedProfiles.test.ts"
Cohesion: 0.16
Nodes (13): TUNING_STILL_REQUIRED, buildStatNormalizer(), capabilitiesFromStats(), minMax(), mix(), gun, heavy, light (+5 more)

### Community 120 - "Regras — tira de relógio (car-1)"
Cohesion: 0.29
Nodes (6): Contrato, Ordem, Proibido, Prompt de cada célula 128×128, Prompt de cada HQ 512×512, Regras — tira de relógio (car-1)

### Community 121 - "TrackSelectScene"
Cohesion: 0.16
Nodes (7): Burst, rewardLabel(), Star, CampaignTrack, findPlanet(), formatCash(), TrackSelectScene

### Community 122 - "car-1 — Marauder"
Cohesion: 0.33
Nodes (5): car-1 — Marauder, Do not change, Lock, Outputs, Refs in this pack

### Community 123 - "RaceScene.ts"
Cohesion: 0.15
Nodes (17): CarSetManifest, assignNpcCars(), RaceFieldOptions, TrackLinesManifest, game, GarageSceneData, AUDIO_VALUES, PauseSceneData (+9 more)

### Community 124 - "Clock — 32 poses"
Cohesion: 0.33
Nodes (5): Anchors (draw these first), Clock — 32 poses, Full table, Lights and parts by yaw, Size — fixed world, not fill-the-cell

### Community 128 - "UtilityEvaluator.ts"
Cohesion: 0.21
Nodes (17): clamp01(), memoryEffect(), storedMemory(), evaluateOpportunities(), RaceSituation, raceTacticalValue(), SituationOpportunities, ATTACK_METHODS (+9 more)

### Community 131 - "SevenSegment.test.ts"
Cohesion: 0.18
Nodes (15): BLANK_PATTERN, DIGIT_PATTERNS, isSegmentLit(), WHY: the vertical segments (f/b, e/c) already occupy the full `STROKE` width at…, SEGMENT, SEGMENT_LAYOUT, SegmentName, SegmentRect (+7 more)

### Community 133 - "OpponentMemory.ts"
Cohesion: 0.23
Nodes (8): decayField(), decayMemory(), emptyMemory(), OpponentMemoryBook, recordBlockedBy(), recordNearMiss(), recordRamReceived(), recordWeaponHitReceived()

### Community 134 - "CameraDirector.ts"
Cohesion: 0.18
Nodes (11): CAMERA_OVERRIDE, CameraDirector, CameraDirectorSample, CameraOverride, CAMERA_MANUAL_HOLD_SECONDS, CAMERA_MAX_ZOOM_IN, CameraPreset, CameraTrigger (+3 more)

### Community 135 - "WatchField.ts"
Cohesion: 0.19
Nodes (14): enableWatchMode(), enableWatchModeFromSearch(), watchModeFromSearch(), watchTrackFromSearch(), isNewFleetCarId(), driverSkill(), nextWatchTrack(), splitWatchRoster() (+6 more)

### Community 137 - "LapTimes.test.ts"
Cohesion: 0.08
Nodes (32): findTrack(), LATERAL_GRIP_STIFFNESS, REVERSE_SPEED_FRACTION, SIMULATION_STEP_SECONDS, clampSigned(), clampUnit(), sanitizeInput(), dragCoefficient() (+24 more)

### Community 138 - "Intercept.ts"
Cohesion: 0.31
Nodes (9): interceptPoint(), observedPosition(), predictionTime(), predictPosition(), hash32(), hashUnit(), lerp(), applySkillToDriveOptions() (+1 more)

### Community 139 - "TrajectoryPlanner.ts"
Cohesion: 0.24
Nodes (11): baselineOffset(), candidateOffsets(), LATERAL_FRACTIONS, maxSafeOffset(), NearbyLateral, planTrajectory(), scoreCandidate(), TrajectoryCandidate (+3 more)

### Community 140 - "RivalTraits.ts"
Cohesion: 0.20
Nodes (16): clamp(), commitCornerPlan(), cornerCommitLookAhead(), CornerMarks, coverBehind(), goForPass(), hash32(), RIVAL_TRAIT (+8 more)

### Community 141 - "NarratorDirector.ts"
Cohesion: 0.43
Nodes (4): CursorKey, NarratorSnapshot, RACE_PHASE, RacePhase

### Community 142 - "Coast.ts"
Cohesion: 0.39
Nodes (5): CEREMONY_HOLD_SECONDS, COAST_BRAKE, COAST_STOP_SPEED, coastInput(), isNearlyStopped()

### Community 143 - "MenuController"
Cohesion: 0.17
Nodes (3): clampIndex(), MenuController, wrapIndex()

### Community 144 - "SpeedoGauge.ts"
Cohesion: 0.17
Nodes (9): BarPoint, barProfileAt(), COLOUR_STOPS, colourAtT(), dimColour(), lerpColour(), SpeedoGauge, SpeedoGaugeOptions (+1 more)

### Community 145 - "HudScene.ts"
Cohesion: 0.16
Nodes (9): HudReadout, barColour(), HudSource, LOADOUT_ICON_KEYS, HUD_JUMP_KEY, HUD_MINE_KEY, HUD_MISSILE_KEY, HUD_OIL_KEY (+1 more)

### Community 146 - "Isometric cam man — numbers"
Cohesion: 0.15
Nodes (11): Classification (arc length, span 45), Impulse (player only), Isometric cam man — numbers, Keys, Runtime files, Zoom band, After changing a track or line, Isometric cam man (+3 more)

### Community 147 - "ResultsScene.ts"
Cohesion: 0.21
Nodes (9): containSize(), FitSize, sane(), EMPTY_WEAPON_HITS, WeaponHits, ADVANCE_POSITION, PodiumStack, RankRow (+1 more)

### Community 148 - "PilotRoster.ts"
Cohesion: 0.29
Nodes (9): CHAMPIONSHIP_SIZE, drawRivalNames(), JOKER_PILOTS, mulberry32(), MYSTERIOUS_PILOTS, MYSTERIOUS_SWAP_COUNT, REGULAR_PILOTS, RIVALS_PER_SAVE (+1 more)

### Community 149 - "PLANETS"
Cohesion: 0.40
Nodes (7): planetForTrackId(), PLANETS, DEFAULT_THEME, everyPlanetHasTheme(), PLANET_THEMES, themeForPlanetId(), themeForTrackId()

### Community 151 - "CameraImpulse"
Cohesion: 0.29
Nodes (3): CameraImpulse, hitOffsetX(), lerp()

### Community 152 - "TrackCameras.ts"
Cohesion: 0.36
Nodes (7): parseKind(), parseTrackCameraPreset(), parseTrigger(), requireNumber(), requireString(), TrackCamerasError, CameraTriggerKind

### Community 153 - "PubBackgrounds.ts"
Cohesion: 0.36
Nodes (6): pickPubBackground(), PUB_BACKGROUND_DIRECTORY, PUB_BACKGROUNDS, PubBackground, pubBackgroundKey(), pubBackgroundUrl()

### Community 156 - "Game jornal"
Cohesion: 0.29
Nodes (6): Como medir “desde a última iteração”, Depois de escrever, Formato (obrigatório), Game jornal, Onde, Quando

### Community 157 - "DriverCards.ts"
Cohesion: 0.48
Nodes (5): DRIVER_CARD_DIRECTORY, DRIVER_CARDS, DriverCard, driverCardForName(), driverCardUrl()

### Community 159 - "AiOverlayFormat.test.ts"
Cohesion: 0.53
Nodes (4): formatAiOverlay(), safe(), EXECUTION_STATE, TACTICAL_INTENTION

### Community 160 - "UiPlaque.ts"
Cohesion: 0.33
Nodes (4): paintRoundedPlaque(), PLAQUE_INK, PLAQUE_LINE, PlaquePaint

### Community 161 - "Final handoff — 2026-08-16 ~01:40 — Cursor session (Grok) picked up from the 01:05 Claude handoff"
Cohesion: 0.33
Nodes (6): Final handoff — 2026-08-16 ~01:40 — Cursor session (Grok) picked up from the 01:05 Claude handoff, Owner gates still open, Shipped this Cursor session, Start here next session, in this order, Tooling / files added, Two questions still open (unchanged)

## Knowledge Gaps
- **726 isolated node(s):** `name`, `version`, `private`, `type`, `description` (+721 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GarageScene` connect `GarageScene` to `UiPlaque.ts`, `GarageScene.ts`, `ProgressStore.ts`, `MenuController`, `CarStatBars.test.ts`, `RaceScene.ts`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `HelpScene` connect `HelpScene` to `RaceScene.ts`, `SCENE_KEY`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `vec2` connect `vec2` to `IsoProjection.ts`, `CarPerk.test.ts`, `TrackRenderer.ts`, `TrackSpline.ts`, `LapTimes.test.ts`, `Intercept.ts`, `TrackSpline`, `fromAngle`, `HitRewardEffect`, `Vec2.ts`, `RaceField`, `RacingAgent.ts`, `trackgen/generate.ts`, `circuit-maps.ts`, `MetalScrapEffect.ts`, `TyreMarks`, `ExplosionEffect`, `RaceField.ts`, `trackgen/preview.ts`, `CameraPreset.ts`, `TrackSelectScene`, `RaceScene.ts`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _726 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `20 REGULARS — every planet` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `CarPerk.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06748911465892599 - nodes in this community are weakly interconnected._
- **Should `SplashAttract.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05708548479632817 - nodes in this community are weakly interconnected._