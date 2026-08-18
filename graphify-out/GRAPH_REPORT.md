# Graph Report - game-race-90s  (2026-08-18)

## Corpus Check
- 467 files · ~3,414,637 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3467 nodes · 8567 edges · 182 communities (160 shown, 22 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `474fe80b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Vec2.ts
- ResultsScene
- RaceField.ts
- RivalTraits.ts
- analyzeTrackTraps.ts
- GarageScene
- vec2
- RaceField
- ProgressStore.ts
- Game sprint sprites 2D
- TrackSpline
- BootScene.ts
- RaceScene
- ArcadeCarPhysics.ts
- geometry.ts
- DriverProfile.ts
- generate-hud-icons.ts
- CarManifest.ts
- UtilityEvaluator.ts
- constants.ts
- generate-traps.ts
- MusicScore.ts
- PlanetSelectScene.ts
- .constructor
- CarPerk.test.ts
- RacingAgent.ts
- renderCar.ts
- Circuitos
- pack-redrawn.ts
- GarageCatalog.ts
- spritegen/preview.ts
- RaceField.test.ts
- SplashAttract.ts
- RaceSimulation.ts
- RampLaunch.ts
- scripts
- compilerOptions
- Array as is (car_1)
- Pilotos
- InputCommand.ts
- analyzeTrackCameras.ts
- MusicBeds.test.ts
- HudScene
- CameraPreset.ts
- new-cars.ts
- planetMusic.ts
- NoiseSource
- NarratorBank.ts
- color.ts
- trackgen/preview.ts
- TrackSpline.ts
- TrackDefinition.ts
- HelpScene
- UtilityEvaluator.test.ts
- import-fleet.ts
- NarratorQueue
- PlanetSelectScene
- WatchField.ts
- PauseScene
- generate-weapons.ts
- RaceAudio.ts
- RaceAudio
- SevenSegment.test.ts
- run-ia.ts
- trackgen/generate.ts
- CameraDirector.ts
- DebugIaMode.ts
- CarStatBars.test.ts
- NarratorPlan.ts
- build_matrix_strip.py
- TitleAudio
- SplashScene.ts
- 20 REGULARS — every planet
- generate-metal-scraps.ts
- VehicleCapabilityModel.ts
- .create
- TuningOverlay
- SeasonPoints.ts
- Intercept.ts
- MetalScrapEffect.ts
- generate-planet-select.ts
- Wallet.ts
- MusicPlayer
- KeyboardDriver.ts
- HudFormat.ts
- Delivery reports
- generate-lab.ts
- Decisões de design (arcade, não real)
- JumpCharges.ts
- RaceScene.ts
- Iso car strip
- TrajectoryPlanner.ts
- Passo a passo — matrix_car (fonte do que já fizemos)
- Passo a passo — matrix_car (fonte do que já fizemos)
- generate-ground-tiles.ts
- package.json
- devDependencies
- New tasks opened 2026-08-16 by the owner (T-043..T-047)
- EngineGearbox
- WORKLOG — concurrence-gamming
- CameraZoomPolicy.ts
- PlannedClip
- CameraImpulse
- EngineVoice
- RaceScore.ts
- loadActiveCareer
- ImpactVoice
- strip-fit.ts
- flood_black_to_alpha
- TrackRenderer
- NarratorPlayer
- Game map traps
- Cloud Agent — Metade B (fila 18 → 33)
- FixedStepLoop
- Cloud Agent — Metade B (fila 18 → 33)
- TrackLines.ts
- BUFFER
- scale
- ia-log-server.mjs
- vercel.json
- build_strip.py
- domain-purity.test.ts
- matrix_car — pasta oficial
- pack_folder
- validate_lot.py
- drive.mjs
- probe.mjs
- screenshot.mjs
- pipeline.sh
- Isometric cam man — numbers
- Matrix car rotate
- API reference for whoever picks this up
- matrix_car — pasta oficial
- Art briefs — the ten planets (T-034)
- Handoff — Claude team, 2026-08-16 ~05:00
- Escala de produção — matrix_car → jogo
- TrackCameras.ts
- Escala de produção — matrix_car → jogo
- MISSION
- compact_images.sh
- Game jornal
- Process — duas metades
- Process — duas metades
- Final handoff — 2026-08-16 01:05 — the owner called the end of the session ("logo vao acabar os tokens")
- Cloud handoff — metade B
- Prompt — 30 frames (+12°)
- Cloud handoff — metade B
- Prompt — 30 frames (+12°)
- Music brief — 10 original race beds
- Context cleanup — 2026-08-16 00:25 — context reached 344k, past the 290k ceiling
- Context cleanup — 2026-08-16 00:55 — context reached 312k, past the 290k ceiling
- Verification helpers — seeing the game with your own eyes
- Context cleanup — 2026-08-15 23:40 — the owner is clearing the session to start clean
- Context cleanup — 2026-08-15 23:55 — the owner stopped implementation and asked for a save point
- Context cleanup — 2026-08-16 00:05 — the owner is clearing the session
- JOURNAL
- Prompt — front half-rotation (15 frames × 12°)
- Prompt — rear half-rotation (15 frames × 12°)
- restore_images.sh
- AccidentWatch.ts
- Context cleanup — 2026-08-15 23:10 — context reached 312k, past the 290k ceiling
- matrix_car/PROMPT_FRONT_HALF.md
- PROMPT_MIGRATE_VITRINE.md
- matrix_car/PROMPT_REAR_HALF.md
- SUMMARY.md
- car-rotate/PROMPT_FRONT_HALF.md
- car-rotate/PROMPT_REAR_HALF.md
- circuit-maps.ts
- TyreMarks.ts
- fleet.ts
- TrackSelectScene
- fit-redrawn.ts
- CarManifest.test.ts
- SpeedoGauge.ts
- findCarSheet
- RacerRuntime
- HudReadout

## God Nodes (most connected - your core abstractions)
1. `vec2` - 98 edges
2. `RaceScene` - 81 edges
3. `RaceField` - 72 edges
4. `GarageScene` - 72 edges
5. `TrackSpline` - 71 edges
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
- `getCarStats()` --calls--> `parseCarSetManifest()`  [EXTRACTED]
  tests/domain/OnTrackStep.test.ts → src/data/cars/CarManifest.ts

## Import Cycles
- None detected.

## Communities (182 total, 22 thin omitted)

### Community 0 - "Vec2.ts"
Cohesion: 0.08
Nodes (20): ChaseCamera, ChaseCameraOptions, Burst, HitRewardEffect, rewardLabel(), Star, IsoProjection, SCREEN_ROTATION_SIGN (+12 more)

### Community 1 - "ResultsScene"
Cohesion: 0.07
Nodes (19): containSize(), FitSize, sane(), DRIVER_CARD_DIRECTORY, DRIVER_CARDS, DriverCard, driverCardForName(), driverCardKey() (+11 more)

### Community 2 - "RaceField.ts"
Cohesion: 0.06
Nodes (71): isWarTankPerk(), distance(), CONTACT_SIDE, ContactSide, rampRespawnDistance(), contactAttackCredit, CarPerkProfile, RivalAgent (+63 more)

### Community 3 - "RivalTraits.ts"
Cohesion: 0.12
Nodes (25): LineCandidate, chooseLineByAccount(), clamp(), hash32(), lineAccount(), meanAbsOffset(), PATH_CANDIDATE, PATH_KINDS (+17 more)

### Community 4 - "analyzeTrackTraps.ts"
Cohesion: 0.06
Nodes (53): parseSlot(), parseSlots(), parseTrackTrapCatalog(), requireNumber(), requireString(), TrackTrapsError, CAMERA_CURVATURE_SPAN_UNITS, RaceFieldOptions (+45 more)

### Community 5 - "GarageScene"
Cohesion: 0.09
Nodes (3): StatBar, GarageScene, HUB_FOCUS

### Community 6 - "vec2"
Cohesion: 0.07
Nodes (22): BURN_COLORS, BurnBlotch, BurnMark, Burst, BurstOptions, ExplosionEffect, ExplosionEffectOptions, FIREBALL_COLORS (+14 more)

### Community 7 - "RaceField"
Cohesion: 0.10
Nodes (11): CameraContactEvent, InputCommand, RaceField, TrackDebris, TrapSmashCue, isAirborne(), HazardBurst, oilYawSpinForArmor() (+3 more)

### Community 8 - "ProgressStore.ts"
Cohesion: 0.13
Nodes (39): activateSlot(), activeSlotIndex(), beginSlot(), CLEAR_POSITION, loadActiveName(), loadCareer(), loadSave(), occupiedNames() (+31 more)

### Community 9 - "Game sprint sprites 2D"
Cohesion: 0.05
Nodes (38): Como aplicar, Como usar (melhor forma), Game sprint sprites 2D, Nomes (sempre), O herói pode estar à direita ou à esquerda, O que o humano deu, Por que isto é espetacular, Proibido (+30 more)

### Community 10 - "TrackSpline"
Cohesion: 0.11
Nodes (22): angleOf(), distanceSquared(), buildLineCandidates(), clamp(), buildStartingGrid(), GridSlot, TrackSpline, nextCornerMarks() (+14 more)

### Community 11 - "BootScene.ts"
Cohesion: 0.09
Nodes (38): barColour(), LOADOUT_ICON_KEYS, CAMERAS_ASSET_DIRECTORY, camerasCacheKey(), CAR_ASSET_DIRECTORY, CAR_MANIFEST_KEY, CART_PORTRAIT_SIZE, DEBRIS_ASSET_DIRECTORY (+30 more)

### Community 13 - "ArcadeCarPhysics.ts"
Cohesion: 0.06
Nodes (45): LATERAL_GRIP_STIFFNESS, OFFROAD_GRIP_MULTIPLIER, OFFROAD_ROLLING_RESISTANCE, OVERSPEED_ALLOWANCE, REVERSE_SPEED_FRACTION, STEERING_AUTHORITY_SPEED, TARMAC_ROLLING_RESISTANCE, YAW_SPIN_DECAY_PER_SECOND (+37 more)

### Community 14 - "geometry.ts"
Cohesion: 0.24
Nodes (12): PaletteRole, cross(), dot(), Face, length(), prismFaces(), sectionCorners(), sub() (+4 more)

### Community 15 - "DriverProfile.ts"
Cohesion: 0.10
Nodes (36): deriveProfile(), WEIGHT_SALTS, clampWeights(), DERIVED_SPECS, DRIVER_PROFILE_TIER, DRIVER_WEIGHT_IDS, DriverProfile, DriverProfileTier (+28 more)

### Community 16 - "generate-hud-icons.ts"
Cohesion: 0.07
Nodes (37): drawBarrel(), drawJump(), drawMine(), drawMissile(), drawTurbo(), empty(), getA(), GOLD (+29 more)

### Community 17 - "CarManifest.ts"
Cohesion: 0.18
Nodes (21): applyMatrixStripToSheet(), collisionFromMatrixStrip(), foldCollisionStats(), KNOWN_CAR_PERKS, MATRIX_PRODUCTION_SCALE, MatrixStripFrameBox, parseCarSetManifest(), parseCarSheet() (+13 more)

### Community 18 - "UtilityEvaluator.ts"
Cohesion: 0.14
Nodes (25): clamp01(), memoryEffect(), storedMemory(), evaluateOpportunities(), NearbyRival, RaceSituation, raceTacticalValue(), SituationOpportunities (+17 more)

### Community 19 - "constants.ts"
Cohesion: 0.24
Nodes (15): CAR_PERK, CarPerkId, PALETTE_ROLE, SIMULATION_HZ, airBlade, airBoat, battleTrak, delorean (+7 more)

### Community 20 - "generate-traps.ts"
Cohesion: 0.08
Nodes (34): drawCrate(), drawCrateStack(), drawGasoline(), drawGasolineStack(), drawWoodChip(), empty(), getA(), GRAIN (+26 more)

### Community 21 - "MusicScore.ts"
Cohesion: 0.14
Nodes (26): barCount(), barHasLick(), barIndexForStep(), BEATS_PER_BAR, beatsToSeconds(), ChordStep, DrumStep, eighthInBarForStep() (+18 more)

### Community 22 - "PlanetSelectScene.ts"
Cohesion: 0.09
Nodes (22): bindMenuKeys(), MenuKeyHandlers, clampIndex(), MENU_KIND, MENU_PROMPT_LIST, MENU_PROMPT_OPTIONS, MenuActionSpec, MenuController (+14 more)

### Community 23 - ".constructor"
Cohesion: 0.18
Nodes (11): meanCornerTightness(), findLineForCar(), driveOptionsFor(), consumeTurbo(), createTurboCharges(), refillTurboCharges(), TURBO_DURATION_SECONDS, TURBO_SPEED_BONUS (+3 more)

### Community 24 - "CarPerk.test.ts"
Cohesion: 0.09
Nodes (31): HOME_WORLD_STAT_BONUS, WORLD_ADVANTAGE, TARMAC, applyDirectDamage(), applyImpactDamage(), applyWeaponDamage(), CAR_CONDITION, CarCondition (+23 more)

### Community 25 - "RacingAgent.ts"
Cohesion: 0.15
Nodes (20): relativeSpeedAlong(), OpponentMemoryEntry, AgentDebugSnapshot, AgentRival, closestAhead(), closestBehind(), emptyCapabilities(), executionOf() (+12 more)

### Community 26 - "renderCar.ts"
Cohesion: 0.13
Nodes (31): bestCollisionBox(), collisionSquares(), collisionBoxForCarId(), collisionBoxFromDef(), FLEET_MODEL_ID, rounded(), withCollisionBox(), buildFaces() (+23 more)

### Community 27 - "Circuitos"
Cohesion: 0.05
Nodes (41): Ash Reach, Ash Reach I, Ash Reach II, Ash Reach III, Bogmire Deep, Bogmire Deep I, Bogmire Deep II, Bogmire Deep III (+33 more)

### Community 28 - "pack-redrawn.ts"
Cohesion: 0.09
Nodes (50): chroma(), isInkBlack(), isPaper(), luma(), main(), nearest(), parseArgs(), poseBudget() (+42 more)

### Community 29 - "GarageCatalog.ts"
Cohesion: 0.19
Nodes (19): CAR_TIER, CarTier, carUnlockHint(), catalogEntry, GARAGE_CATALOG, isCarUnlocked(), isStarterCar(), listPrice() (+11 more)

### Community 30 - "spritegen/preview.ts"
Cohesion: 0.27
Nodes (10): HERE, loadUnregistered(), looksLikeCarModel(), main(), PREVIEW_BACKGROUND, PREVIEW_BORDER, PREVIEW_DIRECTORY, resolveTargets() (+2 more)

### Community 31 - "RaceField.test.ts"
Cohesion: 0.11
Nodes (18): innerWallParkPose, lerp(), RAMP_LANDING_DAMAGE, RAMP_LANDING_STUN_SECONDS, trackFullHalfWidth(), carsJsonPath, collideWithRearPerk(), freshSpline() (+10 more)

### Community 32 - "SplashAttract.ts"
Cohesion: 0.06
Nodes (57): GARAGE_ART_SIZE, GARAGE_BAY, GARAGE_VIEW, garageBayRect(), garageHeroLayout, garageViewPoint(), HERO_OPAQUE, HERO_WINDSHIELD (+49 more)

### Community 33 - "RaceSimulation.ts"
Cohesion: 0.19
Nodes (12): advanceLapProgress(), checkpointDistance(), LapProgress, IMPORTANT: Use the starting value of nextCheckpoint for the checkpoint index…, RacerProgress, RacerStanding, rankRacers(), advanceRace() (+4 more)

### Community 34 - "RampLaunch.ts"
Cohesion: 0.07
Nodes (58): dot(), fromAngle(), normalize(), perpendicularLeft(), subtract(), aggressorOf(), computeRawDraft(), DraftCandidate (+50 more)

### Community 35 - "scripts"
Cohesion: 0.07
Nodes (30): scripts, build, debug:ia, dev, gen:cameras, gen:car-strip, gen:carts, gen:collision-maps (+22 more)

### Community 36 - "compilerOptions"
Cohesion: 0.07
Nodes (28): DOM, DOM.Iterable, ES2022, src, tests, tools, vite/client, vitest/globals (+20 more)

### Community 37 - "Array as is (car_1)"
Cohesion: 0.05
Nodes (39): Array as is (car_1), ARRAY_ROTATED_FIRST — as is, Colisão (um retângulo só), Escala de produção, indice[0], indice[1], indice[10], indice[11] (+31 more)

### Community 38 - "Pilotos"
Cohesion: 0.06
Nodes (31): Agent (derivado do mesmo seed), ALINE, ASH, BLAZE, CRUZ, DAVE, DIEGO, Driver Personality (+23 more)

### Community 39 - "InputCommand.ts"
Cohesion: 0.18
Nodes (9): SIMULATION_STEP_SECONDS, IDLE_INPUT, CEREMONY_HOLD_SECONDS, COAST_BRAKE, COAST_STOP_SPEED, coastInput(), isNearlyStopped(), manifest (+1 more)

### Community 40 - "analyzeTrackCameras.ts"
Cohesion: 0.18
Nodes (15): analyzeTrackCameras(), classify(), collectSegments(), countTriggers(), RawSegment, referenceZoomOut50(), SampleKind, segmentLength() (+7 more)

### Community 41 - "MusicBeds.test.ts"
Cohesion: 0.19
Nodes (15): isAudioMuted(), setAudioMuted(), clearLoadedMusicBeds(), loaded, loadedMusicBeds(), markMusicBedLoaded(), pickLoadedMusicBed(), createAudioContext() (+7 more)

### Community 43 - "CameraPreset.ts"
Cohesion: 0.26
Nodes (11): CameraImpulseSample, ImpulseKind, CAMERA_EXPLOSION_KICK, CAMERA_EXPLOSION_ZOOM_IN, CAMERA_EXPLOSION_ZOOM_OUT, CAMERA_HIT_SHAKE_LEFT, CAMERA_HIT_SHAKE_RIGHT, CAMERA_HIT_SHAKE_SECONDS (+3 more)

### Community 44 - "new-cars.ts"
Cohesion: 0.27
Nodes (9): cartHeroFile(), cartStripFile(), CARS_DIR, listNewCars(), NEW_CARS_DIR, NewCarDrop, REPO_ROOT, installStrip() (+1 more)

### Community 45 - "planetMusic.ts"
Cohesion: 0.10
Nodes (20): ASH_REACH_SCORE, BOGMIRE_DEEP_SCORE, CHROME_VERGE_SCORE, CRYO_HOLLOW_SCORE, DOUBLE_KICK_DRUM, everyPlanetHasMusic(), FERRO_RUST_SCORE, HEAVY_STRUM (+12 more)

### Community 46 - "NoiseSource"
Cohesion: 0.16
Nodes (5): BrakeVoice, clampUnit(), clampUnit(), ExplosionVoice, NoiseSource

### Community 47 - "NarratorBank.ts"
Cohesion: 0.17
Nodes (14): createElement(), BANTER_EXTRA_IDS, LINES_BY_ID, NARRATOR_CATEGORY, NARRATOR_LAB_DIRECTORY, NARRATOR_LINES, NARRATOR_STASH_DIRECTORY, NarratorClip (+6 more)

### Community 48 - "color.ts"
Cohesion: 0.11
Nodes (18): SHADE_STEP, ShadeStep, clampByte(), parseHex(), quantize(), RAMP_FACTORS, RampTable, ResolvedPalette (+10 more)

### Community 49 - "trackgen/preview.ts"
Cohesion: 0.15
Nodes (20): COLOR_BACKGROUND, COLOR_CHECKPOINT, COLOR_CONTROL, COLOR_FAST, COLOR_SHOULDER, COLOR_START, COLOR_SURFACE, COLOR_TIGHT (+12 more)

### Community 50 - "TrackSpline.ts"
Cohesion: 0.10
Nodes (32): AgentDecision, AgentTickInput, cross(), RacingLine, trackSurfaceGrip(), TrackProjection, AI_DEFAULT_AGGRESSION, AIDriver (+24 more)

### Community 51 - "TrackDefinition.ts"
Cohesion: 0.11
Nodes (24): GENERATED_TRACKS, findTrack(), TRACKS, thunderBasinTwo, thunderBasin, createLapProgress(), RampZone, GasolineBarrelPlacement (+16 more)

### Community 52 - "HelpScene"
Cohesion: 0.15
Nodes (8): controlBlock(), ControlRow, formatHelpBody(), MENU_CONTROLS, RACE_DRIVE_CONTROLS, RACE_SYSTEM_CONTROLS, RACE_WEAPON_CONTROLS, HelpScene

### Community 53 - "UtilityEvaluator.test.ts"
Cohesion: 0.19
Nodes (8): decayField(), decayMemory(), emptyMemory(), OpponentMemoryBook, recordBlockedBy(), recordNearMiss(), recordRamReceived(), recordWeaponHitReceived()

### Community 54 - "import-fleet.ts"
Cohesion: 0.09
Nodes (35): CAR_FRAME_HEIGHT, CAR_FRAME_WIDTH, CAR_SPRITE_FRAMES, carsDir, manifest, projectRoot, testFileDir, CARS_DIRECTORY (+27 more)

### Community 55 - "NarratorQueue"
Cohesion: 0.14
Nodes (7): NARRATOR_MAX_SEQUENCE, NARRATOR_PRIORITY, NarratorQueue, A, B, C, D

### Community 57 - "WatchField.ts"
Cohesion: 0.19
Nodes (14): enableWatchMode(), enableWatchModeFromSearch(), watchModeFromSearch(), watchTrackFromSearch(), isNewFleetCarId(), driverSkill(), nextWatchTrack(), splitWatchRoster() (+6 more)

### Community 59 - "generate-weapons.ts"
Cohesion: 0.19
Nodes (18): chunk(), crc32(), drawMine(), drawMissile(), drawOil(), drawTurbo(), emptyFrame(), encodePng() (+10 more)

### Community 60 - "RaceAudio.ts"
Cohesion: 0.27
Nodes (9): ENGINE_IDLE_SHUTOFF_INITIAL, ENGINE_IDLE_SHUTOFF_PARKED, ENGINE_IDLE_SHUTOFF_SECONDS, ENGINE_RESTART_DRIVE, EngineIdleShutoffState, shouldParkEngine(), tickEngineIdleShutoff(), createAudioContext() (+1 more)

### Community 61 - "RaceAudio"
Cohesion: 0.10
Nodes (3): RaceAudio, clampUnit(), SkidVoice

### Community 62 - "SevenSegment.test.ts"
Cohesion: 0.18
Nodes (15): BLANK_PATTERN, DIGIT_PATTERNS, isSegmentLit(), WHY: the vertical segments (f/b, e/c) already occupy the full `STROKE` width at…, SEGMENT, SEGMENT_LAYOUT, SegmentName, SegmentRect (+7 more)

### Community 63 - "run-ia.ts"
Cohesion: 0.07
Nodes (28): DEBUG_IA_LOG_INTERVAL_SECONDS, DEBUG_IA_LOG_URL, debugIaLogFileName(), DebugIaLogLine, postDebugIaLogs(), buffers, carsJson, driversDir (+20 more)

### Community 64 - "trackgen/generate.ts"
Cohesion: 0.11
Nodes (34): campaignSlotForTrackId(), campaignTracks(), isPlanetUnlocked(), isTrackUnlocked(), nextCampaignTrack(), planetTracks(), ANCHOR_TRACK_ID, AUTHORED_TRACK_IDS (+26 more)

### Community 65 - "CameraDirector.ts"
Cohesion: 0.15
Nodes (13): CAMERA_OVERRIDE, CameraDirector, CameraDirectorSample, CameraOverride, CAMERA_MANUAL_HOLD_SECONDS, CAMERA_MAX_ZOOM_IN, CAMERA_TRIGGER_HOLD_SECONDS, CAMERA_TRIGGER_KIND (+5 more)

### Community 66 - "DebugIaMode.ts"
Cohesion: 0.40
Nodes (6): debugIaModeFromSearch(), debugIaSeedFromSearch(), debugIaTrackFromSearch(), enableDebugIaMode(), enableDebugIaModeFromSearch(), paramsFrom()

### Community 67 - "CarStatBars.test.ts"
Cohesion: 0.20
Nodes (10): normalise(), safeStat(), STAT_BAR_FIELDS, statBars(), BASE_STATS, carIds, carsJsonPath, manifest (+2 more)

### Community 68 - "NarratorPlan.ts"
Cohesion: 0.27
Nodes (16): banterLines(), linesInCategory(), pickNarratorVoice(), buildEventPool(), clampInt(), clipFor(), finalLapHoles(), nextWeighted() (+8 more)

### Community 69 - "build_matrix_strip.py"
Cohesion: 0.21
Nodes (16): build_strip(), extract_sources_tar(), list_frame_paths(), main(), production_scale_block(), px(), Image, Path (+8 more)

### Community 70 - "TitleAudio"
Cohesion: 0.13
Nodes (3): BedPlayer, TitleAudio, TitleMusic

### Community 71 - "SplashScene.ts"
Cohesion: 0.11
Nodes (13): createContext(), distortionCurve(), GUITAR_SOLO_DURATION_SECONDS, playGuitarSolo(), SOLO_NOTES, enableTourMode(), enableTourModeFromSearch(), feedTourCode() (+5 more)

### Community 72 - "20 REGULARS — every planet"
Cohesion: 0.07
Nodes (29): 10. KIRA, 11. SNAKE, 12. RIO, 13. JETT, 14. NOVA, 15. CRUZ, 16. ASH, 17. ZARA (+21 more)

### Community 73 - "generate-metal-scraps.ts"
Cohesion: 0.21
Nodes (15): chunk(), crc32(), drawScrap(), EDGE, emptyFrame(), encodePng(), fillPoly(), fillRect() (+7 more)

### Community 74 - "VehicleCapabilityModel.ts"
Cohesion: 0.24
Nodes (11): buildStatNormalizer(), capabilitiesFromStats(), FIELDS, minMax(), mix(), planningCapabilities(), planningStats(), StatNormalizer (+3 more)

### Community 75 - ".create"
Cohesion: 0.24
Nodes (6): debugIaSeed(), carSheetImageUrl(), isBBoxSheet(), MatrixStripAtlas, matrixStripCacheKey(), BootScene

### Community 76 - "TuningOverlay"
Cohesion: 0.23
Nodes (4): TuningOverlay, formatTuningOverlay(), safeFormat(), TuningOverlayReadout

### Community 77 - "SeasonPoints.ts"
Cohesion: 0.14
Nodes (19): BASE_FIRST_POINTS, CASH_IN_PAYOUT, cashInBatches(), cashInValue(), CONTACT_HIT_POINTS, firstPlacePoints(), hitScale(), MINE_HIT_POINTS (+11 more)

### Community 78 - "Intercept.ts"
Cohesion: 0.30
Nodes (10): interceptPoint(), observedPosition(), predictionTime(), predictPosition(), clamp(), hash32(), hashUnit(), lerp() (+2 more)

### Community 79 - "MetalScrapEffect.ts"
Cohesion: 0.17
Nodes (15): FlyingScrap, MetalScrapEffect, SCRAP_HARD_COUNT, SCRAP_HARD_SPEED, SCRAP_LIGHT_COUNT, SCRAP_MEDIUM_COUNT, SCRAP_MEDIUM_SPEED, SCRAP_ROSTER_SIZE (+7 more)

### Community 80 - "generate-planet-select.ts"
Cohesion: 0.20
Nodes (12): bandedGradient(), calmFactor(), here, lerp(), outDir, Rgb, SelectSpec, silhouetteHeightAt() (+4 more)

### Community 81 - "Wallet.ts"
Cohesion: 0.18
Nodes (20): BASE_FIRST_PRIZE, CONTACT_HIT_BOUNTY, contactHitBounty(), firstPlacePrize(), hitScale(), MINE_HIT_BOUNTY, mineHitBounty(), MISSILE_HIT_BOUNTY (+12 more)

### Community 82 - "MusicPlayer"
Cohesion: 0.23
Nodes (3): clampUnit(), MusicPlayer, MusicScore

### Community 83 - "KeyboardDriver.ts"
Cohesion: 0.18
Nodes (4): KeyboardDriver, DriveIntent, ReverseLatch, ReverseLatchOptions

### Community 84 - "HudFormat.ts"
Cohesion: 0.32
Nodes (10): formatCountdown(), formatHud(), formatIntegrityPercent(), formatRaceTime(), formatSpeed(), formatSpeedDigits(), formatSpeedFraction(), MPH_PER_WORLD_UNIT (+2 more)

### Community 85 - "Delivery reports"
Cohesion: 0.10
Nodes (21): 2026-08-15 20:31 PDT — T-012 round (uncommitted, `main`), 2026-08-16 — T-018 delivered: the game opens on the splash screen, Agents involved this round, Agents involved this round, Agents involved this round, Context cleanup — 2026-08-15 17:02 PDT — user requested a manual clean after compaction #1, Context cleanup — 2026-08-15 17:32 PDT — user asked for a save point before clearing the context, Context cleanup — 2026-08-15 17:45 PDT — user played the game, accepted it, and asked for a save point before clearing the context (+13 more)

### Community 86 - "generate-lab.ts"
Cohesion: 0.21
Nodes (12): NARRATOR_VOICES, NarratorCategory, narratorClipFile(), BASE_INSTRUCTIONS, CATEGORY_INSTRUCTIONS, FORCE, LAB_DIRECTORY, main() (+4 more)

### Community 87 - "Decisões de design (arcade, não real)"
Cohesion: 0.10
Nodes (19): 1. Launch = base da zona + soma do carro no ponto zero, 1b. Sem força positiva → a rampa ganha (ré sozinha), 2. “Velocidade normal + turbo” — o *hot approach*, 3. Ângulo da rampa é dado, não derivado, 4. Turbo a meio do salto — segundo kick, uma vez, 5. Aterragem dura só na 45° quente, 6. Trajetória fora da pista → cai, explode, volta depois da rampa, 7. O que o ângulo **não** muda (+11 more)

### Community 88 - "JumpCharges.ts"
Cohesion: 0.27
Nodes (11): clamp(), consumeJump(), createJumpCharges(), HOP_LAUNCH_SPEED, HOP_REF_MASS, HOP_REF_SPEED, HOP_SCALE_MAX, HOP_SCALE_MIN (+3 more)

### Community 89 - "RaceScene.ts"
Cohesion: 0.08
Nodes (37): loadPoints(), paintRoundedPlaque(), PLAQUE_INK, PLAQUE_LINE, PlaquePaint, CarSetManifest, cartPortraitKey(), sheetCellSize() (+29 more)

### Community 90 - "Iso car strip"
Cohesion: 0.11
Nodes (16): Claude Code — desenhar um carro (tira de relógio), Anchors (draw these first), Clock — 32 poses, Full table, Lights and parts by yaw, Size — fixed world, not fill-the-cell, After images exist, Contract (not negotiable) (+8 more)

### Community 91 - "TrajectoryPlanner.ts"
Cohesion: 0.16
Nodes (16): formatAiOverlay(), safe(), EXECUTION_STATE, baselineOffset(), candidateOffsets(), LATERAL_FRACTIONS, maxSafeOffset(), NearbyLateral (+8 more)

### Community 92 - "Passo a passo — matrix_car (fonte do que já fizemos)"
Cohesion: 0.11
Nodes (18): 0) Fonte da verdade (ler nesta ordem), 1) Contrato (não negociar), 2) O que JÁ está feito (as is), 3) Split das metades, 4.1 Gerar, 4.2 Normalizar → 1700×1254, 4.3 Repetir, 4) Passo a passo — um frame (+10 more)

### Community 93 - "Passo a passo — matrix_car (fonte do que já fizemos)"
Cohesion: 0.11
Nodes (18): 0) Fonte da verdade (ler nesta ordem), 1) Contrato (não negociar), 2) O que JÁ está feito (as is), 3) Split das metades, 4.1 Gerar, 4.2 Normalizar → 1700×1254, 4.3 Repetir, 4) Passo a passo — um frame (+10 more)

### Community 94 - "generate-ground-tiles.ts"
Cohesion: 0.23
Nodes (10): blotchParity(), here, onCrackEdge(), outDir, Pattern, Swatch, SWATCHES, worley() (+2 more)

### Community 95 - "package.json"
Cohesion: 0.18
Nodes (10): dependencies, phaser, description, engines, node, name, private, type (+2 more)

### Community 96 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, pngjs, @types/pngjs, typescript, vite, vitest, pngjs, @types/pngjs (+3 more)

### Community 97 - "New tasks opened 2026-08-16 by the owner (T-043..T-047)"
Cohesion: 0.11
Nodes (18): Agents involved this round, Context cleanup — 2026-08-16 01:00 — context reached 375k, past the 290k ceiling, Context cleanup — 2026-08-16 06:20 — context reached 408k, past the 290k ceiling, owner restarting for mobile, Final handoff — 2026-08-16 ~01:40 — Cursor session (Grok) picked up from the 01:05 Claude handoff, Final handoff — 2026-08-16 ~03:35 — Cursor session (Opus) — Competitive NPCs / Aim / Race Flow / 30 Tracks, How the next agent continues — unchanged order, now with the decisions settled, Known balance finding (honest, not a bug), New tasks opened 2026-08-16 by the owner (T-043..T-047) (+10 more)

### Community 98 - "EngineGearbox"
Cohesion: 0.27
Nodes (4): clampUnit(), EngineGearbox, GearboxOptions, GearboxState

### Community 99 - "WORKLOG — concurrence-gamming"
Cohesion: 0.12
Nodes (16): Active agents, Agent briefs, Blocked work, Current state in one line, `git push` — RESOLVED, 2026-08-15 23:40, Headless verification — solved, but read this before re-solving it, How to resume this work (orchestrator instructions), Known art polish items (low priority, not blocking) (+8 more)

### Community 100 - "CameraZoomPolicy.ts"
Cohesion: 0.29
Nodes (6): CameraZoomPolicy, CameraZoomPolicyOptions, CAMERA_CLOSE_ZOOM, CAMERA_CORNER_CURVATURE, CAMERA_HOME_ZOOM, CAMERA_WIDE_ZOOM

### Community 101 - "PlannedClip"
Cohesion: 0.19
Nodes (8): PlannedClip, CursorKey, NarratorDirector, NarratorOffer, NarratorSnapshot, NarratorPlan, ScheduledBanter, NarratorPriority

### Community 102 - "CameraImpulse"
Cohesion: 0.29
Nodes (3): CameraImpulse, hitOffsetX(), lerp()

### Community 104 - "RaceScore.ts"
Cohesion: 0.47
Nodes (7): clamp01(), computeRaceScore(), POSITION_WEIGHT, positionFraction(), RaceScoreInput, TIME_WEIGHT, timeFraction()

### Community 105 - "loadActiveCareer"
Cohesion: 0.20
Nodes (13): buyCar(), cashInPoints(), creditWallet(), debitWallet(), equipCar(), loadActiveCareer(), loadCleared(), loadWonTracks() (+5 more)

### Community 107 - "strip-fit.ts"
Cohesion: 0.39
Nodes (6): Box, boxFromPoses(), centerInBox(), containScale(), innerCell(), Size

### Community 108 - "flood_black_to_alpha"
Cohesion: 0.36
Nodes (6): main(), Accept a generated frame into frames_300/{CAR}/. Refuses any size other than…, flood_black_to_alpha(), main(), Image, Flood-fill near-black background from the canvas edges to alpha 0. Does not…

### Community 109 - "TrackRenderer"
Cohesion: 0.30
Nodes (5): propHash(), sampleCenterline(), shade(), TrackRenderer, TrackFrame

### Community 111 - "Game map traps"
Cohesion: 0.12
Nodes (14): Crate hit, Drum blast, Game map traps — numbers, Pixel art (`npm run gen:traps-art`), Placement, Pool and spawn, After changing a track, Art (+6 more)

### Community 112 - "Cloud Agent — Metade B (fila 18 → 33)"
Cohesion: 0.13
Nodes (14): A) Gerar 30 frames, B) Strip de uso + JSON, C) Pack sources + apagar PNG soltos, Cloud Agent — Metade B (fila 18 → 33), Contrato (fix), D) Conferir pasta, Deliverable final (cada pasta), Done (+6 more)

### Community 114 - "Cloud Agent — Metade B (fila 18 → 33)"
Cohesion: 0.13
Nodes (14): A) Gerar 30 frames, B) Strip de uso + JSON, C) Pack sources + apagar PNG soltos, Cloud Agent — Metade B (fila 18 → 33), Contrato (fix), D) Conferir pasta, Deliverable final (cada pasta), Done (+6 more)

### Community 115 - "TrackLines.ts"
Cohesion: 0.52
Nodes (5): parseLine(), parseTrackLinesManifest(), requireNumber(), requireString(), TrackLinesError

### Community 116 - "BUFFER"
Cohesion: 0.38
Nodes (7): BUFFER, chunk(), crc32(), encodePng(), chunk(), crc32(), encodePng()

### Community 117 - "scale"
Cohesion: 0.12
Nodes (21): computeBounds(), VehicleView, VehicleViewExtras, frameIndexForHeading(), sheetFrameCount(), add(), scale(), gridSlotPosition() (+13 more)

### Community 118 - "ia-log-server.mjs"
Cohesion: 0.33
Nodes (4): DRIVERS, seen, server, sessionLog

### Community 119 - "vercel.json"
Cohesion: 0.33
Nodes (5): buildCommand, framework, installCommand, outputDirectory, rewrites

### Community 120 - "build_strip.py"
Cohesion: 0.50
Nodes (4): bbox_of(), main(), Image, Build horizontal sprite strip from N frames at a fixed source canvas size. ONLY…

### Community 122 - "matrix_car — pasta oficial"
Cohesion: 0.14
Nodes (11): Inventário 1_hero, Índice = relógio = ângulo (car_1), Contrato rápido, Inventário `1_hero` (agora), matrix_car — pasta oficial, O que é cada coisa, Inventário `1_hero`, Referência rápida (gabarito) (+3 more)

### Community 123 - "pack_folder"
Cohesion: 0.67
Nodes (3): main(), pack_folder(), Path

### Community 131 - "Isometric cam man — numbers"
Cohesion: 0.15
Nodes (11): Classification (arc length, span 45), Impulse (player only), Isometric cam man — numbers, Keys, Runtime files, Zoom band, After changing a track or line, Isometric cam man (+3 more)

### Community 132 - "Matrix car rotate"
Cohesion: 0.15
Nodes (11): Fórmulas, Inventário car_1 (exemplo), Matrix car — referência do relógio, Tabela 0…29, Âncoras (usuário), Matrix car rotate, Non-negotiable, Prompt (+3 more)

### Community 133 - "API reference for whoever picks this up"
Cohesion: 0.15
Nodes (13): API reference for whoever picks this up, Generated asset manifest — `public/assets/cars/cars.json`, `src/adapters/render/TuningOverlay*.ts` (T-012), `src/domain/constants.ts`, `src/domain/input/InputCommand.ts`, `src/domain/math/Vec2.ts`, `src/domain/race/OnTrackStep.ts` (T-012), `src/domain/track/TrackDefinition.ts` (+5 more)

### Community 134 - "matrix_car — pasta oficial"
Cohesion: 0.18
Nodes (9): Contrato rápido, Inventário `1_hero` (agora), matrix_car — pasta oficial, O que é cada coisa, Inventário `1_hero`, Referência rápida (gabarito), Regras (igual ao gabarito), Relógio + índice das 30 imagens (+1 more)

### Community 135 - "Art briefs — the ten planets (T-034)"
Cohesion: 0.20
Nodes (9): Art briefs — the ten planets (T-034), Prompt A — area-select illustration (one per planet), Prompt B — seamless ground tile (one per planet), Prompt C — props and objects in the world (this is where the 2:1 angle matters), Style anchor, The projection constraint — the part that is easy to get wrong, The ten planets, What the engine can and cannot use (+1 more)

### Community 136 - "Handoff — Claude team, 2026-08-16 ~05:00"
Cohesion: 0.20
Nodes (9): Constraints (paid for already — do not rediscover), Do not, Handoff — Claude team, 2026-08-16 ~05:00, How to wire a real tile or illustration, Images — where they live, Track geometry (if a planet's layout is wrong), Verify before you call it done, What is already in (+1 more)

### Community 137 - "Escala de produção — matrix_car → jogo"
Cohesion: 0.22
Nodes (8): car_1 as is, Centro da imagem, Converter um array de pontos, Escala de produção — matrix_car → jogo, Exemplos (`Math.round(v * 64 / 1700)`), Fator (JS / arrays / colisão), ImageMagick (só PNG), Importante

### Community 138 - "TrackCameras.ts"
Cohesion: 0.36
Nodes (7): parseKind(), parseTrackCameraPreset(), parseTrigger(), requireNumber(), requireString(), TrackCamerasError, CameraTriggerKind

### Community 139 - "Escala de produção — matrix_car → jogo"
Cohesion: 0.22
Nodes (8): car_1 as is, Centro da imagem, Converter um array de pontos, Escala de produção — matrix_car → jogo, Exemplos (`Math.round(v * 64 / 1700)`), Fator (JS / arrays / colisão), ImageMagick (só PNG), Importante

### Community 140 - "MISSION"
Cohesion: 0.25
Nodes (7): Constraints, Decisions, Discarded, Files, MISSION, Next step, Objective

### Community 141 - "compact_images.sh"
Cohesion: 0.38
Nodes (3): rmse_ok(), compact_images.sh script, usage()

### Community 142 - "Game jornal"
Cohesion: 0.29
Nodes (6): Como medir “desde a última iteração”, Depois de escrever, Formato (obrigatório), Game jornal, Onde, Quando

### Community 143 - "Process — duas metades"
Cohesion: 0.29
Nodes (6): Cloud (metade B), Contrato rápido, Onde achar gabarito + docs, Por frame (igual nas duas metades), Process — duas metades, Split

### Community 144 - "Process — duas metades"
Cohesion: 0.29
Nodes (6): Cloud (metade B), Contrato rápido, Onde achar gabarito + docs, Por frame (igual nas duas metades), Process — duas metades, Split

### Community 145 - "Final handoff — 2026-08-16 01:05 — the owner called the end of the session ("logo vao acabar os tokens")"
Cohesion: 0.29
Nodes (7): Final handoff — 2026-08-16 01:05 — the owner called the end of the session ("logo vao acabar os tokens"), Shipped this session, Start here next session, in this order, The two owner decisions, settled — do not re-open either, Tooling added this session — do not re-derive it, Two gates only the owner can close, Two questions put to the owner and NOT yet answered

### Community 146 - "Cloud handoff — metade B"
Cohesion: 0.33
Nodes (5): Cloud handoff — metade B, Inventário esperado ao começar, Onde achar gabarito + docs, Por onde começar (metade B), Split

### Community 147 - "Prompt — 30 frames (+12°)"
Cohesion: 0.33
Nodes (5): Contrato, Correção, Ordem de geração, Prompt — 30 frames (+12°), Prompt (colar; anexar a vitrine só como referência de identidade)

### Community 148 - "Cloud handoff — metade B"
Cohesion: 0.33
Nodes (5): Cloud handoff — metade B, Inventário esperado ao começar, Onde achar gabarito + docs, Por onde começar (metade B), Split

### Community 149 - "Prompt — 30 frames (+12°)"
Cohesion: 0.33
Nodes (5): Contrato, Correção, Ordem de geração, Prompt — 30 frames (+12°), Prompt (colar; anexar a vitrine só como referência de identidade)

### Community 150 - "Music brief — 10 original race beds"
Cohesion: 0.33
Nodes (5): Delivery, Music brief — 10 original race beds, Specs, Style, Use

### Community 151 - "Context cleanup — 2026-08-16 00:25 — context reached 344k, past the 290k ceiling"
Cohesion: 0.33
Nodes (6): A new verification tool exists — do not re-derive it, Agents involved this round, Context cleanup — 2026-08-16 00:25 — context reached 344k, past the 290k ceiling, How the next agent continues, Standing lessons, all already paid for here, The owner opened a LOT of new scope this turn. All of it is recorded below as T-043..T-047

### Community 152 - "Context cleanup — 2026-08-16 00:55 — context reached 312k, past the 290k ceiling"
Cohesion: 0.33
Nodes (6): Agents involved this round, Context cleanup — 2026-08-16 00:55 — context reached 312k, past the 290k ceiling, How the next agent continues, Standing lessons, every one already paid for here, T-037 is functionally complete. The measured outcomes, so nobody re-derives them, What the owner asked for this session, in their own words

### Community 153 - "Verification helpers — seeing the game with your own eyes"
Cohesion: 0.40
Nodes (4): probe.mjs, screenshot.mjs, Setup, Verification helpers — seeing the game with your own eyes

### Community 154 - "Context cleanup — 2026-08-15 23:40 — the owner is clearing the session to start clean"
Cohesion: 0.40
Nodes (5): Agents involved this round, Context cleanup — 2026-08-15 23:40 — the owner is clearing the session to start clean, The next session should do this, in this order, Traps that have each already cost this project a task or more, What the owner said this turn, verbatim in intent

### Community 155 - "Context cleanup — 2026-08-15 23:55 — the owner stopped implementation and asked for a save point"
Cohesion: 0.40
Nodes (5): Context cleanup — 2026-08-15 23:55 — the owner stopped implementation and asked for a save point, Delivered this turn, Next steps, in order, T-018 was started and stopped — what is on disk, The trap that produced T-039, stated plainly because it will happen again

### Community 156 - "Context cleanup — 2026-08-16 00:05 — the owner is clearing the session"
Cohesion: 0.40
Nodes (5): Context cleanup — 2026-08-16 00:05 — the owner is clearing the session, Next steps, unchanged order, No agent is mid-flight, Sign-offs so far, so nobody re-litigates them, Standing lessons this project has already paid for

### Community 157 - "JOURNAL"
Cohesion: 0.50
Nodes (3): 2026-08-17 — Camera now directs the race, 2026-08-17 — Clock-fleet enters watch, JOURNAL

### Community 158 - "Prompt — front half-rotation (15 frames × 12°)"
Cohesion: 0.50
Nodes (3): Angles (front half only), Prompt — front half-rotation (15 frames × 12°), Prompt template

### Community 159 - "Prompt — rear half-rotation (15 frames × 12°)"
Cohesion: 0.50
Nodes (3): Angles (rear half only), Prompt (paste into the image model; attach the folder hero), Prompt — rear half-rotation (15 frames × 12°)

### Community 160 - "restore_images.sh"
Cohesion: 0.83
Nodes (3): matches_filter(), restore_images.sh script, usage()

### Community 161 - "AccidentWatch.ts"
Cohesion: 0.28
Nodes (4): AccidentWatch, ClusterCandidate, CAMERA_ACCIDENT_HOLD_SECONDS, CAMERA_CLUSTER_RADIUS_UNITS

### Community 162 - "Context cleanup — 2026-08-15 23:10 — context reached 312k, past the 290k ceiling"
Cohesion: 0.50
Nodes (4): Agents involved this round, Art was reorganised this turn — the old paths are gone, do not look for them, Context cleanup — 2026-08-15 23:10 — context reached 312k, past the 290k ceiling, How the next agent continues

### Community 169 - "circuit-maps.ts"
Cohesion: 0.16
Nodes (20): COLOR_BACKGROUND, COLOR_GUIDE, COLOR_PURSUIT, COLOR_PURSUIT_LINE, COLOR_ROAD, COLOR_START, createBitmap(), createViewport() (+12 more)

### Community 170 - "TyreMarks.ts"
Cohesion: 0.15
Nodes (7): ROAD_DEPTH, freshAlphaFor(), Segment, slideIntensity(), TyreMarks, TyreMarksOptions, WheelTrail

### Community 171 - "fleet.ts"
Cohesion: 0.12
Nodes (17): CarSheetManifest, WorldAdvantage, templateCar, FLEET_CARS, FleetCarDef, STATS_AIR_BLADE, STATS_AIR_BOAT, STATS_BATTLE_TRAK (+9 more)

### Community 172 - "TrackSelectScene"
Cohesion: 0.22
Nodes (4): CampaignTrack, findPlanet(), formatCash(), TrackSelectScene

### Community 173 - "fit-redrawn.ts"
Cohesion: 0.20
Nodes (17): chroma(), consumePose(), Crop, fitHq(), fitPoseToFootprint(), isGreenKey(), isPaper(), luma() (+9 more)

### Community 174 - "CarManifest.test.ts"
Cohesion: 0.15
Nodes (15): CarManifestError, cartPortraitFile(), cartPortraitLegacyFile(), cartPortraitToken(), matrixHeroFile(), matrixHeroNumber(), matrixHeroUrl(), matrixStripJsonUrl() (+7 more)

### Community 175 - "SpeedoGauge.ts"
Cohesion: 0.17
Nodes (9): BarPoint, barProfileAt(), COLOUR_STOPS, colourAtT(), dimColour(), lerpColour(), SpeedoGauge, SpeedoGaugeOptions (+1 more)

### Community 179 - "HudReadout"
Cohesion: 0.33
Nodes (3): HudReadout, RacePhase, HudSource

## Knowledge Gaps
- **992 isolated node(s):** `name`, `version`, `private`, `type`, `description` (+987 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `BUFFER` connect `BUFFER` to `generate-metal-scraps.ts`, `generate-hud-icons.ts`, `import-fleet.ts`, `generate-lab.ts`, `generate-weapons.ts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `writePng()` connect `import-fleet.ts` to `circuit-maps.ts`, `fit-redrawn.ts`, `trackgen/preview.ts`, `BUFFER`, `pack-redrawn.ts`, `spritegen/preview.ts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `vec2` connect `vec2` to `Vec2.ts`, `RaceField.ts`, `RaceField`, `TrackSpline`, `ArcadeCarPhysics.ts`, `CarPerk.test.ts`, `RacingAgent.ts`, `RaceField.test.ts`, `AccidentWatch.ts`, `RampLaunch.ts`, `circuit-maps.ts`, `TyreMarks.ts`, `trackgen/preview.ts`, `TrackSpline.ts`, `TrackDefinition.ts`, `trackgen/generate.ts`, `Intercept.ts`, `MetalScrapEffect.ts`, `RaceScene.ts`, `TrackRenderer`, `scale`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _992 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Vec2.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0797872340425532 - nodes in this community are weakly interconnected._
- **Should `ResultsScene` be split into smaller, more focused modules?**
  _Cohesion score 0.07039187227866474 - nodes in this community are weakly interconnected._
- **Should `RaceField.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.056962025316455694 - nodes in this community are weakly interconnected._