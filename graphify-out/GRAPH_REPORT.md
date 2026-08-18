# Graph Report - game-race-90s  (2026-08-17)

## Corpus Check
- 332 files · ~44,231,049 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2693 nodes · 7024 edges · 133 communities (114 shown, 19 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `90b7cac2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- 20 REGULARS — every planet
- renderCar.ts
- RaceField.test.ts
- SplashAttract.ts
- TrackRenderer
- vec2
- RaceAudio.ts
- RivalTraits.ts
- scripts
- Circuitos
- TrackSpline
- RaceScore.ts
- Vec2.ts
- RaceScene
- ProgressStore.ts
- fit-redrawn.ts
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
- color.ts
- NarratorQueue
- geometry.ts
- strip-fit.ts
- generate-weapons.ts
- NoiseSource
- ArcadeCarPhysics.ts
- GarageCatalog.ts
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
- DriverCards.ts
- TuningOverlay
- CameraZoomPolicy
- MetalScrapEffect.ts
- GarageScene.ts
- HitRewardEffect.ts
- HudScene
- NarratorBank.ts
- NarratorPlan.ts
- Iso car strip
- TyreMarks
- ExplosionEffect
- RaceField.ts
- Music brief — 10 original race beds
- spritegen/preview.ts
- DriverProfile.ts
- trackgen/preview.ts
- CarManifest.ts
- PlannedClip
- BlinkClock
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
- IsoProjection
- generate-lab.ts
- Clock — 32 poses
- Collision — one square, midpoint
- CATALOG.md
- MismatchedProfiles.test.ts
- Regras — tira de relógio (car-1)
- car-1 — Marauder
- RaceScene.ts
- Clock — 32 poses
- CLAUDE.md
- LEIA-ME.md
- PLAN.md
- UtilityEvaluator.ts
- FixedStepLoop
- clamp01
- PilotRoster.ts
- Intercept.ts
- TrajectoryPlanner.ts
- EngineVoice
- SplashScene

## God Nodes (most connected - your core abstractions)
1. `vec2` - 86 edges
2. `GarageScene` - 71 edges
3. `TrackSpline` - 65 edges
4. `RaceScene` - 63 edges
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
- `generateForTrack()` --calls--> `parseCarSetManifest()`  [EXTRACTED]
  tools/linegen/generate.ts → src/data/cars/CarManifest.ts

## Import Cycles
- None detected.

## Communities (133 total, 19 thin omitted)

### Community 0 - "20 REGULARS — every planet"
Cohesion: 0.07
Nodes (29): 10. KIRA, 11. SNAKE, 12. RIO, 13. JETT, 14. NOVA, 15. CRUZ, 16. ASH, 17. ZARA (+21 more)

### Community 1 - "renderCar.ts"
Cohesion: 0.12
Nodes (31): SCREEN_ROTATION_SIGN, CarSheetManifest, CAR_FRAME_WIDTH, CAR_SPRITE_FRAME_ARC, ISO_X, ISO_Y, ISO_Z, main() (+23 more)

### Community 2 - "RaceField.test.ts"
Cohesion: 0.16
Nodes (13): RacerEntry, carsJsonPath, collideWithRearPerk(), freshSpline(), FULL_THROTTLE, fullFieldEntries(), makeField(), manifest (+5 more)

### Community 3 - "SplashAttract.ts"
Cohesion: 0.07
Nodes (45): CARD_FLIP_SECONDS, CARD_GAP_SECONDS, CARD_GROW_FADE_SECONDS, CARD_GROW_SCALE, CARD_SEQUENCE_DELAY_SECONDS, cardBeatSeconds(), cardStartAt(), clamp() (+37 more)

### Community 4 - "TrackRenderer"
Cohesion: 0.27
Nodes (7): propHash(), sampleCenterline(), shade(), TrackRenderer, TrackRendererOptions, PlanetTheme, TrackFrame

### Community 5 - "vec2"
Cohesion: 0.13
Nodes (16): BURN_COLORS, BurnBlotch, BurnMark, Burst, BurstOptions, ExplosionEffectOptions, FIREBALL_COLORS, METAL_COLORS (+8 more)

### Community 6 - "RaceAudio.ts"
Cohesion: 0.20
Nodes (15): isAudioMuted(), setAudioMuted(), clearLoadedMusicBeds(), loaded, loadedMusicBeds(), markMusicBedLoaded(), pickLoadedMusicBed(), createAudioContext() (+7 more)

### Community 7 - "RivalTraits.ts"
Cohesion: 0.20
Nodes (16): clamp(), commitCornerPlan(), cornerCommitLookAhead(), CornerMarks, coverBehind(), goForPass(), hash32(), RIVAL_TRAIT (+8 more)

### Community 8 - "scripts"
Cohesion: 0.04
Nodes (46): dependencies, phaser, description, devDependencies, pngjs, @types/pngjs, typescript, vite (+38 more)

### Community 9 - "Circuitos"
Cohesion: 0.05
Nodes (41): Ash Reach, Ash Reach I, Ash Reach II, Ash Reach III, Bogmire Deep, Bogmire Deep I, Bogmire Deep II, Bogmire Deep III (+33 more)

### Community 10 - "TrackSpline"
Cohesion: 0.06
Nodes (56): AgentTickInput, InputCommand, angleOf(), cross(), distanceSquared(), offsetAt(), RacingLine, buildStartingGrid() (+48 more)

### Community 11 - "RaceScore.ts"
Cohesion: 0.47
Nodes (7): clamp01(), computeRaceScore(), POSITION_WEIGHT, positionFraction(), RaceScoreInput, TIME_WEIGHT, timeFraction()

### Community 12 - "Vec2.ts"
Cohesion: 0.07
Nodes (61): ChaseCameraOptions, ScreenPoint, computeBounds(), ROAD_DEPTH, ScreenBounds, Segment, TyreMarksOptions, WheelTrail (+53 more)

### Community 14 - "ProgressStore.ts"
Cohesion: 0.09
Nodes (55): activateSlot(), activeSlotIndex(), beginSlot(), buyCar(), cashInPoints(), CLEAR_POSITION, creditWallet(), debitWallet() (+47 more)

### Community 15 - "fit-redrawn.ts"
Cohesion: 0.09
Nodes (54): chroma(), isInkBlack(), isPaper(), luma(), main(), nearest(), parseArgs(), poseBudget() (+46 more)

### Community 16 - "Pilotos"
Cohesion: 0.06
Nodes (31): Agent (derivado do mesmo seed), ALINE, ASH, BLAZE, CRUZ, DAVE, DIEGO, Driver Personality (+23 more)

### Community 17 - "compilerOptions"
Cohesion: 0.07
Nodes (28): DOM, DOM.Iterable, ES2022, src, tests, tools, vite/client, vitest/globals (+20 more)

### Community 18 - "CarPerk.test.ts"
Cohesion: 0.10
Nodes (31): FIELDS, planningCapabilities(), planningStats(), HOME_WORLD_STAT_BONUS, applyImpactDamage(), applyWeaponDamage(), CAR_CONDITION, CarCondition (+23 more)

### Community 19 - "MusicScore.ts"
Cohesion: 0.14
Nodes (26): barCount(), barHasLick(), barIndexForStep(), BEATS_PER_BAR, beatsToSeconds(), ChordStep, DrumStep, eighthInBarForStep() (+18 more)

### Community 20 - "import-fleet.ts"
Cohesion: 0.25
Nodes (15): cellBounds(), contentBox(), contentRowRange(), extractFrame(), importCar(), isContent(), ORIGIN, OUTPUT_DIRECTORY (+7 more)

### Community 21 - "planetMusic.ts"
Cohesion: 0.10
Nodes (20): ASH_REACH_SCORE, BOGMIRE_DEEP_SCORE, CHROME_VERGE_SCORE, CRYO_HOLLOW_SCORE, DOUBLE_KICK_DRUM, everyPlanetHasMusic(), FERRO_RUST_SCORE, HEAVY_STRUM (+12 more)

### Community 22 - "HelpScene"
Cohesion: 0.15
Nodes (8): controlBlock(), ControlRow, formatHelpBody(), MENU_CONTROLS, RACE_DRIVE_CONTROLS, RACE_SYSTEM_CONTROLS, RACE_WEAPON_CONTROLS, HelpScene

### Community 23 - "constants.ts"
Cohesion: 0.17
Nodes (21): CAR_PERK, CarPerkId, OFFROAD_GRIP_MULTIPLIER, OFFROAD_ROLLING_RESISTANCE, OVERSPEED_ALLOWANCE, PALETTE_ROLE, SIMULATION_HZ, STEERING_AUTHORITY_SPEED (+13 more)

### Community 24 - "generate-metal-scraps.ts"
Cohesion: 0.21
Nodes (15): chunk(), crc32(), drawScrap(), EDGE, emptyFrame(), encodePng(), fillPoly(), fillRect() (+7 more)

### Community 25 - "Clock — 32 poses"
Cohesion: 0.18
Nodes (7): Claude Code — desenhar um carro (tira de relógio), Anchors (draw these first), Clock — 32 poses, Full table, Lights and parts by yaw, Size — fixed world, not fill-the-cell, Handoff — modelo X → tira de relógio

### Community 26 - "TrackDefinition"
Cohesion: 0.07
Nodes (39): GENERATED_TRACKS, findTrack(), TRACKS, thunderBasin, SIMULATION_STEP_SECONDS, IDLE_INPUT, advanceLapProgress(), checkpointDistance() (+31 more)

### Community 27 - "color.ts"
Cohesion: 0.11
Nodes (18): SHADE_STEP, ShadeStep, clampByte(), parseHex(), quantize(), RAMP_FACTORS, RampTable, ResolvedPalette (+10 more)

### Community 28 - "NarratorQueue"
Cohesion: 0.14
Nodes (7): NARRATOR_MAX_SEQUENCE, NARRATOR_PRIORITY, NarratorQueue, A, B, C, D

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
Nodes (5): BrakeVoice, clampUnit(), clampUnit(), ExplosionVoice, NoiseSource

### Community 33 - "ArcadeCarPhysics.ts"
Cohesion: 0.09
Nodes (34): LATERAL_GRIP_STIFFNESS, REVERSE_SPEED_FRACTION, clampSigned(), clampUnit(), sanitizeInput(), length(), OnTrackStepResult, stepVehicleOnTrack() (+26 more)

### Community 34 - "GarageCatalog.ts"
Cohesion: 0.20
Nodes (17): CAR_TIER, CarTier, carUnlockHint(), catalogEntry, GARAGE_CATALOG, isCarUnlocked(), isStarterCar(), npcRosterForPlanet() (+9 more)

### Community 36 - "RaceAudio"
Cohesion: 0.15
Nodes (3): RaceAudio, clampUnit(), SkidVoice

### Community 37 - "TitleAudio"
Cohesion: 0.13
Nodes (3): BedPlayer, TitleAudio, TitleMusic

### Community 38 - "fleet.ts"
Cohesion: 0.09
Nodes (21): CAR_FRAME_HEIGHT, WORLD_ADVANTAGE, WorldAdvantage, carsDir, manifest, projectRoot, testFileDir, templateCar (+13 more)

### Community 39 - "HudFormat.ts"
Cohesion: 0.32
Nodes (9): formatCountdown(), formatHud(), formatIntegrityPercent(), formatRaceTime(), formatSpeed(), formatSpeedDigits(), formatSpeedFraction(), MPH_PER_WORLD_UNIT (+1 more)

### Community 40 - "generate-planet-select.ts"
Cohesion: 0.20
Nodes (12): bandedGradient(), calmFactor(), here, lerp(), outDir, Rgb, SelectSpec, silhouetteHeightAt() (+4 more)

### Community 42 - "pack-redrawn.ts"
Cohesion: 0.13
Nodes (25): bestCollisionBox(), collisionSquares(), collisionBoxForCarId(), collisionBoxFromDef(), FLEET_MODEL_ID, rounded(), withCollisionBox(), modelForRedrawn() (+17 more)

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
Cohesion: 0.06
Nodes (14): normalise(), safeStat(), STAT_BAR_FIELDS, StatBar, statBars(), findCarSheet(), perkProfile(), GarageScene (+6 more)

### Community 53 - "Wallet.ts"
Cohesion: 0.09
Nodes (39): HudReadout, BASE_FIRST_POINTS, CASH_IN_PAYOUT, cashInBatches(), cashInValue(), CONTACT_HIT_POINTS, firstPlacePoints(), hitScale() (+31 more)

### Community 54 - "Delivery reports"
Cohesion: 0.10
Nodes (21): 2026-08-15 20:31 PDT — T-012 round (uncommitted, `main`), 2026-08-16 — T-018 delivered: the game opens on the splash screen, Agents involved this round, Agents involved this round, Agents involved this round, Context cleanup — 2026-08-15 17:02 PDT — user requested a manual clean after compaction #1, Context cleanup — 2026-08-15 17:32 PDT — user asked for a save point before clearing the context, Context cleanup — 2026-08-15 17:45 PDT — user played the game, accepted it, and asked for a save point before clearing the context (+13 more)

### Community 55 - "JumpCharges.ts"
Cohesion: 0.25
Nodes (11): clamp(), consumeJump(), createJumpCharges(), HOP_LAUNCH_SPEED, HOP_REF_MASS, HOP_REF_SPEED, HOP_SCALE_MAX, HOP_SCALE_MIN (+3 more)

### Community 56 - "ReverseLatch"
Cohesion: 0.17
Nodes (4): KeyboardDriver, DriveIntent, ReverseLatch, ReverseLatchOptions

### Community 57 - "RaceField"
Cohesion: 0.08
Nodes (18): CEREMONY_HOLD_SECONDS, COAST_BRAKE, COAST_STOP_SPEED, coastInput(), isNearlyStopped(), meanCornerTightness(), RaceField, findLineForCar() (+10 more)

### Community 58 - "New tasks opened 2026-08-16 by the owner (T-043..T-047)"
Cohesion: 0.11
Nodes (18): Agents involved this round, Context cleanup — 2026-08-16 01:00 — context reached 375k, past the 290k ceiling, Context cleanup — 2026-08-16 06:20 — context reached 408k, past the 290k ceiling, owner restarting for mobile, Final handoff — 2026-08-16 ~01:40 — Cursor session (Grok) picked up from the 01:05 Claude handoff, Final handoff — 2026-08-16 ~03:35 — Cursor session (Opus) — Competitive NPCs / Aim / Race Flow / 30 Tracks, How the next agent continues — unchanged order, now with the decisions settled, Known balance finding (honest, not a bug), New tasks opened 2026-08-16 by the owner (T-043..T-047) (+10 more)

### Community 59 - "Final handoff — 2026-08-16 01:05 — the owner called the end of the session ("logo vao acabar os tokens")"
Cohesion: 0.29
Nodes (7): Final handoff — 2026-08-16 01:05 — the owner called the end of the session ("logo vao acabar os tokens"), Shipped this session, Start here next session, in this order, The two owner decisions, settled — do not re-open either, Tooling added this session — do not re-derive it, Two gates only the owner can close, Two questions put to the owner and NOT yet answered

### Community 60 - "PlanetSelectScene.ts"
Cohesion: 0.08
Nodes (19): bindMenuKeys(), MenuKeyHandlers, clampIndex(), MENU_KIND, MENU_PROMPT_LIST, MENU_PROMPT_OPTIONS, MenuActionSpec, MenuController (+11 more)

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
Nodes (23): DriverProfile, OpponentMemoryEntry, AgentDebugSnapshot, AgentDecision, closestAhead(), closestBehind(), emptyCapabilities(), executionOf() (+15 more)

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
Cohesion: 0.06
Nodes (46): enableWatchMode(), enableWatchModeFromSearch(), watchModeFromSearch(), watchTrackFromSearch(), campaignSlotForTrackId(), campaignTracks(), isPlanetUnlocked(), isTrackUnlocked() (+38 more)

### Community 72 - "BootScene.ts"
Cohesion: 0.10
Nodes (29): musicBedKey(), cartPortraitKey(), sheetCellSize(), pickPubBackground(), PUB_BACKGROUND_DIRECTORY, PUB_BACKGROUNDS, PubBackground, pubBackgroundKey() (+21 more)

### Community 73 - "Context cleanup — 2026-08-15 23:10 — context reached 312k, past the 290k ceiling"
Cohesion: 0.50
Nodes (4): Agents involved this round, Art was reorganised this turn — the old paths are gone, do not look for them, Context cleanup — 2026-08-15 23:10 — context reached 312k, past the 290k ceiling, How the next agent continues

### Community 74 - "circuit-maps.ts"
Cohesion: 0.15
Nodes (17): COLOR_BACKGROUND, COLOR_GUIDE, COLOR_PURSUIT, COLOR_PURSUIT_LINE, COLOR_ROAD, COLOR_START, createBitmap(), drawSegment() (+9 more)

### Community 78 - "DriverCards.ts"
Cohesion: 0.43
Nodes (6): DRIVER_CARD_DIRECTORY, DRIVER_CARDS, DriverCard, driverCardForName(), driverCardKey(), driverCardUrl()

### Community 79 - "TuningOverlay"
Cohesion: 0.24
Nodes (4): TuningOverlay, formatTuningOverlay(), safeFormat(), TuningOverlayReadout

### Community 83 - "MetalScrapEffect.ts"
Cohesion: 0.23
Nodes (14): FlyingScrap, SCRAP_HARD_COUNT, SCRAP_HARD_SPEED, SCRAP_LIGHT_COUNT, SCRAP_MEDIUM_COUNT, SCRAP_MEDIUM_SPEED, SCRAP_ROSTER_SIZE, SCRAP_SPRITES (+6 more)

### Community 84 - "GarageScene.ts"
Cohesion: 0.13
Nodes (16): containSize(), FitSize, sane(), paintRoundedPlaque(), PLAQUE_INK, PLAQUE_LINE, PlaquePaint, activeSlotSafe() (+8 more)

### Community 85 - "HitRewardEffect.ts"
Cohesion: 0.32
Nodes (4): Burst, HitRewardEffect, rewardLabel(), Star

### Community 86 - "HudScene"
Cohesion: 0.06
Nodes (28): HudText, BLANK_PATTERN, DIGIT_PATTERNS, isSegmentLit(), WHY: the vertical segments (f/b, e/c) already occupy the full `STROKE` width at…, SEGMENT, SEGMENT_LAYOUT, SegmentName (+20 more)

### Community 87 - "NarratorBank.ts"
Cohesion: 0.21
Nodes (11): createElement(), LINES_BY_ID, NARRATOR_CATEGORY, NARRATOR_LAB_DIRECTORY, NARRATOR_LINES, NARRATOR_STASH_DIRECTORY, NarratorClip, narratorClipKey() (+3 more)

### Community 88 - "NarratorPlan.ts"
Cohesion: 0.20
Nodes (19): BANTER_EXTRA_IDS, banterLines(), linesInCategory(), NarratorVoice, pickNarratorVoice(), buildEventPool(), clampInt(), clipFor() (+11 more)

### Community 89 - "Iso car strip"
Cohesion: 0.20
Nodes (10): After images exist, Contract (not negotiable), Forbidden, Image prompt (game cell), Image prompt (HQ still), Inputs (refuse if missing), Iso car strip, Next car (+2 more)

### Community 91 - "TyreMarks"
Cohesion: 0.23
Nodes (3): freshAlphaFor(), slideIntensity(), TyreMarks

### Community 92 - "ExplosionEffect"
Cohesion: 0.18
Nodes (4): ExplosionEffect, lerpColor(), sampleFireballColor(), seededRandom()

### Community 93 - "RaceField.ts"
Cohesion: 0.05
Nodes (67): isWarTankPerk(), VEC2_ZERO, CONTACT_SIDE, ContactSide, RaceFieldOptions, RacerRuntime, RivalView, CarIntegrity (+59 more)

### Community 94 - "Music brief — 10 original race beds"
Cohesion: 0.33
Nodes (5): Delivery, Music brief — 10 original race beds, Specs, Style, Use

### Community 95 - "spritegen/preview.ts"
Cohesion: 0.23
Nodes (14): HERE, loadUnregistered(), looksLikeCarModel(), main(), PREVIEW_BACKGROUND, PREVIEW_BORDER, PREVIEW_DIRECTORY, resolveTargets() (+6 more)

### Community 96 - "DriverProfile.ts"
Cohesion: 0.14
Nodes (24): deriveProfile(), WEIGHT_SALTS, clampWeights(), DERIVED_SPECS, DRIVER_PROFILE_TIER, DRIVER_WEIGHT_IDS, DriverProfileTier, DriverWeightId (+16 more)

### Community 98 - "trackgen/preview.ts"
Cohesion: 0.15
Nodes (20): COLOR_BACKGROUND, COLOR_CHECKPOINT, COLOR_CONTROL, COLOR_FAST, COLOR_SHOULDER, COLOR_START, COLOR_SURFACE, COLOR_TIGHT (+12 more)

### Community 99 - "CarManifest.ts"
Cohesion: 0.08
Nodes (35): CarManifestError, cartHeroFile(), cartPortraitFile(), cartPortraitLegacyFile(), cartPortraitToken(), cartStripFile(), foldCollisionStats(), KNOWN_CAR_PERKS (+27 more)

### Community 100 - "PlannedClip"
Cohesion: 0.17
Nodes (10): PlannedClip, CursorKey, NarratorDirector, NarratorOffer, NarratorSnapshot, NarratorPlan, ScheduledBanter, NarratorPriority (+2 more)

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

### Community 113 - "IsoProjection"
Cohesion: 0.18
Nodes (4): ChaseCamera, IsoProjection, MetalScrapEffect, VehicleView

### Community 114 - "generate-lab.ts"
Cohesion: 0.21
Nodes (12): NARRATOR_VOICES, NarratorCategory, narratorClipFile(), BASE_INSTRUCTIONS, CATEGORY_INSTRUCTIONS, FORCE, LAB_DIRECTORY, main() (+4 more)

### Community 115 - "Clock — 32 poses"
Cohesion: 0.40
Nodes (5): Anchors (draw these first), Clock — 32 poses, Full table, Lights and parts by yaw, Size — fixed world, not fill-the-cell

### Community 116 - "Collision — one square, midpoint"
Cohesion: 0.40
Nodes (4): After a new strip, Collision — one square, midpoint, One box for every yaw, Where it lives

### Community 119 - "MismatchedProfiles.test.ts"
Cohesion: 0.15
Nodes (13): TUNING_STILL_REQUIRED, buildStatNormalizer(), capabilitiesFromStats(), minMax(), mix(), gun, heavy, light (+5 more)

### Community 120 - "Regras — tira de relógio (car-1)"
Cohesion: 0.29
Nodes (6): Contrato, Ordem, Proibido, Prompt de cada célula 128×128, Prompt de cada HQ 512×512, Regras — tira de relógio (car-1)

### Community 122 - "car-1 — Marauder"
Cohesion: 0.33
Nodes (5): car-1 — Marauder, Do not change, Lock, Outputs, Refs in this pack

### Community 123 - "RaceScene.ts"
Cohesion: 0.15
Nodes (20): CarSetManifest, EMPTY_WEAPON_HITS, assignNpcCars(), TrackLinesManifest, game, GarageSceneData, HelpSceneData, AUDIO_VALUES (+12 more)

### Community 124 - "Clock — 32 poses"
Cohesion: 0.33
Nodes (5): Anchors (draw these first), Clock — 32 poses, Full table, Lights and parts by yaw, Size — fixed world, not fill-the-cell

### Community 128 - "UtilityEvaluator.ts"
Cohesion: 0.16
Nodes (18): formatAiOverlay(), safe(), EXECUTION_STATE, evaluateOpportunities(), NearbyRival, RaceSituation, raceTacticalValue(), SituationOpportunities (+10 more)

### Community 133 - "clamp01"
Cohesion: 0.22
Nodes (11): clamp01(), decayField(), decayMemory(), emptyMemory(), memoryEffect(), OpponentMemoryBook, recordBlockedBy(), recordNearMiss() (+3 more)

### Community 135 - "PilotRoster.ts"
Cohesion: 0.29
Nodes (9): CHAMPIONSHIP_SIZE, drawRivalNames(), JOKER_PILOTS, mulberry32(), MYSTERIOUS_PILOTS, MYSTERIOUS_SWAP_COUNT, REGULAR_PILOTS, RIVALS_PER_SAVE (+1 more)

### Community 138 - "Intercept.ts"
Cohesion: 0.35
Nodes (8): interceptPoint(), observedPosition(), predictionTime(), predictPosition(), relativeSpeedAlong(), lerp(), applySkillToDriveOptions(), skillControlLimits

### Community 139 - "TrajectoryPlanner.ts"
Cohesion: 0.27
Nodes (10): candidateOffsets(), LATERAL_FRACTIONS, maxSafeOffset(), NearbyLateral, planTrajectory(), scoreCandidate(), TrajectoryCandidate, trajectoryScore() (+2 more)

### Community 143 - "SplashScene"
Cohesion: 0.20
Nodes (7): enableTourMode(), enableTourModeFromSearch(), feedTourCode(), resetTourMode(), TOUR_CODE, tourModeFromSearch(), SplashScene

## Knowledge Gaps
- **681 isolated node(s):** `name`, `version`, `private`, `type`, `description` (+676 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vec2` connect `vec2` to `renderCar.ts`, `TrackRenderer`, `Intercept.ts`, `TrackSpline`, `Vec2.ts`, `CarPerk.test.ts`, `TrackDefinition`, `ArcadeCarPhysics.ts`, `RaceField`, `RacingAgent.ts`, `trackgen/generate.ts`, `circuit-maps.ts`, `MetalScrapEffect.ts`, `HitRewardEffect.ts`, `TyreMarks`, `ExplosionEffect`, `RaceField.ts`, `trackgen/preview.ts`, `RaceScene.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `RaceScene` connect `RaceScene` to `FixedStepLoop`, `TrackRenderer`, `TrackSpline`, `ProgressStore.ts`, `TrackDefinition`, `RaceAudio`, `Wallet.ts`, `ReverseLatch`, `RaceField`, `trackgen/generate.ts`, `TuningOverlay`, `CameraZoomPolicy`, `HitRewardEffect.ts`, `NarratorPlan.ts`, `TyreMarks`, `ExplosionEffect`, `PlannedClip`, `IsoProjection`, `RaceScene.ts`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `GarageScene` connect `GarageScene` to `RaceScene.ts`, `GarageScene.ts`, `PlanetSelectScene.ts`, `ProgressStore.ts`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _681 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `20 REGULARS — every planet` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `renderCar.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11522048364153627 - nodes in this community are weakly interconnected._
- **Should `SplashAttract.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07418788410886742 - nodes in this community are weakly interconnected._