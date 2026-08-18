# Graph Report - game-race-90s  (2026-08-16)

## Corpus Check
- 263 files · ~2,549,375 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2163 nodes · 5742 edges · 111 communities (92 shown, 19 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `985751f0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- 20 REGULARS — every planet
- RaceField.ts
- vec2
- SplashAttract.ts
- MetalScrapEffect.ts
- trackgen/preview.ts
- RaceAudio.ts
- RaceSimulation.ts
- scripts
- constants.ts
- TrackSpline.ts
- RaceScore.ts
- scale
- RaceScene
- ProgressStore.ts
- spritegen/preview.ts
- RaceField.test.ts
- compilerOptions
- CarPerk.test.ts
- MusicScore.ts
- loadActiveCareer
- planetMusic.ts
- HelpScene
- schema.ts
- generate-metal-scraps.ts
- .create
- Coast.ts
- GarageScene.ts
- import-fleet.ts
- VehicleTelemetry
- Wallet.ts
- generate-weapons.ts
- NoiseSource
- HudFormat.ts
- GarageCatalog.ts
- PauseScene
- RaceAudio
- TitleAudio
- renderCar.ts
- fleet.ts
- generate-planet-select.ts
- ResultsScene
- Vec2.ts
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
- HudScene
- TrackSpline
- RaceField
- New tasks opened 2026-08-16 by the owner (T-043..T-047)
- Final handoff — 2026-08-16 01:05 — the owner called the end of the session ("logo vao acabar os tokens")
- PlanetSelectScene.ts
- PlannedClip
- vercel.json
- Context cleanup — 2026-08-16 00:25 — context reached 344k, past the 290k ceiling
- Context cleanup — 2026-08-16 00:55 — context reached 312k, past the 290k ceiling
- SplashScene.ts
- domain-purity.test.ts
- Verification helpers — seeing the game with your own eyes
- Context cleanup — 2026-08-15 23:40 — the owner is clearing the session to start clean
- Context cleanup — 2026-08-15 23:55 — the owner stopped implementation and asked for a save point
- Context cleanup — 2026-08-16 00:05 — the owner is clearing the session
- trackgen/generate.ts
- BootScene.ts
- Context cleanup — 2026-08-15 23:10 — context reached 312k, past the 290k ceiling
- TyreMarks.ts
- drive.mjs
- probe.mjs
- screenshot.mjs
- RaceScene.ts
- PilotRoster.ts
- ExplosionEffect
- Weapons.test.ts
- CarStatBars.test.ts
- TrackSelectScene
- .constructor
- NarratorBank.ts
- NarratorPlan.ts
- generate-lab.ts
- PlanetSelectScene
- LapTimes.test.ts
- geometry.ts
- JumpCharges.ts
- Music brief — 10 original race beds
- IsoProjection
- TrackLines.ts
- Slipstream.ts
- TrackRenderer.ts
- CarManifest.ts
- NarratorDirector
- EngineVoice
- NarratorPlayer
- linegen/generate.ts
- ControlList.ts
- GuitarSolo.ts
- NarratorDirector.ts
- ResultsScene.ts
- MetalScrapEffect
- BrakeVoice
- SkidVoice

## God Nodes (most connected - your core abstractions)
1. `vec2` - 79 edges
2. `GarageScene` - 71 edges
3. `TrackSpline` - 60 edges
4. `RaceScene` - 59 edges
5. `scale()` - 50 edges
6. `add()` - 46 edges
7. `RaceField` - 44 edges
8. `VehicleStats` - 34 edges
9. `VehicleState` - 33 edges
10. `ResultsScene` - 32 edges

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

## Communities (111 total, 19 thin omitted)

### Community 0 - "20 REGULARS — every planet"
Cohesion: 0.07
Nodes (29): 10. KIRA, 11. SNAKE, 12. RIO, 13. JETT, 14. NOVA, 15. CRUZ, 16. ASH, 17. ZARA (+21 more)

### Community 1 - "RaceField.ts"
Cohesion: 0.10
Nodes (30): HOME_WORLD_STAT_BONUS, CONTACT_SIDE, ContactSide, RacerRuntime, RivalView, CarIntegrity, DamageRole, CarPerkProfile (+22 more)

### Community 2 - "vec2"
Cohesion: 0.11
Nodes (18): BURN_COLORS, BurnBlotch, BurnMark, Burst, BurstOptions, ExplosionEffectOptions, FIREBALL_COLORS, lerpColor() (+10 more)

### Community 3 - "SplashAttract.ts"
Cohesion: 0.07
Nodes (45): CARD_FLIP_SECONDS, CARD_GAP_SECONDS, CARD_GROW_FADE_SECONDS, CARD_GROW_SCALE, CARD_SEQUENCE_DELAY_SECONDS, cardBeatSeconds(), cardStartAt(), clamp() (+37 more)

### Community 4 - "MetalScrapEffect.ts"
Cohesion: 0.25
Nodes (13): SCRAP_HARD_COUNT, SCRAP_HARD_SPEED, SCRAP_LIGHT_COUNT, SCRAP_MEDIUM_COUNT, SCRAP_MEDIUM_SPEED, SCRAP_ROSTER_SIZE, SCRAP_SPRITES, scrapCountForHit() (+5 more)

### Community 5 - "trackgen/preview.ts"
Cohesion: 0.15
Nodes (20): COLOR_BACKGROUND, COLOR_CHECKPOINT, COLOR_CONTROL, COLOR_FAST, COLOR_SHOULDER, COLOR_START, COLOR_SURFACE, COLOR_TIGHT (+12 more)

### Community 6 - "RaceAudio.ts"
Cohesion: 0.20
Nodes (15): isAudioMuted(), setAudioMuted(), clearLoadedMusicBeds(), loaded, loadedMusicBeds(), markMusicBedLoaded(), pickLoadedMusicBed(), createAudioContext() (+7 more)

### Community 7 - "RaceSimulation.ts"
Cohesion: 0.15
Nodes (16): advanceLapProgress(), checkpointDistance(), createLapProgress(), LapProgress, IMPORTANT: Use the starting value of nextCheckpoint for the checkpoint index…, RacerProgress, RacerStanding, rankRacers() (+8 more)

### Community 8 - "scripts"
Cohesion: 0.05
Nodes (41): dependencies, phaser, description, devDependencies, pngjs, @types/pngjs, typescript, vite (+33 more)

### Community 9 - "constants.ts"
Cohesion: 0.14
Nodes (12): SCREEN_ROTATION_SIGN, FixedStepLoop, ISO_X, ISO_Y, ISO_Z, SHADE_STEP, ShadeStep, SIMULATION_HZ (+4 more)

### Community 10 - "TrackSpline.ts"
Cohesion: 0.17
Nodes (20): cross(), LineCandidate, offsetAt(), RacingLine, trackSurfaceGrip(), TrackProjection, AI_DEFAULT_AGGRESSION, AIDriver (+12 more)

### Community 11 - "RaceScore.ts"
Cohesion: 0.47
Nodes (7): clamp01(), computeRaceScore(), POSITION_WEIGHT, positionFraction(), RaceScoreInput, TIME_WEIGHT, timeFraction()

### Community 12 - "scale"
Cohesion: 0.17
Nodes (15): computeBounds(), VehicleView, VehicleViewExtras, frameIndexForHeading(), add(), fromAngle(), scale(), gridSlotPosition() (+7 more)

### Community 13 - "RaceScene"
Cohesion: 0.06
Nodes (8): KeyboardDriver, DriveIntent, ReverseLatch, ReverseLatchOptions, CameraZoomPolicy, CameraZoomPolicyOptions, findCarSheet(), RaceScene

### Community 14 - "ProgressStore.ts"
Cohesion: 0.12
Nodes (42): activateSlot(), activeSlotIndex(), beginSlot(), CLEAR_POSITION, creditWallet(), debitWallet(), equipCar(), loadActiveName() (+34 more)

### Community 15 - "spritegen/preview.ts"
Cohesion: 0.20
Nodes (16): HERE, loadUnregistered(), looksLikeCarModel(), main(), PREVIEW_BACKGROUND, PREVIEW_BORDER, PREVIEW_DIRECTORY, resolveTargets() (+8 more)

### Community 16 - "RaceField.test.ts"
Cohesion: 0.11
Nodes (25): RacerEntry, applyImpactDamage(), applyWeaponDamage(), CAR_CONDITION, CarCondition, conditionFromIntegrity(), createCarIntegrity(), DAMAGE_ROLE (+17 more)

### Community 17 - "compilerOptions"
Cohesion: 0.07
Nodes (28): DOM, DOM.Iterable, ES2022, src, tests, tools, vite/client, vitest/globals (+20 more)

### Community 18 - "CarPerk.test.ts"
Cohesion: 0.08
Nodes (43): LATERAL_GRIP_STIFFNESS, OFFROAD_GRIP_MULTIPLIER, OFFROAD_ROLLING_RESISTANCE, OVERSPEED_ALLOWANCE, REVERSE_SPEED_FRACTION, STEERING_AUTHORITY_SPEED, TARMAC_ROLLING_RESISTANCE, YAW_SPIN_DECAY_PER_SECOND (+35 more)

### Community 19 - "MusicScore.ts"
Cohesion: 0.15
Nodes (24): clampUnit(), barCount(), barHasLick(), barIndexForStep(), BEATS_PER_BAR, beatsToSeconds(), eighthInBarForStep(), LeadNote (+16 more)

### Community 20 - "loadActiveCareer"
Cohesion: 0.25
Nodes (7): buyCar(), loadActiveCareer(), loadCleared(), loadWonTracks(), sellCar(), isTourModeOn(), highestUnlockedPlanetIndex()

### Community 21 - "planetMusic.ts"
Cohesion: 0.11
Nodes (20): ASH_REACH_SCORE, BOGMIRE_DEEP_SCORE, CHROME_VERGE_SCORE, CRYO_HOLLOW_SCORE, DOUBLE_KICK_DRUM, everyPlanetHasMusic(), FERRO_RUST_SCORE, HEAVY_STRUM (+12 more)

### Community 23 - "schema.ts"
Cohesion: 0.24
Nodes (13): CAR_PERK, PALETTE_ROLE, airBlade, airBoat, battleTrak, delorean, dirtDevil, havac (+5 more)

### Community 24 - "generate-metal-scraps.ts"
Cohesion: 0.21
Nodes (15): chunk(), crc32(), drawScrap(), EDGE, emptyFrame(), encodePng(), fillPoly(), fillRect() (+7 more)

### Community 25 - ".create"
Cohesion: 0.35
Nodes (4): musicBedKey(), cartPortraitKey(), BootScene, linesCacheKey()

### Community 26 - "Coast.ts"
Cohesion: 0.39
Nodes (5): CEREMONY_HOLD_SECONDS, COAST_BRAKE, COAST_STOP_SPEED, coastInput(), isNearlyStopped()

### Community 27 - "GarageScene.ts"
Cohesion: 0.13
Nodes (16): cashInPoints(), normalise(), safeStat(), STAT_BAR_FIELDS, StatBar, statBars(), paintRoundedPlaque(), PLAQUE_INK (+8 more)

### Community 28 - "import-fleet.ts"
Cohesion: 0.22
Nodes (17): cellBounds(), contentBox(), contentRowRange(), extractFrame(), importCar(), isContent(), main(), ORIGIN (+9 more)

### Community 29 - "VehicleTelemetry"
Cohesion: 0.19
Nodes (6): TuningOverlay, formatTuningOverlay(), safeFormat(), TuningOverlayReadout, OnTrackStepResult, VehicleTelemetry

### Community 30 - "Wallet.ts"
Cohesion: 0.18
Nodes (20): BASE_FIRST_PRIZE, CONTACT_HIT_BOUNTY, contactHitBounty(), firstPlacePrize(), HIT_BOUNTY_PLANET_GROWTH, hitScale(), MINE_HIT_BOUNTY, mineHitBounty() (+12 more)

### Community 31 - "generate-weapons.ts"
Cohesion: 0.19
Nodes (18): chunk(), crc32(), drawMine(), drawMissile(), drawOil(), drawTurbo(), emptyFrame(), encodePng() (+10 more)

### Community 32 - "NoiseSource"
Cohesion: 0.23
Nodes (3): clampUnit(), ExplosionVoice, NoiseSource

### Community 33 - "HudFormat.ts"
Cohesion: 0.26
Nodes (10): loadPoints(), formatCountdown(), formatHud(), formatIntegrityPercent(), formatRaceTime(), formatSpeed(), formatSpeedDigits(), formatSpeedFraction() (+2 more)

### Community 34 - "GarageCatalog.ts"
Cohesion: 0.19
Nodes (19): CAR_TIER, CarTier, carUnlockHint(), catalogEntry, GARAGE_CATALOG, isCarUnlocked(), isStarterCar(), listPrice() (+11 more)

### Community 38 - "renderCar.ts"
Cohesion: 0.10
Nodes (32): CAR_FRAME_WIDTH, clampByte(), parseHex(), quantize(), RAMP_FACTORS, RampTable, ResolvedPalette, resolvePalette() (+24 more)

### Community 39 - "fleet.ts"
Cohesion: 0.13
Nodes (18): CarSheetManifest, CarPerkId, WORLD_ADVANTAGE, WorldAdvantage, templateCar, FleetCarDef, STATS_AIR_BLADE, STATS_AIR_BOAT (+10 more)

### Community 40 - "generate-planet-select.ts"
Cohesion: 0.20
Nodes (12): bandedGradient(), calmFactor(), here, lerp(), outDir, Rgb, SelectSpec, silhouetteHeightAt() (+4 more)

### Community 42 - "Vec2.ts"
Cohesion: 0.17
Nodes (16): dot(), normalize(), subtract(), VEC2_ZERO, aggressorOf(), CarContact, CONTACT_ATTACKER, contactAttackCredit (+8 more)

### Community 43 - "MusicPlayer"
Cohesion: 0.18
Nodes (5): MusicPlayer, ChordStep, DrumStep, MusicScore, noteFrequency()

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

### Community 53 - "SeasonPoints.ts"
Cohesion: 0.16
Nodes (18): BASE_FIRST_POINTS, CASH_IN_PAYOUT, cashInBatches(), CONTACT_HIT_POINTS, firstPlacePoints(), hitScale(), MINE_HIT_POINTS, MISSILE_HIT_POINTS (+10 more)

### Community 54 - "Delivery reports"
Cohesion: 0.10
Nodes (21): 2026-08-15 20:31 PDT — T-012 round (uncommitted, `main`), 2026-08-16 — T-018 delivered: the game opens on the splash screen, Agents involved this round, Agents involved this round, Agents involved this round, Context cleanup — 2026-08-15 17:02 PDT — user requested a manual clean after compaction #1, Context cleanup — 2026-08-15 17:32 PDT — user asked for a save point before clearing the context, Context cleanup — 2026-08-15 17:45 PDT — user played the game, accepted it, and asked for a save point before clearing the context (+13 more)

### Community 55 - "HudScene"
Cohesion: 0.06
Nodes (29): HudReadout, HudText, BLANK_PATTERN, DIGIT_PATTERNS, isSegmentLit(), WHY: the vertical segments (f/b, e/c) already occupy the full `STROKE` width at…, SEGMENT, SEGMENT_LAYOUT (+21 more)

### Community 56 - "TrackSpline"
Cohesion: 0.13
Nodes (18): angleOf(), distanceSquared(), buildStartingGrid(), TrackSpline, carSetManifest, carsJsonPath, carsJsonRaw, curvatureAt() (+10 more)

### Community 57 - "RaceField"
Cohesion: 0.16
Nodes (8): InputCommand, RaceField, isAirborne(), oilYawSpinForArmor(), TrackHazard, Missile, npcWeaponCooldownSeconds(), measure()

### Community 58 - "New tasks opened 2026-08-16 by the owner (T-043..T-047)"
Cohesion: 0.11
Nodes (18): Agents involved this round, Context cleanup — 2026-08-16 01:00 — context reached 375k, past the 290k ceiling, Context cleanup — 2026-08-16 06:20 — context reached 408k, past the 290k ceiling, owner restarting for mobile, Final handoff — 2026-08-16 ~01:40 — Cursor session (Grok) picked up from the 01:05 Claude handoff, Final handoff — 2026-08-16 ~03:35 — Cursor session (Opus) — Competitive NPCs / Aim / Race Flow / 30 Tracks, How the next agent continues — unchanged order, now with the decisions settled, Known balance finding (honest, not a bug), New tasks opened 2026-08-16 by the owner (T-043..T-047) (+10 more)

### Community 59 - "Final handoff — 2026-08-16 01:05 — the owner called the end of the session ("logo vao acabar os tokens")"
Cohesion: 0.29
Nodes (7): Final handoff — 2026-08-16 01:05 — the owner called the end of the session ("logo vao acabar os tokens"), Shipped this session, Start here next session, in this order, The two owner decisions, settled — do not re-open either, Tooling added this session — do not re-derive it, Two gates only the owner can close, Two questions put to the owner and NOT yet answered

### Community 60 - "PlanetSelectScene.ts"
Cohesion: 0.10
Nodes (16): bindMenuKeys(), MenuKeyHandlers, clampIndex(), MENU_KIND, MENU_PROMPT_LIST, MenuActionSpec, MenuController, MenuControllerOptions (+8 more)

### Community 61 - "PlannedClip"
Cohesion: 0.13
Nodes (9): PlannedClip, ScheduledBanter, NARRATOR_MAX_SEQUENCE, NARRATOR_PRIORITY, NarratorQueue, A, B, C (+1 more)

### Community 62 - "vercel.json"
Cohesion: 0.33
Nodes (5): buildCommand, framework, installCommand, outputDirectory, rewrites

### Community 63 - "Context cleanup — 2026-08-16 00:25 — context reached 344k, past the 290k ceiling"
Cohesion: 0.33
Nodes (6): A new verification tool exists — do not re-derive it, Agents involved this round, Context cleanup — 2026-08-16 00:25 — context reached 344k, past the 290k ceiling, How the next agent continues, Standing lessons, all already paid for here, The owner opened a LOT of new scope this turn. All of it is recorded below as T-043..T-047

### Community 64 - "Context cleanup — 2026-08-16 00:55 — context reached 312k, past the 290k ceiling"
Cohesion: 0.33
Nodes (6): Agents involved this round, Context cleanup — 2026-08-16 00:55 — context reached 312k, past the 290k ceiling, How the next agent continues, Standing lessons, every one already paid for here, T-037 is functionally complete. The measured outcomes, so nobody re-derives them, What the owner asked for this session, in their own words

### Community 65 - "SplashScene.ts"
Cohesion: 0.14
Nodes (8): enableTourMode(), enableTourModeFromSearch(), feedTourCode(), resetTourMode(), TOUR_CODE, tourModeFromSearch(), BlinkClock, SplashScene

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
Cohesion: 0.11
Nodes (33): campaignSlotForTrackId(), campaignTracks(), isPlanetUnlocked(), isTrackUnlocked(), nextCampaignTrack(), planetTracks(), ANCHOR_TRACK_ID, findPlanet() (+25 more)

### Community 72 - "BootScene.ts"
Cohesion: 0.14
Nodes (22): HelpSceneData, CAR_ASSET_DIRECTORY, CAR_MANIFEST_KEY, CART_PORTRAIT_SIZE, DEBRIS_ASSET_DIRECTORY, GARAGE_ART_FILE, GARAGE_ART_KEY, GROUND_ASSET_DIRECTORY (+14 more)

### Community 73 - "Context cleanup — 2026-08-15 23:10 — context reached 312k, past the 290k ceiling"
Cohesion: 0.50
Nodes (4): Agents involved this round, Art was reorganised this turn — the old paths are gone, do not look for them, Context cleanup — 2026-08-15 23:10 — context reached 312k, past the 290k ceiling, How the next agent continues

### Community 74 - "TyreMarks.ts"
Cohesion: 0.15
Nodes (7): ROAD_DEPTH, freshAlphaFor(), Segment, slideIntensity(), TyreMarks, TyreMarksOptions, WheelTrail

### Community 78 - "RaceScene.ts"
Cohesion: 0.18
Nodes (16): MENU_PROMPT_OPTIONS, CarSetManifest, assignNpcCars(), RaceFieldOptions, TrackLinesManifest, GarageSceneData, AUDIO_VALUES, PauseSceneData (+8 more)

### Community 79 - "PilotRoster.ts"
Cohesion: 0.18
Nodes (15): DRIVER_CARD_DIRECTORY, DRIVER_CARDS, DriverCard, driverCardForName(), driverCardKey(), driverCardUrl(), CHAMPIONSHIP_SIZE, drawRivalNames() (+7 more)

### Community 83 - "Weapons.test.ts"
Cohesion: 0.06
Nodes (59): isWarTankPerk(), distance(), CAR_PERKS, ageHazards(), armHazards(), findHazardHits(), HAZARD_KIND, HazardHit (+51 more)

### Community 84 - "CarStatBars.test.ts"
Cohesion: 0.22
Nodes (6): BASE_STATS, carIds, carsJsonPath, manifest, projectRoot, testFileDir

### Community 85 - "TrackSelectScene"
Cohesion: 0.18
Nodes (6): Burst, rewardLabel(), Star, CampaignTrack, formatCash(), TrackSelectScene

### Community 86 - ".constructor"
Cohesion: 0.18
Nodes (13): meanCornerTightness(), findLineForCar(), chooseLineByAccount(), clamp(), driveOptionsFor(), hash32(), lineAccount(), meanAbsOffset() (+5 more)

### Community 87 - "NarratorBank.ts"
Cohesion: 0.18
Nodes (13): createElement(), BANTER_EXTRA_IDS, LINES_BY_ID, NARRATOR_CATEGORY, NARRATOR_LAB_DIRECTORY, NARRATOR_LINES, NARRATOR_STASH_DIRECTORY, NarratorClip (+5 more)

### Community 88 - "NarratorPlan.ts"
Cohesion: 0.23
Nodes (17): banterLines(), linesInCategory(), pickNarratorVoice(), buildEventPool(), clampInt(), clipFor(), clipsInPlan(), finalLapHoles() (+9 more)

### Community 89 - "generate-lab.ts"
Cohesion: 0.21
Nodes (12): NARRATOR_VOICES, NarratorCategory, narratorClipFile(), BASE_INSTRUCTIONS, CATEGORY_INSTRUCTIONS, FORCE, LAB_DIRECTORY, main() (+4 more)

### Community 91 - "LapTimes.test.ts"
Cohesion: 0.10
Nodes (23): GENERATED_TRACKS, findTrack(), TRACKS, thunderBasin, clampSigned(), clampUnit(), IDLE_INPUT, sanitizeInput() (+15 more)

### Community 92 - "geometry.ts"
Cohesion: 0.24
Nodes (12): PaletteRole, cross(), dot(), Face, length(), prismFaces(), sectionCorners(), sub() (+4 more)

### Community 93 - "JumpCharges.ts"
Cohesion: 0.27
Nodes (11): clamp(), consumeJump(), createJumpCharges(), HOP_LAUNCH_SPEED, HOP_REF_MASS, HOP_REF_SPEED, HOP_SCALE_MAX, HOP_SCALE_MIN (+3 more)

### Community 94 - "Music brief — 10 original race beds"
Cohesion: 0.33
Nodes (5): Delivery, Music brief — 10 original race beds, Specs, Style, Use

### Community 95 - "IsoProjection"
Cohesion: 0.23
Nodes (4): ChaseCamera, ChaseCameraOptions, HitRewardEffect, IsoProjection

### Community 96 - "TrackLines.ts"
Cohesion: 0.52
Nodes (5): parseLine(), parseTrackLinesManifest(), requireNumber(), requireString(), TrackLinesError

### Community 97 - "Slipstream.ts"
Cohesion: 0.30
Nodes (10): computeRawDraft(), DraftCandidate, draftFromCandidate(), rampAlignment(), rampFalloff(), rampToPeakAndBack(), SLIPSTREAM_DEFAULTS, slipstreamFactor() (+2 more)

### Community 98 - "TrackRenderer.ts"
Cohesion: 0.21
Nodes (11): ScreenPoint, propHash(), sampleCenterline(), ScreenBounds, shade(), TrackRenderer, TrackRendererOptions, PlanetTheme (+3 more)

### Community 99 - "CarManifest.ts"
Cohesion: 0.09
Nodes (29): CarManifestError, cartPortraitFile(), cartPortraitLegacyFile(), cartPortraitToken(), KNOWN_CAR_PERKS, parseCarSetManifest(), parseCarSheet(), parseHomePlanet() (+21 more)

### Community 103 - "linegen/generate.ts"
Cohesion: 0.24
Nodes (9): buildLineCandidates(), clamp(), carsJsonPath, EvalResult, evaluateCandidate(), generateForTrack(), here, outDir (+1 more)

### Community 104 - "ControlList.ts"
Cohesion: 0.28
Nodes (7): controlBlock(), ControlRow, formatHelpBody(), MENU_CONTROLS, RACE_DRIVE_CONTROLS, RACE_SYSTEM_CONTROLS, RACE_WEAPON_CONTROLS

### Community 105 - "GuitarSolo.ts"
Cohesion: 0.48
Nodes (5): createContext(), distortionCurve(), GUITAR_SOLO_DURATION_SECONDS, playGuitarSolo(), SOLO_NOTES

### Community 106 - "NarratorDirector.ts"
Cohesion: 0.29
Nodes (6): CursorKey, NarratorOffer, NarratorSnapshot, NarratorPriority, RACE_PHASE, RacePhase

### Community 107 - "ResultsScene.ts"
Cohesion: 0.16
Nodes (14): containSize(), FitSize, sane(), pickPubBackground(), PUB_BACKGROUND_DIRECTORY, PUB_BACKGROUNDS, PubBackground, pubBackgroundKey() (+6 more)

## Knowledge Gaps
- **488 isolated node(s):** `name`, `version`, `private`, `type`, `description` (+483 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `RaceField` connect `RaceField` to `RaceField.ts`, `vec2`, `RaceSimulation.ts`, `TrackSpline.ts`, `RaceScene`, `RaceScene.ts`, `RaceField.test.ts`, `CarPerk.test.ts`, `Weapons.test.ts`, `.constructor`, `TrackSpline`, `Coast.ts`, `LapTimes.test.ts`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `vec2` connect `vec2` to `RaceField.ts`, `MetalScrapEffect.ts`, `trackgen/preview.ts`, `constants.ts`, `TrackSpline.ts`, `scale`, `CarPerk.test.ts`, `Vec2.ts`, `TrackSpline`, `RaceField`, `trackgen/generate.ts`, `TyreMarks.ts`, `RaceScene.ts`, `ExplosionEffect`, `Weapons.test.ts`, `TrackSelectScene`, `IsoProjection`, `Slipstream.ts`, `TrackRenderer.ts`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `GarageScene` connect `GarageScene` to `GarageScene.ts`, `PlanetSelectScene.ts`, `loadActiveCareer`, `ProgressStore.ts`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _488 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `20 REGULARS — every planet` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `RaceField.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0953058321479374 - nodes in this community are weakly interconnected._
- **Should `vec2` be split into smaller, more focused modules?**
  _Cohesion score 0.11384615384615385 - nodes in this community are weakly interconnected._