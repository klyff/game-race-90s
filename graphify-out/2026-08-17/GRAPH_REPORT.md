# Graph Report - game-race-90s  (2026-08-17)

## Corpus Check
- 327 files · ~8,571,985 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2660 nodes · 6914 edges · 150 communities (124 shown, 26 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `689d0259`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- 20 REGULARS — every planet
- fit-redrawn.ts
- RaceField.test.ts
- SplashAttract.ts
- TrackRenderer.ts
- vec2
- RaceAudio.ts
- .create
- scripts
- Circuitos
- VehicleStats
- RaceScore.ts
- fromAngle
- RaceScene
- ProgressStore.ts
- loadActiveCareer
- Pilotos
- compilerOptions
- CarPerk.test.ts
- MusicScore.ts
- import-fleet.ts
- planetMusic.ts
- HelpScene
- constants.ts
- generate-metal-scraps.ts
- Clock — 32 poses
- TrackDefinition
- renderCar.ts
- PlannedClip
- geometry.ts
- strip-fit.ts
- generate-weapons.ts
- NoiseSource
- ArcadeCarPhysics.ts
- GarageScene.ts
- PauseScene
- RaceAudio
- TitleAudio
- fleet.ts
- HudFormat.ts
- generate-planet-select.ts
- ResultsScene
- SeasonPoints.ts
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
- Wallet.ts
- Delivery reports
- JumpCharges.ts
- TrackSpline
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
- SevenSegment.test.ts
- Vehicle.ts
- CarStatBars.test.ts
- MetalScrapEffect.ts
- ResultsScene.ts
- TrackSelectScene
- HudScene
- NarratorBank.ts
- NarratorPlan.ts
- Iso car strip
- PaceDriver.test.ts
- TyreMarks.ts
- ExplosionEffect
- RaceField.ts
- Music brief — 10 original race beds
- pack-redrawn.ts
- DriverProfile.ts
- HitRewardEffect
- trackgen/preview.ts
- CarManifest.ts
- NarratorDirector
- TourMode.ts
- Sprite-strip
- sprite-strip/SKILL.md
- RacingLine.ts
- Game sprint sprites 2D
- GuitarSolo.ts
- Carros novos — deixa os heróis aqui
- TrackLines.ts
- car-1 — Marauder
- Uso — melhor forma
- car-1/README.md
- redrawn/README.md
- IsoProjection
- generate-lab.ts
- Clock — 32 poses
- Collision — one square, midpoint
- CATALOG.md
- Vec2.ts
- VehicleCapabilityModel.ts
- Regras — tira de relógio (car-1)
- RaceSimulation.ts
- car-1 — Marauder
- RaceScene.ts
- Clock — 32 poses
- CLAUDE.md
- LEIA-ME.md
- PLAN.md
- UtilityEvaluator.ts
- SIMULATION_STEP_SECONDS
- NarratorDirector.ts
- CameraZoomPolicy
- clamp01
- assignNpcCars
- PilotRoster.ts
- PlanetSelectScene
- MenuController
- Intercept.ts
- TrajectoryPlanner.ts
- Slipstream.ts
- PLANETS
- ControlList.ts
- SplashScene
- .toScreen
- Coast.ts
- TurboCharges.ts
- BlinkClock
- MetalScrapEffect
- containSize

## God Nodes (most connected - your core abstractions)
1. `vec2` - 86 edges
2. `GarageScene` - 71 edges
3. `TrackSpline` - 65 edges
4. `RaceScene` - 60 edges
5. `scale()` - 53 edges
6. `RaceField` - 49 edges
7. `add()` - 48 edges
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

## Communities (150 total, 26 thin omitted)

### Community 0 - "20 REGULARS — every planet"
Cohesion: 0.07
Nodes (29): 10. KIRA, 11. SNAKE, 12. RIO, 13. JETT, 14. NOVA, 15. CRUZ, 16. ASH, 17. ZARA (+21 more)

### Community 1 - "fit-redrawn.ts"
Cohesion: 0.10
Nodes (43): chroma(), consumePose(), Crop, fitHq(), fitPoseToFootprint(), isGreenKey(), isPaper(), luma() (+35 more)

### Community 2 - "RaceField.test.ts"
Cohesion: 0.16
Nodes (13): RacerEntry, carsJsonPath, collideWithRearPerk(), freshSpline(), FULL_THROTTLE, fullFieldEntries(), makeField(), manifest (+5 more)

### Community 3 - "SplashAttract.ts"
Cohesion: 0.07
Nodes (45): CARD_FLIP_SECONDS, CARD_GAP_SECONDS, CARD_GROW_FADE_SECONDS, CARD_GROW_SCALE, CARD_SEQUENCE_DELAY_SECONDS, cardBeatSeconds(), cardStartAt(), clamp() (+37 more)

### Community 4 - "TrackRenderer.ts"
Cohesion: 0.22
Nodes (10): propHash(), sampleCenterline(), ScreenBounds, shade(), TrackRenderer, TrackRendererOptions, PlanetTheme, lerp() (+2 more)

### Community 5 - "vec2"
Cohesion: 0.09
Nodes (21): BURN_COLORS, BurnBlotch, BurnMark, Burst, BurstOptions, ExplosionEffectOptions, FIREBALL_COLORS, METAL_COLORS (+13 more)

### Community 6 - "RaceAudio.ts"
Cohesion: 0.20
Nodes (16): isAudioMuted(), setAudioMuted(), clearLoadedMusicBeds(), loaded, loadedMusicBeds(), markMusicBedLoaded(), pickLoadedMusicBed(), createAudioContext() (+8 more)

### Community 7 - ".create"
Cohesion: 0.30
Nodes (5): musicBedKey(), cartPortraitKey(), sheetCellSize(), BootScene, linesCacheKey()

### Community 8 - "scripts"
Cohesion: 0.04
Nodes (45): dependencies, phaser, description, devDependencies, pngjs, @types/pngjs, typescript, vite (+37 more)

### Community 9 - "Circuitos"
Cohesion: 0.05
Nodes (41): Ash Reach, Ash Reach I, Ash Reach II, Ash Reach III, Bogmire Deep, Bogmire Deep I, Bogmire Deep II, Bogmire Deep III (+33 more)

### Community 10 - "VehicleStats"
Cohesion: 0.10
Nodes (37): InputCommand, cross(), RaceFieldOptions, offsetAt(), TrackProjection, AI_DEFAULT_AGGRESSION, AIDriver, closestRivalAhead() (+29 more)

### Community 11 - "RaceScore.ts"
Cohesion: 0.47
Nodes (7): clamp01(), computeRaceScore(), POSITION_WEIGHT, positionFraction(), RaceScoreInput, TIME_WEIGHT, timeFraction()

### Community 12 - "fromAngle"
Cohesion: 0.16
Nodes (25): distance(), dot(), fromAngle(), normalize(), subtract(), aggressorOf(), CONTACT_ATTACKER, contactAttackCredit (+17 more)

### Community 13 - "RaceScene"
Cohesion: 0.07
Nodes (7): KeyboardDriver, DriveIntent, ReverseLatch, ReverseLatchOptions, findCarSheet(), frameIndexForHeading(), RaceScene

### Community 14 - "ProgressStore.ts"
Cohesion: 0.12
Nodes (43): activateSlot(), activeSlotIndex(), beginSlot(), CLEAR_POSITION, creditWallet(), debitWallet(), equipCar(), loadActiveName() (+35 more)

### Community 15 - "loadActiveCareer"
Cohesion: 0.22
Nodes (8): buyCar(), cashInPoints(), loadActiveCareer(), loadCleared(), loadWonTracks(), isTourModeOn(), highestUnlockedPlanetIndex(), HUB_FOCUS

### Community 16 - "Pilotos"
Cohesion: 0.06
Nodes (31): Agent (derivado do mesmo seed), ALINE, ASH, BLAZE, CRUZ, DAVE, DIEGO, Driver Personality (+23 more)

### Community 17 - "compilerOptions"
Cohesion: 0.07
Nodes (28): DOM, DOM.Iterable, ES2022, src, tests, tools, vite/client, vitest/globals (+20 more)

### Community 18 - "CarPerk.test.ts"
Cohesion: 0.10
Nodes (29): HOME_WORLD_STAT_BONUS, applyImpactDamage(), applyWeaponDamage(), CAR_CONDITION, CarCondition, conditionFromIntegrity(), createCarIntegrity(), DAMAGE_ROLE (+21 more)

### Community 19 - "MusicScore.ts"
Cohesion: 0.12
Nodes (29): barCount(), barHasLick(), barIndexForStep(), BEATS_PER_BAR, beatsToSeconds(), ChordStep, eighthInBarForStep(), LeadNote (+21 more)

### Community 20 - "import-fleet.ts"
Cohesion: 0.13
Nodes (28): bestCollisionBox(), collisionSquares(), collisionBoxForCarId(), collisionBoxFromDef(), FLEET_MODEL_ID, rounded(), withCollisionBox(), groundExtents() (+20 more)

### Community 21 - "planetMusic.ts"
Cohesion: 0.11
Nodes (16): ASH_REACH_SCORE, BOGMIRE_DEEP_SCORE, CHROME_VERGE_SCORE, CRYO_HOLLOW_SCORE, DOUBLE_KICK_DRUM, FERRO_RUST_SCORE, HEAVY_STRUM, NEON_KASBAH_SCORE (+8 more)

### Community 23 - "constants.ts"
Cohesion: 0.25
Nodes (14): CAR_PERK, PALETTE_ROLE, SIMULATION_HZ, airBlade, airBoat, battleTrak, delorean, dirtDevil (+6 more)

### Community 24 - "generate-metal-scraps.ts"
Cohesion: 0.21
Nodes (15): chunk(), crc32(), drawScrap(), EDGE, emptyFrame(), encodePng(), fillPoly(), fillRect() (+7 more)

### Community 25 - "Clock — 32 poses"
Cohesion: 0.18
Nodes (7): Claude Code — desenhar um carro (tira de relógio), Anchors (draw these first), Clock — 32 poses, Full table, Lights and parts by yaw, Size — fixed world, not fill-the-cell, Handoff — modelo X → tira de relógio

### Community 26 - "TrackDefinition"
Cohesion: 0.11
Nodes (22): GENERATED_TRACKS, findTrack(), TRACKS, thunderBasin, AgentTickInput, RacingLine, RampZone, TrackDefinition (+14 more)

### Community 27 - "renderCar.ts"
Cohesion: 0.09
Nodes (37): CAR_SPRITE_FRAME_ARC, ISO_X, ISO_Y, clampByte(), parseHex(), quantize(), RAMP_FACTORS, RampTable (+29 more)

### Community 28 - "PlannedClip"
Cohesion: 0.13
Nodes (9): PlannedClip, ScheduledBanter, NARRATOR_MAX_SEQUENCE, NARRATOR_PRIORITY, NarratorQueue, A, B, C (+1 more)

### Community 29 - "geometry.ts"
Cohesion: 0.15
Nodes (16): PaletteRole, SHADE_STEP, ShadeStep, cross(), dot(), Face, length(), prismFaces() (+8 more)

### Community 30 - "strip-fit.ts"
Cohesion: 0.39
Nodes (6): Box, boxFromPoses(), centerInBox(), containScale(), innerCell(), Size

### Community 31 - "generate-weapons.ts"
Cohesion: 0.19
Nodes (18): chunk(), crc32(), drawMine(), drawMissile(), drawOil(), drawTurbo(), emptyFrame(), encodePng() (+10 more)

### Community 32 - "NoiseSource"
Cohesion: 0.12
Nodes (7): BrakeVoice, clampUnit(), clampUnit(), ExplosionVoice, NoiseSource, clampUnit(), SkidVoice

### Community 33 - "ArcadeCarPhysics.ts"
Cohesion: 0.08
Nodes (40): LATERAL_GRIP_STIFFNESS, OFFROAD_GRIP_MULTIPLIER, OFFROAD_ROLLING_RESISTANCE, OVERSPEED_ALLOWANCE, REVERSE_SPEED_FRACTION, STEERING_AUTHORITY_SPEED, TARMAC_ROLLING_RESISTANCE, YAW_SPIN_DECAY_PER_SECOND (+32 more)

### Community 34 - "GarageScene.ts"
Cohesion: 0.15
Nodes (23): sellCar(), CAR_TIER, CarTier, carUnlockHint(), catalogEntry, GARAGE_CATALOG, isCarUnlocked(), isStarterCar() (+15 more)

### Community 36 - "RaceAudio"
Cohesion: 0.13
Nodes (3): clampUnit(), EngineVoice, RaceAudio

### Community 37 - "TitleAudio"
Cohesion: 0.13
Nodes (3): BedPlayer, TitleAudio, TitleMusic

### Community 38 - "fleet.ts"
Cohesion: 0.13
Nodes (18): CarSheetManifest, CarPerkId, WORLD_ADVANTAGE, WorldAdvantage, templateCar, FleetCarDef, STATS_AIR_BLADE, STATS_AIR_BOAT (+10 more)

### Community 39 - "HudFormat.ts"
Cohesion: 0.26
Nodes (10): loadPoints(), formatCountdown(), formatHud(), formatIntegrityPercent(), formatRaceTime(), formatSpeed(), formatSpeedDigits(), formatSpeedFraction() (+2 more)

### Community 40 - "generate-planet-select.ts"
Cohesion: 0.20
Nodes (12): bandedGradient(), calmFactor(), here, lerp(), outDir, Rgb, SelectSpec, silhouetteHeightAt() (+4 more)

### Community 42 - "SeasonPoints.ts"
Cohesion: 0.16
Nodes (18): BASE_FIRST_POINTS, CASH_IN_PAYOUT, cashInBatches(), cashInValue(), CONTACT_HIT_POINTS, firstPlacePoints(), hitScale(), MINE_HIT_POINTS (+10 more)

### Community 43 - "MusicPlayer"
Cohesion: 0.22
Nodes (4): clampUnit(), MusicPlayer, DrumStep, MusicScore

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

### Community 53 - "Wallet.ts"
Cohesion: 0.15
Nodes (23): Burst, rewardLabel(), Star, BASE_FIRST_PRIZE, CONTACT_HIT_BOUNTY, contactHitBounty(), firstPlacePrize(), formatCash() (+15 more)

### Community 54 - "Delivery reports"
Cohesion: 0.10
Nodes (21): 2026-08-15 20:31 PDT — T-012 round (uncommitted, `main`), 2026-08-16 — T-018 delivered: the game opens on the splash screen, Agents involved this round, Agents involved this round, Agents involved this round, Context cleanup — 2026-08-15 17:02 PDT — user requested a manual clean after compaction #1, Context cleanup — 2026-08-15 17:32 PDT — user asked for a save point before clearing the context, Context cleanup — 2026-08-15 17:45 PDT — user played the game, accepted it, and asked for a save point before clearing the context (+13 more)

### Community 55 - "JumpCharges.ts"
Cohesion: 0.25
Nodes (11): clamp(), consumeJump(), createJumpCharges(), HOP_LAUNCH_SPEED, HOP_REF_MASS, HOP_REF_SPEED, HOP_SCALE_MAX, HOP_SCALE_MIN (+3 more)

### Community 56 - "TrackSpline"
Cohesion: 0.30
Nodes (3): distanceSquared(), TrackSpline, driveLap()

### Community 57 - "RaceField"
Cohesion: 0.16
Nodes (5): RaceField, oilYawSpinForArmor(), TrackHazard, Missile, measure()

### Community 58 - "New tasks opened 2026-08-16 by the owner (T-043..T-047)"
Cohesion: 0.11
Nodes (18): Agents involved this round, Context cleanup — 2026-08-16 01:00 — context reached 375k, past the 290k ceiling, Context cleanup — 2026-08-16 06:20 — context reached 408k, past the 290k ceiling, owner restarting for mobile, Final handoff — 2026-08-16 ~01:40 — Cursor session (Grok) picked up from the 01:05 Claude handoff, Final handoff — 2026-08-16 ~03:35 — Cursor session (Opus) — Competitive NPCs / Aim / Race Flow / 30 Tracks, How the next agent continues — unchanged order, now with the decisions settled, Known balance finding (honest, not a bug), New tasks opened 2026-08-16 by the owner (T-043..T-047) (+10 more)

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
Cohesion: 0.13
Nodes (24): relativeSpeedAlong(), OpponentMemoryEntry, AgentDebugSnapshot, AgentDecision, closestAhead(), closestBehind(), emptyCapabilities(), executionOf() (+16 more)

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
Nodes (22): CAR_ASSET_DIRECTORY, CAR_MANIFEST_KEY, DEBRIS_ASSET_DIRECTORY, DEFAULT_TRACK_ID, GARAGE_ART_FILE, GARAGE_ART_KEY, GROUND_ASSET_DIRECTORY, LINES_ASSET_DIRECTORY (+14 more)

### Community 73 - "Context cleanup — 2026-08-15 23:10 — context reached 312k, past the 290k ceiling"
Cohesion: 0.50
Nodes (4): Agents involved this round, Art was reorganised this turn — the old paths are gone, do not look for them, Context cleanup — 2026-08-15 23:10 — context reached 312k, past the 290k ceiling, How the next agent continues

### Community 74 - "circuit-maps.ts"
Cohesion: 0.16
Nodes (19): COLOR_BACKGROUND, COLOR_GUIDE, COLOR_PURSUIT, COLOR_PURSUIT_LINE, COLOR_ROAD, COLOR_START, createBitmap(), drawSegment() (+11 more)

### Community 78 - "SevenSegment.test.ts"
Cohesion: 0.09
Nodes (24): BLANK_PATTERN, DIGIT_PATTERNS, isSegmentLit(), WHY: the vertical segments (f/b, e/c) already occupy the full `STROKE` width at…, SEGMENT, SEGMENT_LAYOUT, SegmentName, SegmentRect (+16 more)

### Community 79 - "Vehicle.ts"
Cohesion: 0.23
Nodes (5): TuningOverlay, formatTuningOverlay(), safeFormat(), TuningOverlayReadout, VehicleTelemetry

### Community 80 - "CarStatBars.test.ts"
Cohesion: 0.14
Nodes (12): normalise(), safeStat(), STAT_BAR_FIELDS, StatBar, statBars(), perkProfile(), BASE_STATS, carIds (+4 more)

### Community 83 - "MetalScrapEffect.ts"
Cohesion: 0.25
Nodes (13): SCRAP_HARD_COUNT, SCRAP_HARD_SPEED, SCRAP_LIGHT_COUNT, SCRAP_MEDIUM_COUNT, SCRAP_MEDIUM_SPEED, SCRAP_ROSTER_SIZE, SCRAP_SPRITES, scrapCountForHit() (+5 more)

### Community 84 - "ResultsScene.ts"
Cohesion: 0.13
Nodes (16): paintRoundedPlaque(), PLAQUE_INK, PLAQUE_LINE, PlaquePaint, pickPubBackground(), PUB_BACKGROUND_DIRECTORY, PUB_BACKGROUNDS, PubBackground (+8 more)

### Community 85 - "TrackSelectScene"
Cohesion: 0.23
Nodes (3): CampaignTrack, findPlanet(), TrackSelectScene

### Community 86 - "HudScene"
Cohesion: 0.15
Nodes (5): HudReadout, HudText, barColour(), HudScene, HudSource

### Community 87 - "NarratorBank.ts"
Cohesion: 0.17
Nodes (14): createElement(), BANTER_EXTRA_IDS, LINES_BY_ID, NARRATOR_CATEGORY, NARRATOR_LAB_DIRECTORY, NARRATOR_LINES, NARRATOR_STASH_DIRECTORY, NarratorClip (+6 more)

### Community 88 - "NarratorPlan.ts"
Cohesion: 0.27
Nodes (16): banterLines(), linesInCategory(), pickNarratorVoice(), buildEventPool(), clampInt(), clipFor(), finalLapHoles(), nextWeighted() (+8 more)

### Community 89 - "Iso car strip"
Cohesion: 0.20
Nodes (10): After images exist, Contract (not negotiable), Forbidden, Image prompt (game cell), Image prompt (HQ still), Inputs (refuse if missing), Iso car strip, Next car (+2 more)

### Community 90 - "PaceDriver.test.ts"
Cohesion: 0.18
Nodes (12): carSetManifest, carsJsonPath, carsJsonRaw, curvatureAt(), driver, findLocationWithCurvatureSign(), findTightestCorner(), marauderSheet (+4 more)

### Community 91 - "TyreMarks.ts"
Cohesion: 0.15
Nodes (7): ROAD_DEPTH, freshAlphaFor(), Segment, slideIntensity(), TyreMarks, TyreMarksOptions, WheelTrail

### Community 92 - "ExplosionEffect"
Cohesion: 0.20
Nodes (4): ExplosionEffect, lerpColor(), sampleFireballColor(), seededRandom()

### Community 93 - "RaceField.ts"
Cohesion: 0.06
Nodes (67): isWarTankPerk(), VEC2_ZERO, CONTACT_SIDE, ContactSide, RacerRuntime, CarIntegrity, CarPerkProfile, ageHazards() (+59 more)

### Community 94 - "Music brief — 10 original race beds"
Cohesion: 0.33
Nodes (5): Delivery, Music brief — 10 original race beds, Specs, Style, Use

### Community 95 - "pack-redrawn.ts"
Cohesion: 0.11
Nodes (30): CAR_FRAME_WIDTH, main(), OUTPUT_DIRECTORY, REPO_ROOT, CARS_DIRECTORY, installStrip(), main(), parseArgs() (+22 more)

### Community 96 - "DriverProfile.ts"
Cohesion: 0.16
Nodes (22): deriveProfile(), WEIGHT_SALTS, clampWeights(), DERIVED_SPECS, DRIVER_PROFILE_TIER, DRIVER_WEIGHT_IDS, DriverProfile, DriverProfileTier (+14 more)

### Community 98 - "trackgen/preview.ts"
Cohesion: 0.14
Nodes (21): createViewport(), COLOR_BACKGROUND, COLOR_CHECKPOINT, COLOR_CONTROL, COLOR_FAST, COLOR_SHOULDER, COLOR_START, COLOR_SURFACE (+13 more)

### Community 99 - "CarManifest.ts"
Cohesion: 0.07
Nodes (41): CarManifestError, cartHeroFile(), cartPortraitFile(), cartPortraitLegacyFile(), cartPortraitToken(), cartStripFile(), foldCollisionStats(), KNOWN_CAR_PERKS (+33 more)

### Community 101 - "TourMode.ts"
Cohesion: 0.47
Nodes (6): enableTourMode(), enableTourModeFromSearch(), feedTourCode(), resetTourMode(), TOUR_CODE, tourModeFromSearch()

### Community 102 - "Sprite-strip"
Cohesion: 0.20
Nodes (10): After images exist, Contract (not negotiable), Forbidden, Image prompt (game cell), Image prompt (HQ still), Inputs (refuse if missing), Next car, Outputs (+2 more)

### Community 103 - "sprite-strip/SKILL.md"
Cohesion: 0.25
Nodes (4): 3/4 painted size (frames 0, 8, 16, 24), Check, Fit — generated still → 128 cell, Steps

### Community 104 - "RacingLine.ts"
Cohesion: 0.18
Nodes (15): meanCornerTightness(), buildLineCandidates(), clamp(), findLineForCar(), LineCandidate, chooseLineByAccount(), clamp(), driveOptionsFor() (+7 more)

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

### Community 113 - "IsoProjection"
Cohesion: 0.17
Nodes (7): ChaseCamera, ChaseCameraOptions, IsoProjection, SCREEN_ROTATION_SIGN, ScreenPoint, VehicleViewExtras, ISO_Z

### Community 114 - "generate-lab.ts"
Cohesion: 0.21
Nodes (12): NARRATOR_VOICES, NarratorCategory, narratorClipFile(), BASE_INSTRUCTIONS, CATEGORY_INSTRUCTIONS, FORCE, LAB_DIRECTORY, main() (+4 more)

### Community 115 - "Clock — 32 poses"
Cohesion: 0.40
Nodes (5): Anchors (draw these first), Clock — 32 poses, Full table, Lights and parts by yaw, Size — fixed world, not fill-the-cell

### Community 116 - "Collision — one square, midpoint"
Cohesion: 0.40
Nodes (4): After a new strip, Collision — one square, midpoint, One box for every yaw, Where it lives

### Community 118 - "Vec2.ts"
Cohesion: 0.13
Nodes (21): computeBounds(), add(), angleOf(), scale(), gridSlotPosition(), buildStartingGrid(), trackSurfaceGrip(), createVehicleState() (+13 more)

### Community 119 - "VehicleCapabilityModel.ts"
Cohesion: 0.13
Nodes (18): TUNING_STILL_REQUIRED, buildStatNormalizer(), capabilitiesFromStats(), FIELDS, minMax(), mix(), planningCapabilities(), planningStats() (+10 more)

### Community 120 - "Regras — tira de relógio (car-1)"
Cohesion: 0.29
Nodes (6): Contrato, Ordem, Proibido, Prompt de cada célula 128×128, Prompt de cada HQ 512×512, Regras — tira de relógio (car-1)

### Community 121 - "RaceSimulation.ts"
Cohesion: 0.15
Nodes (16): advanceLapProgress(), checkpointDistance(), createLapProgress(), LapProgress, IMPORTANT: Use the starting value of nextCheckpoint for the checkpoint index…, RacerProgress, RacerStanding, rankRacers() (+8 more)

### Community 122 - "car-1 — Marauder"
Cohesion: 0.33
Nodes (5): car-1 — Marauder, Do not change, Lock, Outputs, Refs in this pack

### Community 123 - "RaceScene.ts"
Cohesion: 0.25
Nodes (12): CarSetManifest, TrackLinesManifest, BURN_MARK_LIFETIME_LAPS, game, GarageSceneData, HelpSceneData, AUDIO_VALUES, PauseSceneData (+4 more)

### Community 124 - "Clock — 32 poses"
Cohesion: 0.33
Nodes (5): Anchors (draw these first), Clock — 32 poses, Full table, Lights and parts by yaw, Size — fixed world, not fill-the-cell

### Community 128 - "UtilityEvaluator.ts"
Cohesion: 0.18
Nodes (18): formatAiOverlay(), safe(), EXECUTION_STATE, evaluateOpportunities(), NearbyRival, RaceSituation, raceTacticalValue(), SituationOpportunities (+10 more)

### Community 131 - "NarratorDirector.ts"
Cohesion: 0.29
Nodes (6): CursorKey, NarratorOffer, NarratorSnapshot, NarratorPriority, RACE_PHASE, RacePhase

### Community 133 - "clamp01"
Cohesion: 0.22
Nodes (11): clamp01(), decayField(), decayMemory(), emptyMemory(), memoryEffect(), OpponentMemoryBook, recordBlockedBy(), recordNearMiss() (+3 more)

### Community 135 - "PilotRoster.ts"
Cohesion: 0.18
Nodes (15): DRIVER_CARD_DIRECTORY, DRIVER_CARDS, DriverCard, driverCardForName(), driverCardKey(), driverCardUrl(), CHAMPIONSHIP_SIZE, drawRivalNames() (+7 more)

### Community 137 - "MenuController"
Cohesion: 0.17
Nodes (3): clampIndex(), MenuController, wrapIndex()

### Community 138 - "Intercept.ts"
Cohesion: 0.30
Nodes (10): interceptPoint(), observedPosition(), predictionTime(), predictPosition(), clamp(), hash32(), hashUnit(), lerp() (+2 more)

### Community 139 - "TrajectoryPlanner.ts"
Cohesion: 0.27
Nodes (10): candidateOffsets(), LATERAL_FRACTIONS, maxSafeOffset(), NearbyLateral, planTrajectory(), scoreCandidate(), TrajectoryCandidate, trajectoryScore() (+2 more)

### Community 140 - "Slipstream.ts"
Cohesion: 0.30
Nodes (10): computeRawDraft(), DraftCandidate, draftFromCandidate(), rampAlignment(), rampFalloff(), rampToPeakAndBack(), SLIPSTREAM_DEFAULTS, slipstreamFactor() (+2 more)

### Community 141 - "PLANETS"
Cohesion: 0.40
Nodes (7): planetForTrackId(), PLANETS, DEFAULT_THEME, everyPlanetHasTheme(), PLANET_THEMES, themeForPlanetId(), themeForTrackId()

### Community 142 - "ControlList.ts"
Cohesion: 0.28
Nodes (7): controlBlock(), ControlRow, formatHelpBody(), MENU_CONTROLS, RACE_DRIVE_CONTROLS, RACE_SYSTEM_CONTROLS, RACE_WEAPON_CONTROLS

### Community 145 - "Coast.ts"
Cohesion: 0.39
Nodes (5): CEREMONY_HOLD_SECONDS, COAST_BRAKE, COAST_STOP_SPEED, coastInput(), isNearlyStopped()

### Community 146 - "TurboCharges.ts"
Cohesion: 0.46
Nodes (6): consumeTurbo(), createTurboCharges(), refillTurboCharges(), TURBO_DURATION_SECONDS, TURBO_SPEED_BONUS, TURBO_START_COUNT

### Community 149 - "containSize"
Cohesion: 0.60
Nodes (3): containSize(), FitSize, sane()

## Knowledge Gaps
- **677 isolated node(s):** `name`, `version`, `private`, `type`, `description` (+672 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vec2` connect `vec2` to `TrackRenderer.ts`, `Intercept.ts`, `VehicleStats`, `Slipstream.ts`, `fromAngle`, `.toScreen`, `CarPerk.test.ts`, `TrackDefinition`, `ArcadeCarPhysics.ts`, `Wallet.ts`, `TrackSpline`, `RaceField`, `RacingAgent.ts`, `trackgen/generate.ts`, `circuit-maps.ts`, `Vehicle.ts`, `MetalScrapEffect.ts`, `TyreMarks.ts`, `ExplosionEffect`, `RaceField.ts`, `HitRewardEffect`, `trackgen/preview.ts`, `IsoProjection`, `Vec2.ts`, `RaceScene.ts`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `GarageScene` connect `GarageScene` to `GarageScene.ts`, `MenuController`, `loadActiveCareer`, `CarStatBars.test.ts`, `RaceScene.ts`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `RaceScene` connect `RaceScene` to `SIMULATION_STEP_SECONDS`, `CameraZoomPolicy`, `TrackRenderer.ts`, `VehicleStats`, `PLANETS`, `.toScreen`, `MetalScrapEffect`, `TrackDefinition`, `RaceAudio`, `HudFormat.ts`, `TrackSpline`, `RaceField`, `Vehicle.ts`, `TyreMarks.ts`, `ExplosionEffect`, `HitRewardEffect`, `NarratorDirector`, `IsoProjection`, `RaceScene.ts`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _677 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `20 REGULARS — every planet` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `fit-redrawn.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10283687943262411 - nodes in this community are weakly interconnected._
- **Should `SplashAttract.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07418788410886742 - nodes in this community are weakly interconnected._