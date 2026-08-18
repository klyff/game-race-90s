# Graph Report - game-race-90s  (2026-08-18)

## Corpus Check
- 475 files · ~85,929,832 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3479 nodes · 8503 edges · 197 communities (166 shown, 31 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `474fe80b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- 20 REGULARS — every planet
- fit-redrawn.ts
- fleet.ts
- SplashAttract.ts
- TrackRenderer.ts
- ExplosionEffect.ts
- MusicBeds.test.ts
- generate-hud-icons.ts
- scripts
- Circuitos
- scale
- RaceScore.ts
- RampLaunch.ts
- RaceScene
- GarageScene.ts
- qa-strip.ts
- Pilotos
- compilerOptions
- Passo a passo — matrix_car (fonte do que já fizemos)
- MusicScore.ts
- renderCar.ts
- ResultsScene
- planetMusic.ts
- schema.ts
- generate-metal-scraps.ts
- Clock — 32 poses
- analyzeTrackCameras.ts
- pack-redrawn.ts
- NarratorDirector
- spritegen/preview.ts
- strip-fit.ts
- generate-weapons.ts
- NoiseSource
- TuningOverlay
- GarageCatalog.ts
- PauseScene
- ImpactVoice
- Wallet.ts
- generate-traps.ts
- Array as is (car_1)
- generate-planet-select.ts
- import-fleet.ts
- RaceAudio.ts
- BUFFER
- WORKLOG — concurrence-gamming
- API reference for whoever picks this up
- generate-ground-tiles.ts
- Art briefs — the ten planets (T-034)
- Handoff — Claude team, 2026-08-16 ~05:00
- EngineGearbox
- MISSION
- GarageScene
- Passo a passo — matrix_car (fonte do que já fizemos)
- .layout
- Delivery reports
- Decisões de design (arcade, não real)
- RaceSimulation.ts
- vec2
- New tasks opened 2026-08-16 by the owner (T-043..T-047)
- Final handoff — 2026-08-16 01:05 — the owner called the end of the session ("logo vao acabar os tokens")
- PlanetSelectScene.ts
- VehicleCapabilityModel.ts
- vercel.json
- Context cleanup — 2026-08-16 00:25 — context reached 344k, past the 290k ceiling
- Context cleanup — 2026-08-16 00:55 — context reached 312k, past the 290k ceiling
- VehicleStats
- domain-purity.test.ts
- Verification helpers — seeing the game with your own eyes
- Context cleanup — 2026-08-15 23:40 — the owner is clearing the session to start clean
- Context cleanup — 2026-08-15 23:55 — the owner stopped implementation and asked for a save point
- Context cleanup — 2026-08-16 00:05 — the owner is clearing the session
- TitleAudio
- RaceScene.ts
- Context cleanup — 2026-08-15 23:10 — context reached 312k, past the 290k ceiling
- RacingAgent.ts
- drive.mjs
- probe.mjs
- screenshot.mjs
- JumpCharges.ts
- ResultsLayout.ts
- TrackSelectScene
- MetalScrapEffect.ts
- .create
- HudScene
- NarratorBank.ts
- NarratorPlan.ts
- Iso car strip
- SeasonPoints.ts
- RaceField.test.ts
- findCarSheet
- RaceField.ts
- Music brief — 10 original race beds
- TrackSpline
- DriverProfile.ts
- trackgen/preview.ts
- circuit-maps.ts
- CarManifest.ts
- Game map traps
- PlannedClip
- Sprite-strip
- sprite-strip/SKILL.md
- analyzeTrackTraps.ts
- Game sprint sprites 2D
- generate-lab.ts
- Carros novos — deixa os heróis aqui
- SevenSegment.test.ts
- car-1 — Marauder
- Uso — melhor forma
- car-1/README.md
- redrawn/README.md
- UtilityEvaluator.ts
- matrix_car — pasta oficial
- Clock — 32 poses
- Collision — one square, midpoint
- CATALOG.md
- CameraPreset.ts
- HudFormat.ts
- Regras — tira de relógio (car-1)
- Matrix car rotate
- car-1 — Marauder
- RacingAgent
- Clock — 32 poses
- CLAUDE.md
- LEIA-ME.md
- PLAN.md
- matrix_car — pasta oficial
- EngineVoice
- Game nível
- PlanetSelectScene
- clamp01
- CameraDirector.ts
- WatchField.ts
- IsoProjection
- Cloud Agent — Metade B (fila 18 → 33)
- math.ts
- TyreMarks
- TourMode.ts
- flood_black_to_alpha
- MusicPlayer
- TrackLines.ts
- trackgen/generate.ts
- Escala de produção — matrix_car → jogo
- Isometric cam man — numbers
- Cloud Agent — Metade B (fila 18 → 33)
- package.json
- devDependencies
- HelpScene
- WoodDebrisEffect.ts
- TrackCameras.ts
- CarStatBars.test.ts
- AccidentWatch
- build_strip.py
- Game jornal
- build_matrix_strip.py
- constants.ts
- CarSetManifest
- .step
- ReverseLatch
- Prompt — 30 frames (+12°)
- JOURNAL
- SUMMARY.md
- SpeedoGauge.ts
- Escala de produção — matrix_car → jogo
- Prompt — 30 frames (+12°)
- .toScreen
- ArcadeCarPhysics.ts
- Prompt — front half-rotation (15 frames × 12°)
- Process — duas metades
- Prompt — rear half-rotation (15 frames × 12°)
- TrajectoryPlanner.ts
- matrix_car/PROMPT_FRONT_HALF.md
- matrix_car/PROMPT_REAR_HALF.md
- ia-log-server.mjs
- car-rotate/PROMPT_FRONT_HALF.md
- car-rotate/PROMPT_REAR_HALF.md
- pipeline.sh
- CameraImpulse
- Process — duas metades
- Cloud handoff — metade B
- Cloud handoff — metade B
- RaceAudio
- CameraZoomPolicy.ts
- ResultsScene.ts
- HudScene.ts
- ControlList.ts
- MetalScrapEffect
- FixedStepLoop
- containSize
- pack_folder
- validate_lot.py

## God Nodes (most connected - your core abstractions)
1. `vec2` - 98 edges
2. `RaceScene` - 81 edges
3. `RaceField` - 71 edges
4. `GarageScene` - 71 edges
5. `TrackSpline` - 70 edges
6. `scale()` - 66 edges
7. `add()` - 56 edges
8. `VehicleStats` - 46 edges
9. `fromAngle()` - 43 edges
10. `TrackDefinition` - 36 edges

## Surprising Connections (you probably didn't know these)
- `main()` --indirect_call--> `findTrack()`  [INFERRED]
  tools/trackgen/preview.ts → src/data/tracks/registry.ts
- `candidateAtGap()` --calls--> `vec2`  [EXTRACTED]
  tests/domain/Slipstream.test.ts → src/domain/math/Vec2.ts
- `Chosen` --references--> `TrackDefinition`  [EXTRACTED]
  tools/trackgen/generate.ts → src/domain/track/TrackDefinition.ts
- `RenderedCar` --references--> `CarSheetManifest`  [EXTRACTED]
  tools/spritegen/renderCar.ts → src/data/cars/CarManifest.ts
- `generateForTrack()` --calls--> `parseCarSetManifest()`  [EXTRACTED]
  tools/linegen/generate.ts → src/data/cars/CarManifest.ts

## Import Cycles
- None detected.

## Communities (197 total, 31 thin omitted)

### Community 0 - "20 REGULARS — every planet"
Cohesion: 0.07
Nodes (29): 10. KIRA, 11. SNAKE, 12. RIO, 13. JETT, 14. NOVA, 15. CRUZ, 16. ASH, 17. ZARA (+21 more)

### Community 1 - "fit-redrawn.ts"
Cohesion: 0.11
Nodes (32): CAR_SPRITE_FRAME_ARC, chroma(), consumePose(), Crop, fitHq(), fitPoseToFootprint(), isGreenKey(), isPaper() (+24 more)

### Community 2 - "fleet.ts"
Cohesion: 0.14
Nodes (15): WORLD_ADVANTAGE, WorldAdvantage, templateCar, FleetCarDef, STATS_AIR_BLADE, STATS_AIR_BOAT, STATS_BATTLE_TRAK, STATS_DELOREAN (+7 more)

### Community 3 - "SplashAttract.ts"
Cohesion: 0.05
Nodes (52): createContext(), distortionCurve(), GUITAR_SOLO_DURATION_SECONDS, playGuitarSolo(), SOLO_NOTES, BlinkClock, CARD_FLIP_SECONDS, CARD_GAP_SECONDS (+44 more)

### Community 4 - "TrackRenderer.ts"
Cohesion: 0.20
Nodes (12): ScreenPoint, computeBounds(), propHash(), sampleCenterline(), ScreenBounds, shade(), TrackRenderer, TrackRendererOptions (+4 more)

### Community 5 - "ExplosionEffect.ts"
Cohesion: 0.15
Nodes (13): BURN_COLORS, BurnBlotch, BurnMark, Burst, BurstOptions, ExplosionEffectOptions, FIREBALL_COLORS, lerpColor() (+5 more)

### Community 6 - "MusicBeds.test.ts"
Cohesion: 0.19
Nodes (15): isAudioMuted(), setAudioMuted(), clearLoadedMusicBeds(), loaded, loadedMusicBeds(), markMusicBedLoaded(), pickLoadedMusicBed(), createAudioContext() (+7 more)

### Community 7 - "generate-hud-icons.ts"
Cohesion: 0.07
Nodes (37): drawBarrel(), drawJump(), drawMine(), drawMissile(), drawTurbo(), empty(), getA(), GOLD (+29 more)

### Community 8 - "scripts"
Cohesion: 0.07
Nodes (29): scripts, build, dev, gen:cameras, gen:car-strip, gen:carts, gen:collision-maps, gen:fit-raw (+21 more)

### Community 9 - "Circuitos"
Cohesion: 0.05
Nodes (41): Ash Reach, Ash Reach I, Ash Reach II, Ash Reach III, Bogmire Deep, Bogmire Deep I, Bogmire Deep II, Bogmire Deep III (+33 more)

### Community 10 - "scale"
Cohesion: 0.07
Nodes (57): ChaseCameraOptions, seededRandom(), TyreMarksOptions, VehicleViewExtras, add(), cross(), distance(), dot() (+49 more)

### Community 11 - "RaceScore.ts"
Cohesion: 0.47
Nodes (7): clamp01(), computeRaceScore(), POSITION_WEIGHT, positionFraction(), RaceScoreInput, TIME_WEIGHT, timeFraction()

### Community 12 - "RampLaunch.ts"
Cohesion: 0.11
Nodes (33): AIR_TURBO_HEIGHT_BONUS, AIR_TURBO_RANGE_BONUS, applyAirTurboKick(), carForceAtContact(), clamp(), forwardAccelAtContact(), heightSpeedScale(), HOT_45_HEIGHT_BONUS (+25 more)

### Community 14 - "GarageScene.ts"
Cohesion: 0.10
Nodes (52): activateSlot(), activeSlotIndex(), beginSlot(), cashInPoints(), CLEAR_POSITION, creditWallet(), debitWallet(), equipCar() (+44 more)

### Community 15 - "qa-strip.ts"
Cohesion: 0.15
Nodes (30): chroma(), isInkBlack(), isPaper(), luma(), main(), nearest(), parseArgs(), poseBudget() (+22 more)

### Community 16 - "Pilotos"
Cohesion: 0.06
Nodes (31): Agent (derivado do mesmo seed), ALINE, ASH, BLAZE, CRUZ, DAVE, DIEGO, Driver Personality (+23 more)

### Community 17 - "compilerOptions"
Cohesion: 0.07
Nodes (28): DOM, DOM.Iterable, ES2022, src, tests, tools, vite/client, vitest/globals (+20 more)

### Community 18 - "Passo a passo — matrix_car (fonte do que já fizemos)"
Cohesion: 0.11
Nodes (18): 0) Fonte da verdade (ler nesta ordem), 1) Contrato (não negociar), 2) O que JÁ está feito (as is), 3) Split das metades, 4.1 Gerar, 4.2 Normalizar → 1700×1254, 4.3 Repetir, 4) Passo a passo — um frame (+10 more)

### Community 19 - "MusicScore.ts"
Cohesion: 0.14
Nodes (26): barCount(), barHasLick(), barIndexForStep(), BEATS_PER_BAR, beatsToSeconds(), ChordStep, DrumStep, eighthInBarForStep() (+18 more)

### Community 20 - "renderCar.ts"
Cohesion: 0.09
Nodes (36): CarSheetManifest, bestCollisionBox(), collisionSquares(), collisionBoxForCarId(), collisionBoxFromDef(), FLEET_MODEL_ID, rounded(), withCollisionBox() (+28 more)

### Community 21 - "ResultsScene"
Cohesion: 0.12
Nodes (3): PodiumSlot, driverCardKey(), ResultsScene

### Community 22 - "planetMusic.ts"
Cohesion: 0.10
Nodes (20): ASH_REACH_SCORE, BOGMIRE_DEEP_SCORE, CHROME_VERGE_SCORE, CRYO_HOLLOW_SCORE, DOUBLE_KICK_DRUM, everyPlanetHasMusic(), FERRO_RUST_SCORE, HEAVY_STRUM (+12 more)

### Community 23 - "schema.ts"
Cohesion: 0.23
Nodes (14): CAR_PERK, CarPerkId, PALETTE_ROLE, airBlade, airBoat, battleTrak, delorean, dirtDevil (+6 more)

### Community 24 - "generate-metal-scraps.ts"
Cohesion: 0.21
Nodes (15): chunk(), crc32(), drawScrap(), EDGE, emptyFrame(), encodePng(), fillPoly(), fillRect() (+7 more)

### Community 25 - "Clock — 32 poses"
Cohesion: 0.18
Nodes (7): Claude Code — desenhar um carro (tira de relógio), Anchors (draw these first), Clock — 32 poses, Full table, Lights and parts by yaw, Size — fixed world, not fill-the-cell, Handoff — modelo X → tira de relógio

### Community 26 - "analyzeTrackCameras.ts"
Cohesion: 0.12
Nodes (22): thunderBasinTwo, analyzeTrackCameras(), classify(), collectSegments(), countTriggers(), RawSegment, referenceZoomOut50(), SampleKind (+14 more)

### Community 27 - "pack-redrawn.ts"
Cohesion: 0.15
Nodes (19): cartHeroFile(), cartStripFile(), CARS_DIR, listNewCars(), NEW_CARS_DIR, NewCarDrop, REPO_ROOT, CARS_DIRECTORY (+11 more)

### Community 29 - "spritegen/preview.ts"
Cohesion: 0.10
Nodes (30): CAR_FRAME_HEIGHT, CAR_FRAME_WIDTH, CARS_DIRECTORY, isContent(), manifest, opaqueBounds(), portraitFromFrame(), REPO_ROOT (+22 more)

### Community 30 - "strip-fit.ts"
Cohesion: 0.39
Nodes (6): Box, boxFromPoses(), centerInBox(), containScale(), innerCell(), Size

### Community 31 - "generate-weapons.ts"
Cohesion: 0.19
Nodes (18): chunk(), crc32(), drawMine(), drawMissile(), drawOil(), drawTurbo(), emptyFrame(), encodePng() (+10 more)

### Community 32 - "NoiseSource"
Cohesion: 0.12
Nodes (7): BrakeVoice, clampUnit(), clampUnit(), ExplosionVoice, NoiseSource, clampUnit(), SkidVoice

### Community 33 - "TuningOverlay"
Cohesion: 0.23
Nodes (4): TuningOverlay, formatTuningOverlay(), safeFormat(), TuningOverlayReadout

### Community 34 - "GarageCatalog.ts"
Cohesion: 0.15
Nodes (22): buyCar(), loadCleared(), loadWonTracks(), isTourModeOn(), highestUnlockedPlanetIndex(), CAR_TIER, CarTier, carUnlockHint() (+14 more)

### Community 37 - "Wallet.ts"
Cohesion: 0.20
Nodes (19): BASE_FIRST_PRIZE, CONTACT_HIT_BOUNTY, contactHitBounty(), firstPlacePrize(), hitScale(), MINE_HIT_BOUNTY, mineHitBounty(), MISSILE_HIT_BOUNTY (+11 more)

### Community 38 - "generate-traps.ts"
Cohesion: 0.08
Nodes (34): drawCrate(), drawCrateStack(), drawGasoline(), drawGasolineStack(), drawWoodChip(), empty(), getA(), GRAIN (+26 more)

### Community 39 - "Array as is (car_1)"
Cohesion: 0.05
Nodes (39): Array as is (car_1), ARRAY_ROTATED_FIRST — as is, Colisão (um retângulo só), Escala de produção, indice[0], indice[1], indice[10], indice[11] (+31 more)

### Community 40 - "generate-planet-select.ts"
Cohesion: 0.20
Nodes (12): bandedGradient(), calmFactor(), here, lerp(), outDir, Rgb, SelectSpec, silhouetteHeightAt() (+4 more)

### Community 41 - "import-fleet.ts"
Cohesion: 0.25
Nodes (15): cellBounds(), contentBox(), contentRowRange(), extractFrame(), importCar(), isContent(), ORIGIN, OUTPUT_DIRECTORY (+7 more)

### Community 42 - "RaceAudio.ts"
Cohesion: 0.18
Nodes (14): ENGINE_IDLE_SHUTOFF_INITIAL, ENGINE_IDLE_SHUTOFF_PARKED, ENGINE_IDLE_SHUTOFF_SECONDS, ENGINE_RESTART_DRIVE, EngineIdleShutoffState, shouldParkEngine(), tickEngineIdleShutoff(), createAudioContext() (+6 more)

### Community 43 - "BUFFER"
Cohesion: 0.38
Nodes (7): BUFFER, chunk(), crc32(), encodePng(), chunk(), crc32(), encodePng()

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

### Community 52 - "Passo a passo — matrix_car (fonte do que já fizemos)"
Cohesion: 0.11
Nodes (18): 0) Fonte da verdade (ler nesta ordem), 1) Contrato (não negociar), 2) O que JÁ está feito (as is), 3) Split das metades, 4.1 Gerar, 4.2 Normalizar → 1700×1254, 4.3 Repetir, 4) Passo a passo — um frame (+10 more)

### Community 54 - "Delivery reports"
Cohesion: 0.10
Nodes (21): 2026-08-15 20:31 PDT — T-012 round (uncommitted, `main`), 2026-08-16 — T-018 delivered: the game opens on the splash screen, Agents involved this round, Agents involved this round, Agents involved this round, Context cleanup — 2026-08-15 17:02 PDT — user requested a manual clean after compaction #1, Context cleanup — 2026-08-15 17:32 PDT — user asked for a save point before clearing the context, Context cleanup — 2026-08-15 17:45 PDT — user played the game, accepted it, and asked for a save point before clearing the context (+13 more)

### Community 55 - "Decisões de design (arcade, não real)"
Cohesion: 0.10
Nodes (19): 1. Launch = base da zona + soma do carro no ponto zero, 1b. Sem força positiva → a rampa ganha (ré sozinha), 2. “Velocidade normal + turbo” — o *hot approach*, 3. Ângulo da rampa é dado, não derivado, 4. Turbo a meio do salto — segundo kick, uma vez, 5. Aterragem dura só na 45° quente, 6. Trajetória fora da pista → cai, explode, volta depois da rampa, 7. O que o ângulo **não** muda (+11 more)

### Community 56 - "RaceSimulation.ts"
Cohesion: 0.12
Nodes (19): NarratorSnapshot, RACE_PHASE, RacePhase, advanceLapProgress(), checkpointDistance(), createLapProgress(), LapProgress, IMPORTANT: Use the starting value of nextCheckpoint for the checkpoint index… (+11 more)

### Community 57 - "vec2"
Cohesion: 0.06
Nodes (19): Segment, WheelTrail, CameraContactEvent, ClusterCandidate, CatmullRomSpline, vec2, RaceField, TrackDebris (+11 more)

### Community 58 - "New tasks opened 2026-08-16 by the owner (T-043..T-047)"
Cohesion: 0.11
Nodes (18): Agents involved this round, Context cleanup — 2026-08-16 01:00 — context reached 375k, past the 290k ceiling, Context cleanup — 2026-08-16 06:20 — context reached 408k, past the 290k ceiling, owner restarting for mobile, Final handoff — 2026-08-16 ~01:40 — Cursor session (Grok) picked up from the 01:05 Claude handoff, Final handoff — 2026-08-16 ~03:35 — Cursor session (Opus) — Competitive NPCs / Aim / Race Flow / 30 Tracks, How the next agent continues — unchanged order, now with the decisions settled, Known balance finding (honest, not a bug), New tasks opened 2026-08-16 by the owner (T-043..T-047) (+10 more)

### Community 59 - "Final handoff — 2026-08-16 01:05 — the owner called the end of the session ("logo vao acabar os tokens")"
Cohesion: 0.29
Nodes (7): Final handoff — 2026-08-16 01:05 — the owner called the end of the session ("logo vao acabar os tokens"), Shipped this session, Start here next session, in this order, The two owner decisions, settled — do not re-open either, Tooling added this session — do not re-derive it, Two gates only the owner can close, Two questions put to the owner and NOT yet answered

### Community 60 - "PlanetSelectScene.ts"
Cohesion: 0.09
Nodes (20): bindMenuKeys(), MenuKeyHandlers, clampIndex(), MENU_KIND, MENU_PROMPT_LIST, MENU_PROMPT_OPTIONS, MenuActionSpec, MenuController (+12 more)

### Community 61 - "VehicleCapabilityModel.ts"
Cohesion: 0.13
Nodes (15): TUNING_STILL_REQUIRED, buildStatNormalizer(), capabilitiesFromStats(), FIELDS, minMax(), mix(), StatNormalizer, gun (+7 more)

### Community 62 - "vercel.json"
Cohesion: 0.33
Nodes (5): buildCommand, framework, installCommand, outputDirectory, rewrites

### Community 63 - "Context cleanup — 2026-08-16 00:25 — context reached 344k, past the 290k ceiling"
Cohesion: 0.33
Nodes (6): A new verification tool exists — do not re-derive it, Agents involved this round, Context cleanup — 2026-08-16 00:25 — context reached 344k, past the 290k ceiling, How the next agent continues, Standing lessons, all already paid for here, The owner opened a LOT of new scope this turn. All of it is recorded below as T-043..T-047

### Community 64 - "Context cleanup — 2026-08-16 00:55 — context reached 312k, past the 290k ceiling"
Cohesion: 0.33
Nodes (6): Agents involved this round, Context cleanup — 2026-08-16 00:55 — context reached 312k, past the 290k ceiling, How the next agent continues, Standing lessons, every one already paid for here, T-037 is functionally complete. The measured outcomes, so nobody re-derives them, What the owner asked for this session, in their own words

### Community 65 - "VehicleStats"
Cohesion: 0.10
Nodes (33): AgentDecision, AgentTickInput, baselineOffset(), offsetAt(), RacingLine, trackSurfaceGrip(), TrackProjection, AI_DEFAULT_AGGRESSION (+25 more)

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

### Community 71 - "TitleAudio"
Cohesion: 0.13
Nodes (3): BedPlayer, TitleAudio, TitleMusic

### Community 72 - "RaceScene.ts"
Cohesion: 0.08
Nodes (44): DEBUG_IA_LOG_INTERVAL_SECONDS, DEBUG_IA_LOG_URL, debugIaLogFileName(), DebugIaLogLine, postDebugIaLogs(), PendingExplosion, PendingScrap, CAMERAS_ASSET_DIRECTORY (+36 more)

### Community 73 - "Context cleanup — 2026-08-15 23:10 — context reached 312k, past the 290k ceiling"
Cohesion: 0.50
Nodes (4): Agents involved this round, Art was reorganised this turn — the old paths are gone, do not look for them, Context cleanup — 2026-08-15 23:10 — context reached 312k, past the 290k ceiling, How the next agent continues

### Community 74 - "RacingAgent.ts"
Cohesion: 0.26
Nodes (12): interceptPoint(), observedPosition(), predictionTime(), predictPosition(), relativeSpeedAlong(), AgentRival, closestAhead(), closestBehind() (+4 more)

### Community 78 - "JumpCharges.ts"
Cohesion: 0.27
Nodes (11): clamp(), consumeJump(), createJumpCharges(), HOP_LAUNCH_SPEED, HOP_REF_MASS, HOP_REF_SPEED, HOP_SCALE_MAX, HOP_SCALE_MIN (+3 more)

### Community 79 - "ResultsLayout.ts"
Cohesion: 0.18
Nodes (13): clamp(), layoutResults(), Point, RESULTS_SAFE_INSET, ResultsLayout, ResultsLayoutSpec, sane(), Size (+5 more)

### Community 80 - "TrackSelectScene"
Cohesion: 0.25
Nodes (3): CampaignTrack, formatCash(), TrackSelectScene

### Community 83 - "MetalScrapEffect.ts"
Cohesion: 0.23
Nodes (14): FlyingScrap, SCRAP_HARD_COUNT, SCRAP_HARD_SPEED, SCRAP_LIGHT_COUNT, SCRAP_MEDIUM_COUNT, SCRAP_MEDIUM_SPEED, SCRAP_ROSTER_SIZE, SCRAP_SPRITES (+6 more)

### Community 84 - ".create"
Cohesion: 0.19
Nodes (10): debugIaModeFromSearch(), debugIaSeed(), debugIaSeedFromSearch(), debugIaTrackFromSearch(), enableDebugIaMode(), enableDebugIaModeFromSearch(), paramsFrom(), cartPortraitKey() (+2 more)

### Community 86 - "HudScene"
Cohesion: 0.18
Nodes (3): HudText, barColour(), HudScene

### Community 87 - "NarratorBank.ts"
Cohesion: 0.18
Nodes (10): createElement(), NarratorPlayer, BANTER_EXTRA_IDS, NARRATOR_LAB_DIRECTORY, NARRATOR_STASH_DIRECTORY, NarratorClip, narratorClipKey(), narratorClipUrl() (+2 more)

### Community 88 - "NarratorPlan.ts"
Cohesion: 0.27
Nodes (16): banterLines(), linesInCategory(), pickNarratorVoice(), buildEventPool(), clampInt(), clipFor(), finalLapHoles(), nextWeighted() (+8 more)

### Community 89 - "Iso car strip"
Cohesion: 0.20
Nodes (10): After images exist, Contract (not negotiable), Forbidden, Image prompt (game cell), Image prompt (HQ still), Inputs (refuse if missing), Iso car strip, Next car (+2 more)

### Community 90 - "SeasonPoints.ts"
Cohesion: 0.15
Nodes (20): BASE_FIRST_POINTS, CASH_IN_PAYOUT, cashInBatches(), cashInValue(), CONTACT_HIT_POINTS, firstPlacePoints(), hitScale(), MINE_HIT_POINTS (+12 more)

### Community 91 - "RaceField.test.ts"
Cohesion: 0.17
Nodes (13): RAMP_LANDING_STUN_SECONDS, carsJsonPath, freshSpline(), FULL_THROTTLE, fullFieldEntries(), makeField(), manifest, projectRoot (+5 more)

### Community 92 - "findCarSheet"
Cohesion: 0.19
Nodes (3): findCarSheet(), assignNpcCars(), ROSTER

### Community 93 - "RaceField.ts"
Cohesion: 0.05
Nodes (78): isWarTankPerk(), VEC2_ZERO, CONTACT_SIDE, ContactSide, RaceFieldOptions, RacerEntry, RacerRuntime, RivalView (+70 more)

### Community 94 - "Music brief — 10 original race beds"
Cohesion: 0.33
Nodes (5): Delivery, Music brief — 10 original race beds, Specs, Style, Use

### Community 95 - "TrackSpline"
Cohesion: 0.06
Nodes (51): GENERATED_TRACKS, findTrack(), thunderBasin, innerWallParkPose, angleOf(), distanceSquared(), meanCornerTightness(), buildLineCandidates() (+43 more)

### Community 96 - "DriverProfile.ts"
Cohesion: 0.11
Nodes (35): deriveProfile(), WEIGHT_SALTS, clampWeights(), DERIVED_SPECS, DRIVER_PROFILE_TIER, DRIVER_WEIGHT_IDS, DriverProfile, DriverProfileTier (+27 more)

### Community 97 - "trackgen/preview.ts"
Cohesion: 0.15
Nodes (20): COLOR_BACKGROUND, COLOR_CHECKPOINT, COLOR_CONTROL, COLOR_FAST, COLOR_SHOULDER, COLOR_START, COLOR_SURFACE, COLOR_TIGHT (+12 more)

### Community 98 - "circuit-maps.ts"
Cohesion: 0.05
Nodes (59): DRIVER_CARD_DIRECTORY, DRIVER_CARDS, DriverCard, driverCardForName(), driverCardUrl(), CHAMPIONSHIP_SIZE, drawRivalNames(), JOKER_PILOTS (+51 more)

### Community 99 - "CarManifest.ts"
Cohesion: 0.10
Nodes (31): CarManifestError, cartPortraitFile(), cartPortraitLegacyFile(), cartPortraitToken(), foldCollisionStats(), frameIndexForHeading(), KNOWN_CAR_PERKS, matrixHeroFile() (+23 more)

### Community 100 - "Game map traps"
Cohesion: 0.12
Nodes (14): Crate hit, Drum blast, Game map traps — numbers, Pixel art (`npm run gen:traps-art`), Placement, Pool and spawn, After changing a track, Art (+6 more)

### Community 101 - "PlannedClip"
Cohesion: 0.13
Nodes (12): PlannedClip, CursorKey, NarratorOffer, ScheduledBanter, NARRATOR_MAX_SEQUENCE, NARRATOR_PRIORITY, NarratorPriority, NarratorQueue (+4 more)

### Community 102 - "Sprite-strip"
Cohesion: 0.20
Nodes (10): After images exist, Contract (not negotiable), Forbidden, Image prompt (game cell), Image prompt (HQ still), Inputs (refuse if missing), Next car, Outputs (+2 more)

### Community 103 - "sprite-strip/SKILL.md"
Cohesion: 0.25
Nodes (4): 3/4 painted size (frames 0, 8, 16, 24), Check, Fit — generated still → 128 cell, Steps

### Community 104 - "analyzeTrackTraps.ts"
Cohesion: 0.07
Nodes (46): parseSlot(), parseSlots(), parseTrackTrapCatalog(), requireNumber(), requireString(), TrackTrapsError, analyzeTrackTraps(), Candidate (+38 more)

### Community 105 - "Game sprint sprites 2D"
Cohesion: 0.25
Nodes (8): Como aplicar, Como usar (melhor forma), Game sprint sprites 2D, Nomes (sempre), O herói pode estar à direita ou à esquerda, O que o humano deu, Por que isto é espetacular, Proibido

### Community 106 - "generate-lab.ts"
Cohesion: 0.13
Nodes (17): LINES_BY_ID, NARRATOR_CATEGORY, NARRATOR_LINES, NARRATOR_VOICES, NarratorCategory, narratorClipFile(), narratorLine, clipsInPlan() (+9 more)

### Community 107 - "Carros novos — deixa os heróis aqui"
Cohesion: 0.40
Nodes (4): Carros novos — deixa os heróis aqui, Nomes (sempre), O que o Cursor faz, Onde fica cada coisa

### Community 108 - "SevenSegment.test.ts"
Cohesion: 0.18
Nodes (15): BLANK_PATTERN, DIGIT_PATTERNS, isSegmentLit(), WHY: the vertical segments (f/b, e/c) already occupy the full `STROKE` width at…, SEGMENT, SEGMENT_LAYOUT, SegmentName, SegmentRect (+7 more)

### Community 109 - "car-1 — Marauder"
Cohesion: 0.33
Nodes (5): car-1 — Marauder, Do not change, Lock, Outputs, Refs in this pack

### Community 110 - "Uso — melhor forma"
Cohesion: 0.29
Nodes (7): Duas skills, Frases más → o que fazer em vez, Invocar, Melhor forma (esta ordem), O que o agente não pede, O que o humano prepara, Uso — melhor forma

### Community 113 - "UtilityEvaluator.ts"
Cohesion: 0.18
Nodes (18): formatAiOverlay(), safe(), EXECUTION_STATE, evaluateOpportunities(), NearbyRival, RaceSituation, raceTacticalValue(), SituationOpportunities (+10 more)

### Community 114 - "matrix_car — pasta oficial"
Cohesion: 0.14
Nodes (11): Inventário 1_hero, Índice = relógio = ângulo (car_1), Contrato rápido, Inventário `1_hero` (agora), matrix_car — pasta oficial, O que é cada coisa, Inventário `1_hero`, Referência rápida (gabarito) (+3 more)

### Community 115 - "Clock — 32 poses"
Cohesion: 0.40
Nodes (5): Anchors (draw these first), Clock — 32 poses, Full table, Lights and parts by yaw, Size — fixed world, not fill-the-cell

### Community 116 - "Collision — one square, midpoint"
Cohesion: 0.40
Nodes (4): After a new strip, Collision — one square, midpoint, One box for every yaw, Where it lives

### Community 118 - "CameraPreset.ts"
Cohesion: 0.21
Nodes (14): CameraImpulseSample, ImpulseKind, CAMERA_CLUSTER_RADIUS_UNITS, CAMERA_EXPLOSION_KICK, CAMERA_EXPLOSION_ZOOM_IN, CAMERA_EXPLOSION_ZOOM_OUT, CAMERA_HIT_SHAKE_LEFT, CAMERA_HIT_SHAKE_RIGHT (+6 more)

### Community 119 - "HudFormat.ts"
Cohesion: 0.32
Nodes (9): formatCountdown(), formatHud(), formatIntegrityPercent(), formatRaceTime(), formatSpeed(), formatSpeedDigits(), formatSpeedFraction(), MPH_PER_WORLD_UNIT (+1 more)

### Community 120 - "Regras — tira de relógio (car-1)"
Cohesion: 0.29
Nodes (6): Contrato, Ordem, Proibido, Prompt de cada célula 128×128, Prompt de cada HQ 512×512, Regras — tira de relógio (car-1)

### Community 121 - "Matrix car rotate"
Cohesion: 0.15
Nodes (11): Fórmulas, Inventário car_1 (exemplo), Matrix car — referência do relógio, Tabela 0…29, Âncoras (usuário), Matrix car rotate, Non-negotiable, Prompt (+3 more)

### Community 122 - "car-1 — Marauder"
Cohesion: 0.33
Nodes (5): car-1 — Marauder, Do not change, Lock, Outputs, Refs in this pack

### Community 123 - "RacingAgent"
Cohesion: 0.14
Nodes (13): OpponentMemoryEntry, AgentDebugSnapshot, emptyCapabilities(), executionOf(), lengthish(), RacingAgent, wrappedGap(), TrajectoryPlan (+5 more)

### Community 124 - "Clock — 32 poses"
Cohesion: 0.33
Nodes (5): Anchors (draw these first), Clock — 32 poses, Full table, Lights and parts by yaw, Size — fixed world, not fill-the-cell

### Community 128 - "matrix_car — pasta oficial"
Cohesion: 0.18
Nodes (9): Contrato rápido, Inventário `1_hero` (agora), matrix_car — pasta oficial, O que é cada coisa, Inventário `1_hero`, Referência rápida (gabarito), Regras (igual ao gabarito), Relógio + índice das 30 imagens (+1 more)

### Community 131 - "Game nível"
Cohesion: 0.12
Nodes (14): Armadilhas, Exemplo, Ficheiros, Game nível — conversão, Os 10 knobs, Pista, Conversão rápida, Depois de escrever (+6 more)

### Community 133 - "clamp01"
Cohesion: 0.22
Nodes (11): clamp01(), decayField(), decayMemory(), emptyMemory(), memoryEffect(), OpponentMemoryBook, recordBlockedBy(), recordNearMiss() (+3 more)

### Community 134 - "CameraDirector.ts"
Cohesion: 0.18
Nodes (10): CAMERA_OVERRIDE, CameraDirector, CameraDirectorSample, CameraOverride, CAMERA_MANUAL_HOLD_SECONDS, CAMERA_MAX_ZOOM_IN, CAMERA_TRIGGER_HOLD_SECONDS, CameraPreset (+2 more)

### Community 135 - "WatchField.ts"
Cohesion: 0.19
Nodes (14): enableWatchMode(), enableWatchModeFromSearch(), watchModeFromSearch(), watchTrackFromSearch(), isNewFleetCarId(), driverSkill(), nextWatchTrack(), splitWatchRoster() (+6 more)

### Community 136 - "IsoProjection"
Cohesion: 0.17
Nodes (6): ChaseCamera, Burst, HitRewardEffect, rewardLabel(), Star, IsoProjection

### Community 137 - "Cloud Agent — Metade B (fila 18 → 33)"
Cohesion: 0.12
Nodes (15): A) 30 frames → `public/matrix_car/{N}_hero/car_{N}_a{III}.png`, B) Strip + JSON, C) Pack tar.gz + apagar PNG soltos, Cloud Agent — Metade B (fila 18 → 33), Contrato, D) Conferir, Deliverable final (cada pasta), Fila (+7 more)

### Community 138 - "math.ts"
Cohesion: 0.46
Nodes (5): hash32(), hashUnit(), lerp(), applySkillToDriveOptions(), skillControlLimits

### Community 139 - "TyreMarks"
Cohesion: 0.21
Nodes (3): freshAlphaFor(), slideIntensity(), TyreMarks

### Community 140 - "TourMode.ts"
Cohesion: 0.54
Nodes (6): enableTourMode(), enableTourModeFromSearch(), feedTourCode(), resetTourMode(), TOUR_CODE, tourModeFromSearch()

### Community 141 - "flood_black_to_alpha"
Cohesion: 0.36
Nodes (6): main(), Accept a generated frame into frames_300/{CAR}/. Refuses any size other than…, flood_black_to_alpha(), main(), Image, Flood-fill near-black background from the canvas edges to alpha 0. Does not…

### Community 142 - "MusicPlayer"
Cohesion: 0.23
Nodes (3): clampUnit(), MusicPlayer, MusicScore

### Community 143 - "TrackLines.ts"
Cohesion: 0.52
Nodes (5): parseLine(), parseTrackLinesManifest(), requireNumber(), requireString(), TrackLinesError

### Community 144 - "trackgen/generate.ts"
Cohesion: 0.10
Nodes (35): campaignSlotForTrackId(), campaignTracks(), isPlanetUnlocked(), isTrackUnlocked(), nextCampaignTrack(), planetTracks(), ANCHOR_TRACK_ID, AUTHORED_TRACK_IDS (+27 more)

### Community 145 - "Escala de produção — matrix_car → jogo"
Cohesion: 0.22
Nodes (8): car_1 as is, Centro da imagem, Converter um array de pontos, Escala de produção — matrix_car → jogo, Exemplos (`Math.round(v * 64 / 1700)`), Fator (JS / arrays / colisão), ImageMagick (só PNG), Importante

### Community 146 - "Isometric cam man — numbers"
Cohesion: 0.15
Nodes (11): Classification (arc length, span 45), Impulse (player only), Isometric cam man — numbers, Keys, Runtime files, Zoom band, After changing a track or line, Isometric cam man (+3 more)

### Community 147 - "Cloud Agent — Metade B (fila 18 → 33)"
Cohesion: 0.12
Nodes (15): A) 30 frames → `public/matrix_car/{N}_hero/car_{N}_a{III}.png`, B) Strip + JSON, C) Pack tar.gz + apagar PNG soltos, Cloud Agent — Metade B (fila 18 → 33), Contrato, D) Conferir, Deliverable final (cada pasta), Fila (+7 more)

### Community 148 - "package.json"
Cohesion: 0.18
Nodes (10): dependencies, phaser, description, engines, node, name, private, type (+2 more)

### Community 149 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, pngjs, @types/pngjs, typescript, vite, vitest, pngjs, @types/pngjs (+3 more)

### Community 151 - "WoodDebrisEffect.ts"
Cohesion: 0.23
Nodes (5): chipKey(), FALLBACK_COLORS, FlyingChip, WoodDebrisEffect, CRATE_WOOD_LIFE_SECONDS

### Community 152 - "TrackCameras.ts"
Cohesion: 0.36
Nodes (7): parseKind(), parseTrackCameraPreset(), parseTrigger(), requireNumber(), requireString(), TrackCamerasError, CameraTriggerKind

### Community 153 - "CarStatBars.test.ts"
Cohesion: 0.16
Nodes (11): normalise(), safeStat(), STAT_BAR_FIELDS, StatBar, statBars(), BASE_STATS, carIds, carsJsonPath (+3 more)

### Community 155 - "build_strip.py"
Cohesion: 0.50
Nodes (4): bbox_of(), main(), Image, Build horizontal sprite strip from N frames at a fixed source canvas size. ONLY…

### Community 156 - "Game jornal"
Cohesion: 0.29
Nodes (6): Como medir “desde a última iteração”, Depois de escrever, Formato (obrigatório), Game jornal, Onde, Quando

### Community 157 - "build_matrix_strip.py"
Cohesion: 0.21
Nodes (16): build_strip(), extract_sources_tar(), list_frame_paths(), main(), production_scale_block(), px(), Image, Path (+8 more)

### Community 158 - "constants.ts"
Cohesion: 0.10
Nodes (28): SCREEN_ROTATION_SIGN, ISO_X, ISO_Y, ISO_Z, OFFROAD_GRIP_MULTIPLIER, OFFROAD_ROLLING_RESISTANCE, OVERSPEED_ALLOWANCE, PaletteRole (+20 more)

### Community 159 - "CarSetManifest"
Cohesion: 0.23
Nodes (11): VehicleView, CarSetManifest, sheetCellSize(), TrackLinesManifest, GarageSceneData, PauseSceneData, RaceSceneData, ResultsSceneData (+3 more)

### Community 160 - ".step"
Cohesion: 0.09
Nodes (35): planningCapabilities(), planningStats(), HOME_WORLD_STAT_BONUS, InputCommand, rampRespawnDistance(), applyDirectDamage(), applyImpactDamage(), applyWeaponDamage() (+27 more)

### Community 161 - "ReverseLatch"
Cohesion: 0.17
Nodes (4): KeyboardDriver, DriveIntent, ReverseLatch, ReverseLatchOptions

### Community 162 - "Prompt — 30 frames (+12°)"
Cohesion: 0.33
Nodes (5): Contrato, Correção, Ordem de geração, Prompt — 30 frames (+12°), Prompt (colar; anexar a vitrine só como referência de identidade)

### Community 163 - "JOURNAL"
Cohesion: 0.50
Nodes (3): 2026-08-17 — A câmara passa a dirigir a corrida, 2026-08-17 — A frota-relógio entra no watch, JOURNAL

### Community 165 - "SpeedoGauge.ts"
Cohesion: 0.17
Nodes (9): BarPoint, barProfileAt(), COLOUR_STOPS, colourAtT(), dimColour(), lerpColour(), SpeedoGauge, SpeedoGaugeOptions (+1 more)

### Community 166 - "Escala de produção — matrix_car → jogo"
Cohesion: 0.22
Nodes (8): car_1 as is, Centro da imagem, Converter um array de pontos, Escala de produção — matrix_car → jogo, Exemplos (`Math.round(v * 64 / 1700)`), Fator (JS / arrays / colisão), ImageMagick (só PNG), Importante

### Community 167 - "Prompt — 30 frames (+12°)"
Cohesion: 0.33
Nodes (5): Contrato, Correção, Ordem de geração, Prompt — 30 frames (+12°), Prompt (colar; anexar a vitrine só como referência de identidade)

### Community 169 - "ArcadeCarPhysics.ts"
Cohesion: 0.08
Nodes (34): LATERAL_GRIP_STIFFNESS, REVERSE_SPEED_FRACTION, SIMULATION_STEP_SECONDS, TARMAC_ROLLING_RESISTANCE, clampSigned(), clampUnit(), IDLE_INPUT, sanitizeInput() (+26 more)

### Community 170 - "Prompt — front half-rotation (15 frames × 12°)"
Cohesion: 0.50
Nodes (3): Angles (front half only), Prompt — front half-rotation (15 frames × 12°), Prompt template

### Community 171 - "Process — duas metades"
Cohesion: 0.29
Nodes (6): Cloud (metade B), Contrato rápido, Onde achar gabarito + docs, Por frame (igual nas duas metades), Process — duas metades, Split

### Community 172 - "Prompt — rear half-rotation (15 frames × 12°)"
Cohesion: 0.50
Nodes (3): Angles (rear half only), Prompt (paste into the image model; attach the folder hero), Prompt — rear half-rotation (15 frames × 12°)

### Community 173 - "TrajectoryPlanner.ts"
Cohesion: 0.26
Nodes (11): clamp(), candidateOffsets(), LATERAL_FRACTIONS, maxSafeOffset(), NearbyLateral, planTrajectory(), scoreCandidate(), TrajectoryCandidate (+3 more)

### Community 176 - "ia-log-server.mjs"
Cohesion: 0.33
Nodes (4): DRIVERS, seen, server, sessionLog

### Community 180 - "CameraImpulse"
Cohesion: 0.29
Nodes (3): CameraImpulse, hitOffsetX(), lerp()

### Community 181 - "Process — duas metades"
Cohesion: 0.29
Nodes (6): Cloud (metade B), Contrato rápido, Onde achar gabarito + docs, Por frame (igual nas duas metades), Process — duas metades, Split

### Community 182 - "Cloud handoff — metade B"
Cohesion: 0.33
Nodes (5): Cloud handoff — metade B, Inventário esperado ao começar, Onde achar gabarito + docs, Por onde começar (metade B), Split

### Community 183 - "Cloud handoff — metade B"
Cohesion: 0.33
Nodes (5): Cloud handoff — metade B, Inventário esperado ao começar, Onde achar gabarito + docs, Por onde começar (metade B), Split

### Community 185 - "CameraZoomPolicy.ts"
Cohesion: 0.29
Nodes (6): CameraZoomPolicy, CameraZoomPolicyOptions, CAMERA_CLOSE_ZOOM, CAMERA_CORNER_CURVATURE, CAMERA_HOME_ZOOM, CAMERA_WIDE_ZOOM

### Community 186 - "ResultsScene.ts"
Cohesion: 0.14
Nodes (16): Plate, paintRoundedPlaque(), PLAQUE_INK, PLAQUE_LINE, PlaquePaint, pickPubBackground(), PUB_BACKGROUND_DIRECTORY, PUB_BACKGROUNDS (+8 more)

### Community 188 - "HudScene.ts"
Cohesion: 0.18
Nodes (8): HudReadout, HudSource, LOADOUT_ICON_KEYS, HUD_JUMP_KEY, HUD_MINE_KEY, HUD_MISSILE_KEY, HUD_OIL_KEY, HUD_TURBO_KEY

### Community 189 - "ControlList.ts"
Cohesion: 0.28
Nodes (7): controlBlock(), ControlRow, formatHelpBody(), MENU_CONTROLS, RACE_DRIVE_CONTROLS, RACE_SYSTEM_CONTROLS, RACE_WEAPON_CONTROLS

### Community 193 - "containSize"
Cohesion: 0.60
Nodes (3): containSize(), FitSize, sane()

### Community 195 - "pack_folder"
Cohesion: 0.67
Nodes (3): main(), pack_folder(), Path

## Knowledge Gaps
- **1003 isolated node(s):** `name`, `version`, `private`, `type`, `description` (+998 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `writePng()` connect `spritegen/preview.ts` to `fit-redrawn.ts`, `circuit-maps.ts`, `trackgen/preview.ts`, `import-fleet.ts`, `BUFFER`, `qa-strip.ts`, `renderCar.ts`, `pack-redrawn.ts`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `BUFFER` connect `BUFFER` to `generate-hud-icons.ts`, `generate-lab.ts`, `generate-metal-scraps.ts`, `spritegen/preview.ts`, `generate-weapons.ts`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `RaceScene` connect `RaceScene` to `TrackRenderer.ts`, `CameraDirector.ts`, `WatchField.ts`, `IsoProjection`, `TyreMarks`, `trackgen/generate.ts`, `WoodDebrisEffect.ts`, `NarratorDirector`, `CarSetManifest`, `.step`, `ReverseLatch`, `TuningOverlay`, `.toScreen`, `RaceAudio`, `vec2`, `CameraZoomPolicy.ts`, `.followedRacer`, `PlanetSelectScene.ts`, `MetalScrapEffect`, `FixedStepLoop`, `.bindSceneKeys`, `.respawn`, `RaceScene.ts`, `findCarSheet`, `TrackSpline`, `DriverProfile.ts`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _1003 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `20 REGULARS — every planet` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `fit-redrawn.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `fleet.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13970588235294118 - nodes in this community are weakly interconnected._