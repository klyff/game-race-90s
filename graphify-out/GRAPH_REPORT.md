# Graph Report - game-race-90s  (2026-08-17)

## Corpus Check
- 328 files · ~8,572,955 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2673 nodes · 6954 edges · 148 communities (130 shown, 18 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `09cd74ae`
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
- TrackSpline.ts
- RaceScore.ts
- Vec2.ts
- RaceScene
- ProgressStore.ts
- qa-strip.ts
- Pilotos
- compilerOptions
- CarPerk.test.ts
- MusicScore.ts
- import-fleet.ts
- planetMusic.ts
- main.ts
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
- planets.ts
- BootScene.ts
- Context cleanup — 2026-08-15 23:10 — context reached 312k, past the 290k ceiling
- circuit-maps.ts
- drive.mjs
- probe.mjs
- screenshot.mjs
- SevenSegment.test.ts
- VehicleTelemetry
- findCarSheet
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
- RaceScene.ts
- Music brief — 10 original race beds
- spritegen/preview.ts
- DriverProfile.ts
- SplashLayout.ts
- trackgen/preview.ts
- CarManifest.ts
- NarratorDirector.ts
- SplashScene.ts
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
- LapTimes.test.ts
- VehicleCapabilityModel.ts
- Regras — tira de relógio (car-1)
- RaceSimulation.ts
- car-1 — Marauder
- CarSetManifest
- Clock — 32 poses
- CLAUDE.md
- LEIA-ME.md
- PLAN.md
- UtilityEvaluator.ts
- SIMULATION_STEP_SECONDS
- SplashAttractShow
- SpeedoGauge.ts
- clamp01
- trackgen/generate.ts
- PilotRoster.ts
- PlanetSelectScene
- HudScene.ts
- Intercept.ts
- TrajectoryPlanner.ts
- Vehicle.ts
- planetThemes.ts
- EngineVoice
- SplashScene
- scale
- InputCommand.ts
- RaceField.ts
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
- `Chosen` --references--> `TrackDefinition`  [EXTRACTED]
  tools/trackgen/generate.ts → src/domain/track/TrackDefinition.ts
- `RenderedCar` --references--> `CarSheetManifest`  [EXTRACTED]
  tools/spritegen/renderCar.ts → src/data/cars/CarManifest.ts
- `generateForTrack()` --calls--> `parseCarSetManifest()`  [EXTRACTED]
  tools/linegen/generate.ts → src/data/cars/CarManifest.ts
- `installStrip()` --calls--> `parseCarSetManifest()`  [EXTRACTED]
  tools/spritegen/pack-redrawn.ts → src/data/cars/CarManifest.ts

## Import Cycles
- None detected.

## Communities (148 total, 18 thin omitted)

### Community 0 - "20 REGULARS — every planet"
Cohesion: 0.07
Nodes (29): 10. KIRA, 11. SNAKE, 12. RIO, 13. JETT, 14. NOVA, 15. CRUZ, 16. ASH, 17. ZARA (+21 more)

### Community 1 - "fit-redrawn.ts"
Cohesion: 0.11
Nodes (32): CAR_SPRITE_FRAME_ARC, chroma(), Crop, fitHq(), fitPoseToFootprint(), isGreenKey(), isPaper(), luma() (+24 more)

### Community 2 - "RaceField.test.ts"
Cohesion: 0.11
Nodes (23): applyImpactDamage(), applyWeaponDamage(), CAR_CONDITION, CarCondition, conditionFromIntegrity(), createCarIntegrity(), DAMAGE_ROLE, tickIntegrity() (+15 more)

### Community 3 - "SplashAttract.ts"
Cohesion: 0.15
Nodes (23): CARD_FLIP_SECONDS, CARD_GAP_SECONDS, CARD_GROW_FADE_SECONDS, CARD_GROW_SCALE, CARD_SEQUENCE_DELAY_SECONDS, cardBeatSeconds(), cardStartAt(), clamp() (+15 more)

### Community 4 - "TrackRenderer.ts"
Cohesion: 0.22
Nodes (10): ScreenPoint, propHash(), sampleCenterline(), ScreenBounds, shade(), TrackRenderer, TrackRendererOptions, PlanetTheme (+2 more)

### Community 5 - "vec2"
Cohesion: 0.11
Nodes (18): BURN_COLORS, BurnBlotch, BurnMark, Burst, BurstOptions, ExplosionEffectOptions, FIREBALL_COLORS, METAL_COLORS (+10 more)

### Community 6 - "RaceAudio.ts"
Cohesion: 0.19
Nodes (16): isAudioMuted(), setAudioMuted(), clearLoadedMusicBeds(), loaded, loadedMusicBeds(), markMusicBedLoaded(), pickLoadedMusicBed(), createAudioContext() (+8 more)

### Community 7 - ".create"
Cohesion: 0.35
Nodes (4): musicBedKey(), cartPortraitKey(), pubBackgroundKey(), BootScene

### Community 8 - "scripts"
Cohesion: 0.04
Nodes (46): dependencies, phaser, description, devDependencies, pngjs, @types/pngjs, typescript, vite (+38 more)

### Community 9 - "Circuitos"
Cohesion: 0.05
Nodes (41): Ash Reach, Ash Reach I, Ash Reach II, Ash Reach III, Bogmire Deep, Bogmire Deep I, Bogmire Deep II, Bogmire Deep III (+33 more)

### Community 10 - "TrackSpline.ts"
Cohesion: 0.12
Nodes (29): cross(), TrackProjection, AI_DEFAULT_AGGRESSION, closestRivalAhead(), cornerTargetSpeed(), speedCommand(), paceCommand(), PaceDriver (+21 more)

### Community 11 - "RaceScore.ts"
Cohesion: 0.47
Nodes (7): clamp01(), computeRaceScore(), POSITION_WEIGHT, positionFraction(), RaceScoreInput, TIME_WEIGHT, timeFraction()

### Community 12 - "Vec2.ts"
Cohesion: 0.17
Nodes (22): dot(), normalize(), perpendicularLeft(), subtract(), aggressorOf(), CONTACT_ATTACKER, contactAttackCredit, ContactAttacker (+14 more)

### Community 13 - "RaceScene"
Cohesion: 0.06
Nodes (7): KeyboardDriver, DriveIntent, ReverseLatch, ReverseLatchOptions, CameraZoomPolicy, CameraZoomPolicyOptions, RaceScene

### Community 14 - "ProgressStore.ts"
Cohesion: 0.11
Nodes (44): activateSlot(), activeSlotIndex(), beginSlot(), CLEAR_POSITION, creditWallet(), debitWallet(), equipCar(), loadActiveName() (+36 more)

### Community 15 - "qa-strip.ts"
Cohesion: 0.13
Nodes (34): chroma(), isInkBlack(), isPaper(), luma(), main(), nearest(), parseArgs(), poseBudget() (+26 more)

### Community 16 - "Pilotos"
Cohesion: 0.06
Nodes (31): Agent (derivado do mesmo seed), ALINE, ASH, BLAZE, CRUZ, DAVE, DIEGO, Driver Personality (+23 more)

### Community 17 - "compilerOptions"
Cohesion: 0.07
Nodes (28): DOM, DOM.Iterable, ES2022, src, tests, tools, vite/client, vitest/globals (+20 more)

### Community 18 - "CarPerk.test.ts"
Cohesion: 0.16
Nodes (15): HOME_WORLD_STAT_BONUS, DamageRole, CAR_PERKS, clampUnit(), contactStats(), lerp(), NEUTRAL_PERK, perkDamageMultiplier() (+7 more)

### Community 19 - "MusicScore.ts"
Cohesion: 0.12
Nodes (30): barCount(), barHasLick(), barIndexForStep(), BEATS_PER_BAR, beatsToSeconds(), ChordStep, DrumStep, eighthInBarForStep() (+22 more)

### Community 20 - "import-fleet.ts"
Cohesion: 0.25
Nodes (15): cellBounds(), contentBox(), contentRowRange(), extractFrame(), importCar(), isContent(), ORIGIN, OUTPUT_DIRECTORY (+7 more)

### Community 21 - "planetMusic.ts"
Cohesion: 0.11
Nodes (16): ASH_REACH_SCORE, BOGMIRE_DEEP_SCORE, CHROME_VERGE_SCORE, CRYO_HOLLOW_SCORE, DOUBLE_KICK_DRUM, FERRO_RUST_SCORE, HEAVY_STRUM, NEON_KASBAH_SCORE (+8 more)

### Community 22 - "main.ts"
Cohesion: 0.13
Nodes (10): controlBlock(), ControlRow, formatHelpBody(), MENU_CONTROLS, RACE_DRIVE_CONTROLS, RACE_SYSTEM_CONTROLS, RACE_WEAPON_CONTROLS, game (+2 more)

### Community 23 - "constants.ts"
Cohesion: 0.24
Nodes (15): CAR_PERK, CarPerkId, PALETTE_ROLE, SIMULATION_HZ, airBlade, airBoat, battleTrak, delorean (+7 more)

### Community 24 - "generate-metal-scraps.ts"
Cohesion: 0.21
Nodes (15): chunk(), crc32(), drawScrap(), EDGE, emptyFrame(), encodePng(), fillPoly(), fillRect() (+7 more)

### Community 25 - "Clock — 32 poses"
Cohesion: 0.18
Nodes (7): Claude Code — desenhar um carro (tira de relógio), Anchors (draw these first), Clock — 32 poses, Full table, Lights and parts by yaw, Size — fixed world, not fill-the-cell, Handoff — modelo X → tira de relógio

### Community 26 - "TrackDefinition"
Cohesion: 0.09
Nodes (32): GENERATED_TRACKS, findTrack(), TRACKS, thunderBasin, AgentTickInput, angleOf(), advanceLapProgress(), checkpointDistance() (+24 more)

### Community 27 - "renderCar.ts"
Cohesion: 0.09
Nodes (33): ISO_X, ISO_Y, SHADE_STEP, ShadeStep, clampByte(), parseHex(), quantize(), RAMP_FACTORS (+25 more)

### Community 28 - "PlannedClip"
Cohesion: 0.14
Nodes (9): PlannedClip, ScheduledBanter, NARRATOR_MAX_SEQUENCE, NARRATOR_PRIORITY, NarratorQueue, A, B, C (+1 more)

### Community 29 - "geometry.ts"
Cohesion: 0.24
Nodes (12): PaletteRole, cross(), dot(), Face, length(), prismFaces(), sectionCorners(), sub() (+4 more)

### Community 30 - "strip-fit.ts"
Cohesion: 0.39
Nodes (6): Box, boxFromPoses(), centerInBox(), containScale(), innerCell(), Size

### Community 31 - "generate-weapons.ts"
Cohesion: 0.19
Nodes (18): chunk(), crc32(), drawMine(), drawMissile(), drawOil(), drawTurbo(), emptyFrame(), encodePng() (+10 more)

### Community 32 - "NoiseSource"
Cohesion: 0.16
Nodes (5): clampUnit(), ExplosionVoice, NoiseSource, clampUnit(), SkidVoice

### Community 33 - "ArcadeCarPhysics.ts"
Cohesion: 0.09
Nodes (29): LATERAL_GRIP_STIFFNESS, OFFROAD_GRIP_MULTIPLIER, OFFROAD_ROLLING_RESISTANCE, OVERSPEED_ALLOWANCE, REVERSE_SPEED_FRACTION, STEERING_AUTHORITY_SPEED, TARMAC_ROLLING_RESISTANCE, YAW_SPIN_DECAY_PER_SECOND (+21 more)

### Community 34 - "GarageScene.ts"
Cohesion: 0.13
Nodes (31): buyCar(), cashInPoints(), loadActiveCareer(), loadCleared(), loadPoints(), loadWonTracks(), sellCar(), isTourModeOn() (+23 more)

### Community 36 - "RaceAudio"
Cohesion: 0.13
Nodes (3): BrakeVoice, clampUnit(), RaceAudio

### Community 37 - "TitleAudio"
Cohesion: 0.13
Nodes (3): BedPlayer, TitleAudio, TitleMusic

### Community 38 - "fleet.ts"
Cohesion: 0.12
Nodes (17): CarSheetManifest, WORLD_ADVANTAGE, WorldAdvantage, templateCar, FleetCarDef, STATS_AIR_BLADE, STATS_AIR_BOAT, STATS_BATTLE_TRAK (+9 more)

### Community 39 - "HudFormat.ts"
Cohesion: 0.32
Nodes (9): formatCountdown(), formatHud(), formatIntegrityPercent(), formatRaceTime(), formatSpeed(), formatSpeedDigits(), formatSpeedFraction(), MPH_PER_WORLD_UNIT (+1 more)

### Community 40 - "generate-planet-select.ts"
Cohesion: 0.20
Nodes (12): bandedGradient(), calmFactor(), here, lerp(), outDir, Rgb, SelectSpec, silhouetteHeightAt() (+4 more)

### Community 42 - "pack-redrawn.ts"
Cohesion: 0.15
Nodes (23): collisionBoxForCarId(), collisionBoxFromDef(), FLEET_MODEL_ID, rounded(), withCollisionBox(), main(), groundExtents(), main() (+15 more)

### Community 43 - "MusicPlayer"
Cohesion: 0.23
Nodes (3): clampUnit(), MusicPlayer, MusicScore

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
Nodes (3): activeSlotSafe(), GarageScene, HUB_FOCUS

### Community 53 - "Wallet.ts"
Cohesion: 0.09
Nodes (37): BASE_FIRST_POINTS, CASH_IN_PAYOUT, cashInBatches(), CONTACT_HIT_POINTS, firstPlacePoints(), hitScale(), MINE_HIT_POINTS, MISSILE_HIT_POINTS (+29 more)

### Community 54 - "Delivery reports"
Cohesion: 0.10
Nodes (21): 2026-08-15 20:31 PDT — T-012 round (uncommitted, `main`), 2026-08-16 — T-018 delivered: the game opens on the splash screen, Agents involved this round, Agents involved this round, Agents involved this round, Context cleanup — 2026-08-15 17:02 PDT — user requested a manual clean after compaction #1, Context cleanup — 2026-08-15 17:32 PDT — user asked for a save point before clearing the context, Context cleanup — 2026-08-15 17:45 PDT — user played the game, accepted it, and asked for a save point before clearing the context (+13 more)

### Community 55 - "JumpCharges.ts"
Cohesion: 0.25
Nodes (11): clamp(), consumeJump(), createJumpCharges(), HOP_LAUNCH_SPEED, HOP_REF_MASS, HOP_REF_SPEED, HOP_SCALE_MAX, HOP_SCALE_MIN (+3 more)

### Community 56 - "TrackSpline"
Cohesion: 0.27
Nodes (5): distanceSquared(), TrackSpline, getCheckpointDistance(), driveLap(), simulateLap()

### Community 57 - "RaceField"
Cohesion: 0.11
Nodes (10): InputCommand, RaceField, isAirborne(), armHazards(), findHazardHits(), oilYawSpinForArmor(), TrackHazard, Missile (+2 more)

### Community 58 - "New tasks opened 2026-08-16 by the owner (T-043..T-047)"
Cohesion: 0.11
Nodes (18): Agents involved this round, Context cleanup — 2026-08-16 01:00 — context reached 375k, past the 290k ceiling, Context cleanup — 2026-08-16 06:20 — context reached 408k, past the 290k ceiling, owner restarting for mobile, Final handoff — 2026-08-16 ~01:40 — Cursor session (Grok) picked up from the 01:05 Claude handoff, Final handoff — 2026-08-16 ~03:35 — Cursor session (Opus) — Competitive NPCs / Aim / Race Flow / 30 Tracks, How the next agent continues — unchanged order, now with the decisions settled, Known balance finding (honest, not a bug), New tasks opened 2026-08-16 by the owner (T-043..T-047) (+10 more)

### Community 59 - "Final handoff — 2026-08-16 01:05 — the owner called the end of the session ("logo vao acabar os tokens")"
Cohesion: 0.29
Nodes (7): Final handoff — 2026-08-16 01:05 — the owner called the end of the session ("logo vao acabar os tokens"), Shipped this session, Start here next session, in this order, The two owner decisions, settled — do not re-open either, Tooling added this session — do not re-derive it, Two gates only the owner can close, Two questions put to the owner and NOT yet answered

### Community 60 - "PlanetSelectScene.ts"
Cohesion: 0.11
Nodes (17): bindMenuKeys(), MenuKeyHandlers, clampIndex(), MENU_KIND, MENU_PROMPT_LIST, MENU_PROMPT_OPTIONS, MenuActionSpec, MenuController (+9 more)

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
Nodes (25): DriverProfile, DriverWeights, relativeSpeedAlong(), OpponentMemoryEntry, AgentDebugSnapshot, AgentDecision, closestAhead(), closestBehind() (+17 more)

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

### Community 71 - "planets.ts"
Cohesion: 0.25
Nodes (15): campaignSlotForTrackId(), campaignTracks(), isPlanetUnlocked(), isTrackUnlocked(), nextCampaignTrack(), planetTracks(), findPlanet(), PlanetDefinition (+7 more)

### Community 72 - "BootScene.ts"
Cohesion: 0.15
Nodes (21): CAR_ASSET_DIRECTORY, CAR_MANIFEST_KEY, CART_PORTRAIT_SIZE, DEBRIS_ASSET_DIRECTORY, DEFAULT_TRACK_ID, GARAGE_ART_FILE, GARAGE_ART_KEY, GROUND_ASSET_DIRECTORY (+13 more)

### Community 73 - "Context cleanup — 2026-08-15 23:10 — context reached 312k, past the 290k ceiling"
Cohesion: 0.50
Nodes (4): Agents involved this round, Art was reorganised this turn — the old paths are gone, do not look for them, Context cleanup — 2026-08-15 23:10 — context reached 312k, past the 290k ceiling, How the next agent continues

### Community 74 - "circuit-maps.ts"
Cohesion: 0.15
Nodes (21): offsetAt(), COLOR_BACKGROUND, COLOR_GUIDE, COLOR_PURSUIT, COLOR_PURSUIT_LINE, COLOR_ROAD, COLOR_START, createBitmap() (+13 more)

### Community 78 - "SevenSegment.test.ts"
Cohesion: 0.18
Nodes (15): BLANK_PATTERN, DIGIT_PATTERNS, isSegmentLit(), WHY: the vertical segments (f/b, e/c) already occupy the full `STROKE` width at…, SEGMENT, SEGMENT_LAYOUT, SegmentName, SegmentRect (+7 more)

### Community 79 - "VehicleTelemetry"
Cohesion: 0.19
Nodes (6): TuningOverlay, formatTuningOverlay(), safeFormat(), TuningOverlayReadout, OnTrackStepResult, VehicleTelemetry

### Community 80 - "findCarSheet"
Cohesion: 0.13
Nodes (13): normalise(), safeStat(), STAT_BAR_FIELDS, StatBar, statBars(), findCarSheet(), perkProfile(), BASE_STATS (+5 more)

### Community 83 - "MetalScrapEffect.ts"
Cohesion: 0.23
Nodes (14): FlyingScrap, SCRAP_HARD_COUNT, SCRAP_HARD_SPEED, SCRAP_LIGHT_COUNT, SCRAP_MEDIUM_COUNT, SCRAP_MEDIUM_SPEED, SCRAP_ROSTER_SIZE, SCRAP_SPRITES (+6 more)

### Community 84 - "ResultsScene.ts"
Cohesion: 0.15
Nodes (14): paintRoundedPlaque(), PLAQUE_INK, PLAQUE_LINE, PlaquePaint, pickPubBackground(), PUB_BACKGROUND_DIRECTORY, PUB_BACKGROUNDS, PubBackground (+6 more)

### Community 85 - "TrackSelectScene"
Cohesion: 0.18
Nodes (6): Burst, rewardLabel(), Star, CampaignTrack, formatCash(), TrackSelectScene

### Community 86 - "HudScene"
Cohesion: 0.19
Nodes (3): HudText, barColour(), HudScene

### Community 87 - "NarratorBank.ts"
Cohesion: 0.26
Nodes (9): createElement(), BANTER_EXTRA_IDS, NARRATOR_LAB_DIRECTORY, NARRATOR_STASH_DIRECTORY, NarratorClip, narratorClipKey(), narratorClipUrl(), NarratorVoice (+1 more)

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
Cohesion: 0.18
Nodes (4): ExplosionEffect, lerpColor(), sampleFireballColor(), seededRandom()

### Community 93 - "RaceScene.ts"
Cohesion: 0.06
Nodes (52): isWarTankPerk(), assignNpcCars(), RacerEntry, ageHazards(), HAZARD_KIND, HazardHit, HazardKind, HazardTarget (+44 more)

### Community 94 - "Music brief — 10 original race beds"
Cohesion: 0.33
Nodes (5): Delivery, Music brief — 10 original race beds, Specs, Style, Use

### Community 95 - "spritegen/preview.ts"
Cohesion: 0.08
Nodes (27): CAR_FRAME_HEIGHT, CAR_FRAME_WIDTH, CAR_SPRITE_FRAMES, carsDir, manifest, projectRoot, testFileDir, CARS_DIRECTORY (+19 more)

### Community 96 - "DriverProfile.ts"
Cohesion: 0.17
Nodes (20): deriveProfile(), WEIGHT_SALTS, clampWeights(), DERIVED_SPECS, DRIVER_PROFILE_TIER, DRIVER_WEIGHT_IDS, DriverProfileTier, DriverWeightId (+12 more)

### Community 97 - "SplashLayout.ts"
Cohesion: 0.19
Nodes (17): cornerCenter(), cornerSize(), coverRect(), coverScale(), Point, pointIn(), promptAnchor(), Rect (+9 more)

### Community 98 - "trackgen/preview.ts"
Cohesion: 0.15
Nodes (20): COLOR_BACKGROUND, COLOR_CHECKPOINT, COLOR_CONTROL, COLOR_FAST, COLOR_SHOULDER, COLOR_START, COLOR_SURFACE, COLOR_TIGHT (+12 more)

### Community 99 - "CarManifest.ts"
Cohesion: 0.11
Nodes (29): CarManifestError, cartHeroFile(), cartPortraitFile(), cartPortraitLegacyFile(), cartPortraitToken(), cartStripFile(), foldCollisionStats(), frameIndexForHeading() (+21 more)

### Community 100 - "NarratorDirector.ts"
Cohesion: 0.20
Nodes (7): CursorKey, NarratorDirector, NarratorOffer, NarratorSnapshot, NarratorPlan, NarratorPriority, RacePhase

### Community 101 - "SplashScene.ts"
Cohesion: 0.25
Nodes (7): enableTourMode(), enableTourModeFromSearch(), feedTourCode(), resetTourMode(), TOUR_CODE, tourModeFromSearch(), BlinkClock

### Community 102 - "Sprite-strip"
Cohesion: 0.20
Nodes (10): After images exist, Contract (not negotiable), Forbidden, Image prompt (game cell), Image prompt (HQ still), Inputs (refuse if missing), Next car, Outputs (+2 more)

### Community 103 - "sprite-strip/SKILL.md"
Cohesion: 0.25
Nodes (4): 3/4 painted size (frames 0, 8, 16, 24), Check, Fit — generated still → 128 cell, Steps

### Community 104 - "RacingLine.ts"
Cohesion: 0.18
Nodes (16): buildLineCandidates(), clamp(), LineCandidate, AIDriver, PaceDriverOptions, chooseLineByAccount(), clamp(), hash32() (+8 more)

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
Cohesion: 0.15
Nodes (7): ChaseCamera, ChaseCameraOptions, HitRewardEffect, IsoProjection, SCREEN_ROTATION_SIGN, MetalScrapEffect, ISO_Z

### Community 114 - "generate-lab.ts"
Cohesion: 0.13
Nodes (17): LINES_BY_ID, NARRATOR_CATEGORY, NARRATOR_LINES, NARRATOR_VOICES, NarratorCategory, narratorClipFile(), narratorLine, clipsInPlan() (+9 more)

### Community 115 - "Clock — 32 poses"
Cohesion: 0.40
Nodes (5): Anchors (draw these first), Clock — 32 poses, Full table, Lights and parts by yaw, Size — fixed world, not fill-the-cell

### Community 116 - "Collision — one square, midpoint"
Cohesion: 0.40
Nodes (4): After a new strip, Collision — one square, midpoint, One box for every yaw, Where it lives

### Community 118 - "LapTimes.test.ts"
Cohesion: 0.14
Nodes (15): stepVehicleOnTrack(), SurfaceAdjuster, RAMP_GRAVITY, rampPeakHeight(), rampZoneAt(), surfaceAt(), integrateAirborne(), carIds (+7 more)

### Community 119 - "VehicleCapabilityModel.ts"
Cohesion: 0.13
Nodes (19): TUNING_STILL_REQUIRED, buildStatNormalizer(), capabilitiesFromStats(), FIELDS, minMax(), mix(), planningCapabilities(), planningStats() (+11 more)

### Community 120 - "Regras — tira de relógio (car-1)"
Cohesion: 0.29
Nodes (6): Contrato, Ordem, Proibido, Prompt de cada célula 128×128, Prompt de cada HQ 512×512, Regras — tira de relógio (car-1)

### Community 121 - "RaceSimulation.ts"
Cohesion: 0.26
Nodes (10): RACE_PHASE, LapProgress, RacerProgress, RacerStanding, rankRacers(), advanceRace(), createRaceState(), RacerRaceState (+2 more)

### Community 122 - "car-1 — Marauder"
Cohesion: 0.33
Nodes (5): car-1 — Marauder, Do not change, Lock, Outputs, Refs in this pack

### Community 123 - "CarSetManifest"
Cohesion: 0.33
Nodes (10): CarSetManifest, RaceFieldOptions, TrackLinesManifest, GarageSceneData, PauseSceneData, RaceSceneData, ResultsSceneData, PlanetSelectData (+2 more)

### Community 124 - "Clock — 32 poses"
Cohesion: 0.33
Nodes (5): Anchors (draw these first), Clock — 32 poses, Full table, Lights and parts by yaw, Size — fixed world, not fill-the-cell

### Community 128 - "UtilityEvaluator.ts"
Cohesion: 0.16
Nodes (18): formatAiOverlay(), safe(), EXECUTION_STATE, evaluateOpportunities(), NearbyRival, RaceSituation, raceTacticalValue(), SituationOpportunities (+10 more)

### Community 131 - "SplashAttractShow"
Cohesion: 0.22
Nodes (5): showcaseCenter(), showcaseRect(), Size, card(), SplashAttractShow

### Community 132 - "SpeedoGauge.ts"
Cohesion: 0.17
Nodes (9): BarPoint, barProfileAt(), COLOUR_STOPS, colourAtT(), dimColour(), lerpColour(), SpeedoGauge, SpeedoGaugeOptions (+1 more)

### Community 133 - "clamp01"
Cohesion: 0.22
Nodes (11): clamp01(), decayField(), decayMemory(), emptyMemory(), memoryEffect(), OpponentMemoryBook, recordBlockedBy(), recordNearMiss() (+3 more)

### Community 134 - "trackgen/generate.ts"
Cohesion: 0.16
Nodes (13): ANCHOR_TRACK_ID, carsJsonPath, chooseTrack(), Chosen, evaluate(), Evaluation, generated, generateGeometry() (+5 more)

### Community 135 - "PilotRoster.ts"
Cohesion: 0.19
Nodes (14): DRIVER_CARD_DIRECTORY, DRIVER_CARDS, DriverCard, driverCardForName(), driverCardUrl(), CHAMPIONSHIP_SIZE, drawRivalNames(), JOKER_PILOTS (+6 more)

### Community 137 - "HudScene.ts"
Cohesion: 0.22
Nodes (6): HudReadout, HudSource, MINE_SPRITE_KEY, MISSILE_SPRITE_KEY, OIL_SPRITE_KEY, TURBO_SPRITE_KEY

### Community 138 - "Intercept.ts"
Cohesion: 0.30
Nodes (10): interceptPoint(), observedPosition(), predictionTime(), predictPosition(), clamp(), hash32(), hashUnit(), lerp() (+2 more)

### Community 139 - "TrajectoryPlanner.ts"
Cohesion: 0.27
Nodes (10): candidateOffsets(), LATERAL_FRACTIONS, maxSafeOffset(), NearbyLateral, planTrajectory(), scoreCandidate(), TrajectoryCandidate, trajectoryScore() (+2 more)

### Community 140 - "Vehicle.ts"
Cohesion: 0.23
Nodes (12): VehicleViewExtras, computeRawDraft(), DraftCandidate, draftFromCandidate(), rampAlignment(), rampFalloff(), rampToPeakAndBack(), SLIPSTREAM_DEFAULTS (+4 more)

### Community 141 - "planetThemes.ts"
Cohesion: 0.54
Nodes (5): DEFAULT_THEME, everyPlanetHasTheme(), PLANET_THEMES, themeForPlanetId(), themeForTrackId()

### Community 144 - "scale"
Cohesion: 0.13
Nodes (21): computeBounds(), VehicleView, sheetCellSize(), add(), distance(), fromAngle(), scale(), gridSlotPosition() (+13 more)

### Community 145 - "InputCommand.ts"
Cohesion: 0.19
Nodes (11): clampSigned(), clampUnit(), IDLE_INPUT, sanitizeInput(), CEREMONY_HOLD_SECONDS, COAST_BRAKE, COAST_STOP_SPEED, coastInput() (+3 more)

### Community 146 - "RaceField.ts"
Cohesion: 0.13
Nodes (21): VEC2_ZERO, CONTACT_SIDE, ContactSide, meanCornerTightness(), RacerRuntime, findLineForCar(), RivalView, CarIntegrity (+13 more)

### Community 149 - "containSize"
Cohesion: 0.60
Nodes (3): containSize(), FitSize, sane()

## Knowledge Gaps
- **680 isolated node(s):** `name`, `version`, `private`, `type`, `description` (+675 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vec2` connect `vec2` to `TrackRenderer.ts`, `trackgen/generate.ts`, `Intercept.ts`, `TrackSpline.ts`, `Vec2.ts`, `Vehicle.ts`, `scale`, `RaceField.ts`, `CarPerk.test.ts`, `TrackDefinition`, `ArcadeCarPhysics.ts`, `TrackSpline`, `RaceField`, `RacingAgent.ts`, `circuit-maps.ts`, `MetalScrapEffect.ts`, `TrackSelectScene`, `PaceDriver.test.ts`, `TyreMarks.ts`, `ExplosionEffect`, `RaceScene.ts`, `trackgen/preview.ts`, `IsoProjection`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `GarageScene` connect `GarageScene` to `GarageScene.ts`, `ProgressStore.ts`, `findCarSheet`, `main.ts`, `PlanetSelectScene.ts`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `RaceScene` connect `RaceScene` to `SIMULATION_STEP_SECONDS`, `TrackRenderer.ts`, `scale`, `RaceField.ts`, `main.ts`, `TrackDefinition`, `GarageScene.ts`, `RaceAudio`, `Wallet.ts`, `TrackSpline`, `RaceField`, `planets.ts`, `VehicleTelemetry`, `TyreMarks.ts`, `ExplosionEffect`, `RaceScene.ts`, `NarratorDirector.ts`, `IsoProjection`, `CarSetManifest`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _680 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `20 REGULARS — every planet` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `fit-redrawn.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10952380952380952 - nodes in this community are weakly interconnected._
- **Should `RaceField.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._