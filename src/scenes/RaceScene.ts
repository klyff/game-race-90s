import Phaser from 'phaser';
import { FixedStepLoop } from '../app/FixedStepLoop.ts';
import { RaceAudio } from '../adapters/audio/RaceAudio.ts';
import { shouldParkEngine } from '../adapters/audio/EngineIdleShutoff.ts';
import { KeyboardDriver } from '../adapters/input/KeyboardDriver.ts';
import { ChaseCamera } from '../adapters/render/ChaseCamera.ts';
import { AccidentWatch } from '../domain/camera/AccidentWatch.ts';
import { analyzeTrackCameras, zoomToFitFraction } from '../domain/camera/analyzeTrackCameras.ts';
import {
  CAMERA_MAX_ZOOM_IN,
  CAMERA_PLAYER_MAP_FRACTION,
  CAMERA_QUIT_MASTER_SCALE,
  CAMERA_SPECTATOR_ZOOM,
  spectatorCameraPreset,
  type CameraPreset,
} from '../domain/camera/CameraPreset.ts';
import { CameraDirector } from '../domain/camera/CameraDirector.ts';
import { CameraImpulse } from '../domain/camera/CameraImpulse.ts';
import { parseTrackCameraPreset } from '../data/tracks/TrackCameras.ts';
import { parseTrackTrapCatalog } from '../data/tracks/TrackTraps.ts';
import { ExplosionEffect } from '../adapters/render/ExplosionEffect.ts';
import { MetalScrapEffect } from '../adapters/render/MetalScrapEffect.ts';
import { WoodDebrisEffect } from '../adapters/render/WoodDebrisEffect.ts';
import type { HudReadout } from '../adapters/render/HudFormat.ts';
import { IsoProjection } from '../adapters/render/IsoProjection.ts';
import { TrackRenderer } from '../adapters/render/TrackRenderer.ts';
import {
  dumpDisplayList,
  logFps,
  PAINT_LAYER_KEYS,
  traceLayer,
  type PaintLayerId,
} from '../adapters/render/LayerTrace.ts';
import { TuningOverlay } from '../adapters/render/TuningOverlay.ts';
import { formatAiOverlay } from '../adapters/render/AiOverlayFormat.ts';
import { TyreMarks } from '../adapters/render/TyreMarks.ts';
import { VehicleView } from '../adapters/render/VehicleView.ts';
import { findCarSheet, frameIndexForHeading, playableCarIds } from '../data/cars/CarManifest.ts';
import type { CarSetManifest } from '../data/cars/CarManifest.ts';
import type { TrackLinesManifest } from '../domain/race/RacingLine.ts';
import { campaignSlotForTrackId } from '../data/tracks/campaign.ts';
import { planetForTrackId } from '../data/tracks/planets.ts';
import { themeForTrackId } from '../data/tracks/planetThemes.ts';
import { musicForTrackId } from '../data/tracks/planetMusic.ts';
import { findTrack } from '../data/tracks/registry.ts';
import { CEREMONY_HOLD_SECONDS } from '../domain/race/Coast.ts';
import {
  fullTrackSeconds,
  isPlayerOnPodium,
  podiumGraceDuration,
  podiumIsLocked,
} from '../domain/race/PodiumTimeout.ts';
import { loadActiveCareer, loadActiveName, loadPoints, loadWallet, rememberLastTrack } from '../adapters/progress/ProgressStore.ts';
import { npcRosterForPlanet } from '../domain/progress/GarageCatalog.ts';
import { rivalsForPlanet } from '../data/pilots/PilotRoster.ts';
import { weaponHitEarnings } from '../domain/progress/Wallet.ts';
import { weaponHitPoints } from '../domain/progress/SeasonPoints.ts';
import { HitRewardEffect } from '../adapters/render/HitRewardEffect.ts';
import { RACE_PHASE, SIMULATION_STEP_SECONDS } from '../domain/constants.ts';
import { NarratorDirector } from '../domain/audio/NarratorDirector.ts';
import { clipsInPlan, planNarratorRace } from '../domain/audio/NarratorPlan.ts';
import type { InputCommand } from '../domain/input/InputCommand.ts';
import { IDLE_INPUT } from '../domain/input/InputCommand.ts';
import { angleOf, dot, fromAngle, length } from '../domain/math/Vec2.ts';
import type { Vec2 } from '../domain/math/Vec2.ts';
import { assignNpcCars, seatCarId } from '../domain/race/CarAssignment.ts';
import { CAREER_NPC_COUNT, npcPilotNames } from '../domain/race/CareerGrid.ts';
import {
  nextWatchTrack,
  splitWatchRoster,
  watchCarIds,
  watchPilots,
  WATCH_RACER_COUNT,
} from '../domain/race/WatchField.ts';
import {
  DEBUG_IA_CAMERA_MAP_FRACTION,
  DEBUG_IA_RACER_COUNT,
  drawDebugIaGrid,
  drawSkillMixGrid,
  type DebugIaSeat,
  type SkillMix,
} from '../domain/race/DebugIaField.ts';
import {
  DEBUG_IA_LOG_INTERVAL_SECONDS,
  debugIaLogFileName,
  postDebugIaLogs,
} from '../adapters/debug/DebugIaReporter.ts';
import { RaceField } from '../domain/race/RaceField.ts';
import type { RacerEntry, RacerRuntime } from '../domain/race/RaceField.ts';
import type { TrackDefinition } from '../domain/track/TrackDefinition.ts';
import { TrackSpline } from '../domain/track/TrackSpline.ts';
import { CAR_CONDITION, IMPACT_DAMAGE_THRESHOLD } from '../domain/vehicle/CarIntegrity.ts';
import { missileCapacity } from '../domain/weapons/WeaponInventory.ts';
import { trapSeed } from '../domain/traps/pickRaceTraps.ts';
import { TRAP_KIND } from '../domain/traps/TrapCatalog.ts';
import { HAZARD_KIND } from '../domain/weapons/Hazard.ts';
import {
  BURN_MARK_LIFETIME_LAPS,
  CAR_LENGTH_PER_COLLISION_RADIUS,
  HAZARD_BURST_INTENSITY,
  MISSILE_SIZE_OF_CAR,
  OIL_LAP_REFERENCE_SPEED,
} from '../domain/weapons/WeaponConstants.ts';
import type { ResultsEntry, ResultsSceneData } from './ResultsScene.ts';
import type { PauseSceneData } from './PauseScene.ts';
import {
  camerasCacheKey,
  trapsCacheKey,
  DEFAULT_TRACK_ID,
  GASOLINE_SPRITE_KEY,
  TRAP_CRATE_KEY,
  TRAP_GASOLINE_KEY,
  MINE_SPRITE_KEY,
  MISSILE_SPRITE_KEY,
  OIL_SPRITE_KEY,
  PLAYER_CAR_ID,
  SCENE_KEY,
  WEAPON_SHEET,
  GROUND_ASSET_DIRECTORY,
} from './sceneKeys.ts';

/** Milliseconds → seconds, for Phaser's `update` delta. */
const MILLISECONDS_PER_SECOND = 1000;

/**
 * World distance at which another car's explosion is inaudible.
 *
 * Roughly a third of Thunder Basin's 1505-unit lap: far enough that a wreck behind
 * you still registers, near enough that the far side of the circuit stays quiet.
 */
const EXPLOSION_EARSHOT_UNITS = 500;

/**
 * Seconds a debug-wrecked car sits out before respawning.
 *
 * Matches `CarIntegrity`'s own respawn time. Duplicated as a constant rather than
 * exported from there, because this is a debug shortcut and the damage rules should
 * not grow an API for it.
 */
const DEBUG_RESPAWN_SECONDS = 2;

interface RaceSceneData {
  readonly manifest: CarSetManifest;
  /** Every track's offline lines, keyed by track id; the scene reads its own track's. */
  readonly linesByTrack?: Record<string, TrackLinesManifest>;
  /**
   * Which car the player drives. Absent on the first entry from `BootScene`;
   * set by the car select.
   */
  readonly carId?: string;
  /** Which circuit to race. Defaults to the anchor track when omitted. */
  readonly trackId?: string;
  /** AI-only ten-car watch. Camera follows the leader zoomed out; arrows pick a car. */
  readonly watch?: boolean;
  /** 15-NPC debug-IA session. Camera fits the whole circuit; `[` `]` `0` still work. */
  readonly debugIa?: boolean;
  readonly debugIaSeed?: number;
  readonly debugIaMix?: SkillMix;
  readonly debugIaNpcCount?: number;
  /** `,` / `.` cycle this pool in watch. Splash `P` uses Thunder Basin I–III. */
  readonly watchTrackPool?: readonly string[];
}

/** One explosion waiting to be presented, queued inside a simulation step. */
interface PendingExplosion {
  readonly position: Vec2;
  readonly intensity: number;
  /** Car wrecks stamp a dark asphalt scorch; weapon puffs do not. */
  readonly leaveBurnMark?: boolean;
  /** Visual size. Gasoline barrels pass 1.8. */
  readonly scale?: number;
}

interface PendingScrap {
  readonly racerIndex: number;
  readonly position: Vec2;
  readonly impactSpeed: number;
  readonly exploded: boolean;
}

/**
 * The playable scene: a full grid of cars on one circuit, keyboard control.
 *
 * Deliberately thin, and thinner than it looks. It owns no simulation rules at all —
 * `RaceField` owns the field, the step order, the collisions, the damage, the laps and
 * the standings, out in `src/domain/` where it is under test. What is left here is
 * presentation: one `VehicleView` per car, the camera on the player, tyre marks,
 * sound, and the explosion burst.
 *
 * The one thing worth knowing about this file: explosions are collected INSIDE the
 * fixed-step callback, not after it. Several simulation steps run per rendered frame,
 * and `explodedThisStep` is true for exactly one of them, so reading it after
 * `loop.advance` would silently drop the wreck the player was watching for.
 */
export class RaceScene extends Phaser.Scene {
  private manifest!: CarSetManifest;
  private linesByTrack: Record<string, TrackLinesManifest> = {};
  private trackLines: TrackLinesManifest | undefined;
  private carId: string = PLAYER_CAR_ID;
  private trackId: string = DEFAULT_TRACK_ID;
  private watch = false;
  private debugIa = false;
  private debugIaSeed = 1;
  private debugIaMix: SkillMix | undefined;
  private debugIaNpcCount = DEBUG_IA_RACER_COUNT;
  private debugIaLogElapsed = 0;
  private debugIaSeats: readonly DebugIaSeat[] = [];
  private watchTrackPool: readonly string[] | undefined;
  private readonly paintHidden = new Set<PaintLayerId>();
  private fpsLogElapsed = 0;
  private watchPinned = false;
  /** Car id whose telemetry currently feeds `RaceAudio`; hop resets the idle shut-off. */
  private audioFocusCarId: string | null = null;
  private track!: TrackDefinition;
  private spline!: TrackSpline;
  private projection!: IsoProjection;
  private trackRenderer!: TrackRenderer;
  private tyreMarks!: TyreMarks;
  private explosions!: ExplosionEffect;
  private scraps!: MetalScrapEffect;
  private wood!: WoodDebrisEffect;
  private chaseCamera!: ChaseCamera;
  private cameraDirector = new CameraDirector();
  private cameraImpulse = new CameraImpulse();
  private accidentWatch = new AccidentWatch();
  private cameraPreset!: CameraPreset;
  private quitedTheRace = false;
  private driver!: KeyboardDriver;
  private loop!: FixedStepLoop;
  private audio!: RaceAudio;
  private overlay!: TuningOverlay;
  private aiFocusIndex = 0;
  private field!: RaceField;
  /** One view per racer, index-aligned with `field.racers`. */
  private views: VehicleView[] = [];
  private command: InputCommand = IDLE_INPUT;
  private pendingExplosions: PendingExplosion[] = [];
  private pendingScraps: PendingScrap[] = [];
  /** Drawn every frame from live domain state — missiles, oil, mines. */
  private weaponLayer!: Phaser.GameObjects.Graphics;
  /**
   * Reused sprite pools for weapon art, grown on demand and hidden when idle.
   * Grown on demand from the weapon contact sheets (`npm run gen:weapons`);
   * the graphics layer still draws geometric fallbacks if a sheet is missing.
   */
  private missileSprites: Phaser.GameObjects.Sprite[] = [];
  private hazardSprites: Phaser.GameObjects.Sprite[] = [];
  /** True once the player has finished and the results screen has been handed off to. */
  private resultsShown = false;
  /** Seconds the field has been coasting since the player took the flag. */
  private finishHoldSeconds = 0;
  /** Seconds left on the podium grace clock; null until 1st–3rd have finished. */
  private podiumTimeoutRemaining: number | null = null;
  /** Armed length of that clock, so the HUD can drop TIME OUT at half. */
  private podiumTimeoutDuration = 0;
  /** Purse at race start; live HUD adds hit bounties on top. */
  private startingCash = 0;
  /** 1-based campaign planet, for hit-bounty scaling. */
  private planetIndex = 1;
  /** Pilot names for the HUD and results, keyed by car id. */
  private pilotNames: Record<string, string> = {};
  private playerPilotName = 'YOU';
  private sittingRivals: readonly string[] = [];
  private narrator: NarratorDirector | undefined;
  private lastTurboCount = 0;
  private lastLeaderId: string | undefined;
  private lastPlayerHits = { missiles: 0, oil: 0, mines: 0, contacts: 0 };
  private hitRewards!: HitRewardEffect;
  private lastPlayerFinished = false;
  private impactThisFrame = false;
  private weaponThisFrame = false;
  private wrongWayHold = 0;

  constructor() {
    super(SCENE_KEY.RACE);
  }

  init(data: RaceSceneData): void {
    this.manifest = data.manifest;
    this.linesByTrack = data.linesByTrack ?? {};
    this.carId = data.carId ?? PLAYER_CAR_ID;
    this.trackId = data.trackId ?? DEFAULT_TRACK_ID;
    this.debugIa = data.debugIa === true;
    this.debugIaSeed = data.debugIaSeed ?? 1;
    this.debugIaMix = data.debugIaMix;
    this.debugIaNpcCount = data.debugIaNpcCount ?? DEBUG_IA_RACER_COUNT;
    this.debugIaLogElapsed = 0;
    this.debugIaSeats = [];
    this.watch = data.watch === true || this.debugIa;
    this.watchTrackPool = data.watchTrackPool;
    this.watchPinned = false;
    this.audioFocusCarId = null;
    this.quitedTheRace = false;
    this.resultsShown = false;
    this.finishHoldSeconds = 0;
    this.podiumTimeoutRemaining = null;
    this.podiumTimeoutDuration = 0;
    this.cameraDirector = new CameraDirector();
    this.cameraImpulse = new CameraImpulse();
    this.accidentWatch = new AccidentWatch();
    this.trackLines = this.linesByTrack[this.trackId];
    this.startingCash = loadWallet();
    this.planetIndex = campaignSlotForTrackId(this.trackId)?.planetIndex ?? 1;
    const planet = planetForTrackId(this.trackId);
    rememberLastTrack(planet?.id ?? 'thunder-basin', this.trackId);
  }

  create(): void {
    try {
      this.bootRace();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.add
        .text(16, 16, `Race failed\n\n${message}`, {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: '#ff8080',
          wordWrap: { width: this.scale.width - 32 },
        })
        .setScrollFactor(0)
        .setDepth(4000);
    }
  }

  preload(): void {
    const theme = themeForTrackId(this.trackId);
    if (!this.textures.exists(theme.groundKey)) {
      this.load.image(theme.groundKey, `${GROUND_ASSET_DIRECTORY}/${theme.groundFile}`);
    }
  }

  private bootRace(): void {
    this.track = findTrack(this.trackId);
    if (this.debugIa) {
      this.track = { ...this.track, laps: 99 };
    }
    this.spline = new TrackSpline(this.track.controlPoints);

    // One number ties sprites and road together (locked decision 3): the scale the
    // sprite generator measured the whole car set at. Hard-coding a road width here
    // would make the cars quietly the wrong size relative to the track.
    this.projection = new IsoProjection(this.manifest.pixelsPerUnit);

    this.trackRenderer = new TrackRenderer(this, this.track, this.spline, this.projection, {
      theme: themeForTrackId(this.track.id),
      lowDetail: this.debugIa,
      disableGroundTile: this.debugIa,
    });
    this.tyreMarks = new TyreMarks(this, this.projection);
    this.hitRewards = new HitRewardEffect(this, this.projection);
    this.scraps = new MetalScrapEffect(this, this.projection);
    this.wood = new WoodDebrisEffect(this, this.projection);
    this.explosions = new ExplosionEffect(this, this.projection, {
      burnMarkLifetimeSeconds:
        BURN_MARK_LIFETIME_LAPS * (this.spline.totalLength / OIL_LAP_REFERENCE_SPEED),
    });
    this.chaseCamera = new ChaseCamera(this.cameras.main, this.projection);
    this.cameraPreset = this.loadCameraPreset();
    this.driver = new KeyboardDriver(this.requireKeyboard());
    this.loop = new FixedStepLoop(SIMULATION_STEP_SECONDS);
    this.audio = new RaceAudio(this.playerSheetStats(), musicForTrackId(this.track.id));

    const planet = planetForTrackId(this.trackId);
    this.field = new RaceField(this.buildEntries(), this.track, this.spline, {
      trackLines: this.trackLines,
      planetId: planet?.id,
      worldIndex: planet?.index ?? 1,
      trapCatalog: this.loadTrapCatalog(),
      trapSeed: trapSeed(planet?.seed ?? 1, this.trackId),
    });
    this.views = this.field.racers.map(racer =>
      new VehicleView(this, this.manifest, findCarSheet(this.manifest, racer.carId), this.projection, {
        farLod: this.debugIa,
      }),
    );
    this.publishDebugIaWindow();
    this.weaponLayer = this.add.graphics().setDepth(40).setName('weaponLayer');

    const bounds = this.trackRenderer.bounds;
    this.cameras.main.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    this.trackRenderer.syncToCamera(this.cameras.main);

    this.overlay = new TuningOverlay(this, this.cameras.main);

    this.bindSceneKeys();
    this.respawn();

    if (!this.debugIa) {
      this.scene.launch(SCENE_KEY.HUD);
    }

    traceLayer('10 cars', 0, `${this.views.length} VehicleView  depthOf(x+y)`);
    traceLayer('11 crates/weapons', 40, 'weaponLayer + hazard/missile sprites');
    traceLayer('12 overlay', Number.MAX_SAFE_INTEGER, this.debugIa ? 'shown (debug-IA)' : 'hidden until T');
    dumpDisplayList(this);
    console.info(
      '[layers] hide paint with keys 1–7 (fill tile road tyres cars crates fx). Black leftover = Phaser clear #0a0a12.',
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.releaseResources());
  }

  update(_time: number, deltaMilliseconds: number): void {
    if (this.resultsShown || this.field === undefined) {
      return;
    }
    const deltaSeconds = deltaMilliseconds / MILLISECONDS_PER_SECOND;

    // The command is read once per rendered frame rather than per simulation step:
    // the keyboard cannot change between two steps of the same frame anyway, and it
    // keeps every step of a frame perfectly reproducible. The driver needs the
    // current forward speed because Down means "brake" while rolling and "reverse"
    // once stopped (decision 18).
    this.command =
      this.watch || this.quitedTheRace
        ? IDLE_INPUT
        : this.driver.read(deltaSeconds, this.forwardSpeed());
    this.loop.advance(deltaSeconds, stepSeconds => this.stepSimulation(stepSeconds));
    this.presentHitRewards();

    this.tickNarrator(deltaSeconds);
    this.syncViews();
    this.hitRewards.update(this.player.state.position, deltaSeconds, this.cameras.main.zoom);
    this.drawWeapons();
    // Once per frame, whatever the number of cars: ageing marks is a property of time
    // passing. Calling it per car aged them five times too fast.
    if (!this.debugIa) {
      this.tyreMarks.update(deltaSeconds);
    }
    this.presentExplosions();
    this.presentScraps();
    this.presentWood();
    this.presentTrapSmashes();
    this.updatePlayerAudio(deltaSeconds);
    this.explosions.update(deltaSeconds);
    this.scraps.update(deltaSeconds);
    this.wood.update(deltaSeconds);
    this.chaseCamera.follow(this.followedRacer().state, deltaSeconds, this.targetZoom(deltaSeconds));
    // Hit / explosion camera kick — off while we try the start without the sway.
    // const impulse = this.cameraImpulse.sample(deltaSeconds);
    // this.chaseCamera.applyOverlay(
    //   impulse.x * this.cameras.main.width,
    //   impulse.y * this.cameras.main.height,
    //   impulse.zoomScale,
    // );
    this.trackRenderer.syncToCamera(this.cameras.main);
    this.applyPaintVisibility();
    this.refreshOverlay();
    this.tickDebugIaLog(deltaSeconds);
    this.tickFpsLog(deltaSeconds);

    this.maybeFinishRace(deltaSeconds);
  }

  /**
   * End the race when the player is already on the podium (three-second hold
   * to the pub), when the whole field has taken the flag, or when the pack
   * grace clock (a sixth of a full-track par, armed as 3rd crosses) hits zero.
   */
  private maybeFinishRace(deltaSeconds: number): void {
    if (this.resultsShown || this.watch || this.quitedTheRace) {
      return;
    }
    const race = this.field.race;
    const finishedCount = race.racers.filter(racer => racer.progress.finished).length;
    const allFinished = race.racers.length > 0 && finishedCount === race.racers.length;
    const playerRace =
      race.racers.find(racer => racer.racerIndex === this.player.gridIndex) ??
      race.racers.find(racer => racer.carId === this.carId);
    const playerStanding = this.field.standingOf(this.player.carId, this.player.gridIndex);
    const playerOnPodium = isPlayerOnPodium(
      playerRace?.progress.finished === true,
      playerStanding?.position ?? Number.POSITIVE_INFINITY,
    );

    if (playerOnPodium) {
      this.tickPodiumClock(deltaSeconds, race.elapsedSeconds, true);
      return;
    }

    if (allFinished) {
      this.podiumTimeoutRemaining = null;
      this.finishHoldSeconds += deltaSeconds;
      if (!this.field.allNearlyStopped && this.finishHoldSeconds < CEREMONY_HOLD_SECONDS) {
        return;
      }
      this.handOffResults(race.elapsedSeconds);
      return;
    }

    if (!podiumIsLocked(finishedCount, race.racers.length)) {
      return;
    }
    this.tickPodiumClock(deltaSeconds, race.elapsedSeconds, false);
  }

  private tickPodiumClock(deltaSeconds: number, elapsedSeconds: number, playerOnPodium: boolean): void {
    if (this.podiumTimeoutRemaining === null) {
      this.armPodiumTimeout(elapsedSeconds, playerOnPodium);
    }
    if (this.podiumTimeoutRemaining === null) {
      return;
    }
    this.podiumTimeoutRemaining = Math.max(0, this.podiumTimeoutRemaining - deltaSeconds);
    if (this.podiumTimeoutRemaining > 0) {
      return;
    }
    this.handOffResults(elapsedSeconds);
  }

  private armPodiumTimeout(elapsedSeconds: number, playerOnPodium: boolean): void {
    const firstFinish = this.field.race.racers.reduce(
      (earliest, racer) => Math.min(earliest, racer.finishedAtSeconds ?? Infinity),
      Infinity,
    );
    const fallback = Number.isFinite(firstFinish) ? firstFinish : elapsedSeconds;
    const fullTrack = fullTrackSeconds(this.trackLines?.parTime, this.track.laps, fallback);
    const duration = podiumGraceDuration(fullTrack, playerOnPodium);
    if (duration <= 0) {
      this.podiumTimeoutRemaining = 0;
      this.podiumTimeoutDuration = 0;
      return;
    }
    this.podiumTimeoutDuration = duration;
    this.podiumTimeoutRemaining = duration;
  }

  private handOffResults(elapsedSeconds: number): void {
    this.resultsShown = true;
    const last = this.field.race.racers.reduce(
      (latest, racer) => Math.max(latest, racer.finishedAtSeconds ?? 0),
      0,
    );
    this.showResults(last || elapsedSeconds);
  }

  private showResults(finishSeconds: number): void {
    const standings: ResultsEntry[] = this.field.race.standings.map(entry => ({
      position: entry.position,
      carId: entry.carId,
      name: this.pilotNameOf(entry.carId, entry.racerIndex),
      isPlayer: this.field.racers[entry.racerIndex]?.isPlayer === true,
    }));
    const playerPosition =
      this.field.standingOf(this.carId)?.position ?? this.field.racers.length;
    const parSeconds =
      this.trackLines?.parTime !== undefined
        ? this.trackLines.parTime * this.track.laps
        : undefined;

    // The HUD is its own scene launched over the race; it must be stopped explicitly
    // or it would keep drawing on top of the results.
    this.scene.stop(SCENE_KEY.HUD);
    this.scene.start(SCENE_KEY.RESULTS, {
      manifest: this.manifest,
      linesByTrack: this.linesByTrack,
      trackLines: this.trackLines,
      carId: this.carId,
      trackId: this.track.id,
      trackName: this.track.displayName,
      laps: this.track.laps,
      standings,
      playerPosition,
      totalRacers: this.field.racers.length,
      finishSeconds,
      parSeconds,
      weaponHits: this.field.playerWeaponHits,
      playerName: this.playerPilotName,
      sittingRivals: this.sittingRivals,
      rivalSeason: loadActiveCareer()?.rivalNames.map((name, index) => ({
        name,
        points: loadActiveCareer()?.rivalPoints[index] ?? 0,
      })) ?? [],
    } satisfies ResultsSceneData);
  }

  /**
   * Everything the HUD needs, assembled once per frame.
   *
   * The HUD is a separate scene that pulls this rather than being pushed to, which
   * keeps the race loop free of any knowledge of what is on screen.
   */
  hudReadout(): HudReadout {
    const player = this.followedRacer();
    const standing = this.field.standingOf(player.carId, player.gridIndex);
    const race = this.field.race;

    return {
      phase: race.phase,
      countdownRemaining: race.countdownRemaining,
      elapsedSeconds: race.elapsedSeconds,
      position: standing?.position ?? this.field.racers.length,
      totalRacers: this.field.racers.length,
      // `lapsCompleted + 1` is the lap the car is ON, which is what a racing game
      // shows: a car that has completed nothing is on lap 1, not lap 0. `formatHud`
      // clamps it to `totalLaps`, so a finished car reads 3/3 rather than 4/3.
      lap: (standing?.lapsCompleted ?? 0) + 1,
      totalLaps: this.track.laps,
      // Live loadout; C/X/Z/Shift on the HUD match the console weapon buttons.
      ammo: player.inventory.missiles,
      ammoCapacity: missileCapacity(player.stats, player.perk),
      oil: player.inventory.oil,
      mines: player.inventory.mines,
      jumps: player.jumps,
      turbos: player.turbos,
      turboActive: player.turboRemaining > 0,
      integrity: player.integrity.integrity,
      standings: race.standings.map(entry => ({
        carId: entry.carId,
        position: entry.position,
      })),
      speed: player.telemetry?.speed ?? 0,
      maxSpeed: player.stats.maxSpeed,
      cash: this.startingCash + weaponHitEarnings(this.field.playerWeaponHits, this.planetIndex),
      points: loadPoints() + weaponHitPoints(this.field.playerWeaponHits, this.planetIndex),
      podiumTimeoutRemaining: this.podiumTimeoutRemaining ?? undefined,
      podiumTimeoutDuration: this.podiumTimeoutRemaining === null ? undefined : this.podiumTimeoutDuration,
      rpmFraction: this.audio.rpmFraction,
    };
  }

  /** The standings with display names rather than ids, for the HUD's list. */
  standingsWithNames(): readonly { readonly name: string; readonly position: number }[] {
    return this.field.race.standings.map(entry => ({
      name: this.pilotNameOf(entry.carId, entry.racerIndex),
      position: entry.position,
    }));
  }

  private pilotNameOf(carId: string, racerIndex?: number): string {
    if (racerIndex !== undefined) {
      const seated = this.field.racers[racerIndex]?.name;
      if (seated !== undefined && seated.length > 0) {
        return seated;
      }
    }
    return this.pilotNames[carId] ?? findCarSheet(this.manifest, carId).displayName;
  }

  /**
   * One 60 Hz simulation step for the whole field. Every rule lives in `RaceField`;
   * all this does is notice what the presentation layer owes the player as a result.
   */
  private stepSimulation(stepSeconds: number): void {
    const impactBefore = this.field.racers.map(racer => racer.pendingImpactSpeed);
    this.field.step(this.command, stepSeconds);
    this.accidentWatch.note(
      this.field.contactsThisStep,
      IMPACT_DAMAGE_THRESHOLD,
      stepSeconds,
    );
    // this.notePlayerCameraImpulse(impactBefore);

    // Collected here rather than in `update`, because `explodedThisStep` is true for
    // one step only and a frame can contain several steps.
    this.field.racers.forEach((racer, index) => {
      if (racer.explodedThisStep) {
        this.pendingExplosions.push({
          position: racer.state.position,
          intensity: this.explosionIntensity(racer),
          leaveBurnMark: true,
        });
        this.pendingScraps = this.pendingScraps.filter(scrap => scrap.racerIndex !== index);
        this.pendingScraps.push({
          racerIndex: index,
          position: racer.state.position,
          impactSpeed: racer.pendingImpactSpeed,
          exploded: true,
        });
        this.impactThisFrame = true;
        return;
      }
      const before = impactBefore[index] ?? 0;
      if (
        racer.pendingImpactSpeed > before &&
        racer.pendingImpactSpeed > IMPACT_DAMAGE_THRESHOLD
      ) {
        this.pendingScraps.push({
          racerIndex: index,
          position: racer.state.position,
          impactSpeed: racer.pendingImpactSpeed,
          exploded: false,
        });
        this.impactThisFrame = true;
      }
    });
    for (const position of this.field.weaponBurstsThisStep) {
      this.pendingExplosions.push({ position, intensity: HAZARD_BURST_INTENSITY });
      this.weaponThisFrame = true;
    }
    for (const burst of this.field.hazardBurstsThisStep) {
      this.pendingExplosions.push({
        position: burst.position,
        intensity: HAZARD_BURST_INTENSITY,
        scale: burst.scale,
        leaveBurnMark: burst.leaveBurnMark === true,
      });
      this.weaponThisFrame = true;
    }
    if (this.field.racers.some(racer => racer.explodedThisStep)) {
      this.weaponThisFrame = true;
    }
    const hits = this.field.playerWeaponHits;
    if (
      hits.missiles > this.lastPlayerHits.missiles ||
      hits.oil > this.lastPlayerHits.oil ||
      hits.mines > this.lastPlayerHits.mines ||
      hits.contacts > this.lastPlayerHits.contacts
    ) {
      this.weaponThisFrame = true;
    }
  }

  private presentHitRewards(): void {
    const hits = this.field.playerWeaponHits;
    const prev = this.lastPlayerHits;
    const delta = {
      missiles: hits.missiles - prev.missiles,
      oil: hits.oil - prev.oil,
      mines: hits.mines - prev.mines,
      contacts: hits.contacts - prev.contacts,
    };
    const cash = weaponHitEarnings(delta, this.planetIndex);
    const points = weaponHitPoints(delta, this.planetIndex);
    if (cash <= 0 && points <= 0) {
      return;
    }
    this.hitRewards.spawn(this.player.state.position, cash, points);
  }

  /** Draws every car, and lays tyre marks for all of them, not just the player's. */
  private syncViews(): void {
    this.field.racers.forEach((racer, index) => {
      const view = this.views[index];
      if (view === undefined) {
        return;
      }

      // A wrecked car is gone until it respawns: the explosion has to read as the car
      // being destroyed, and a sprite sitting in the fire would undo that entirely.
      const wrecked = racer.integrity.condition === CAR_CONDITION.DESTROYED;
      view.setVisible(!wrecked);
      if (wrecked) {
        return;
      }

      view.sync(racer.state, { turboActive: racer.turboRemaining > 0 });
      if (racer.telemetry !== null) {
        // Per-car index: `TyreMarks` keeps a wheel trail per car, and sharing one
        // would join two cars' wheels with a streak across the track.
        this.tyreMarks.record(index, racer.state, racer.telemetry);
      }
    });
  }

  /**
   * Live weapons: one frame from the owner contact sheets (32 yaw poses), sized
   * in world units so a missile/mine/oil reads next to a car instead of as a
   * tiny postage stamp of the whole 4×8 grid.
   */
  private drawWeapons(): void {
    this.weaponLayer.clear();
    const px = this.manifest.pixelsPerUnit;

    const hasMissileArt = this.textures.exists(MISSILE_SPRITE_KEY);
    let missileSlot = 0;
    for (const missile of this.field.activeMissiles) {
      const screen = this.projection.toScreen(missile.position);
      if (hasMissileArt) {
        const sprite = this.missileSprite(missileSlot);
        missileSlot += 1;
        const heading = angleOf(missile.velocity);
        sprite
          .setVisible(true)
          .setPosition(screen.x, screen.y)
          .setFrame(frameIndexForHeading(heading, WEAPON_SHEET.frameCount))
          .setDepth(this.projection.depthOf(missile.position) + 0.5);
        const carLength = CAR_LENGTH_PER_COLLISION_RADIUS * missile.radius;
        this.scaleWeaponSprite(sprite, carLength * MISSILE_SIZE_OF_CAR * px);
      } else {
        const radius = Math.max(4, missile.radius * px * 0.45);
        this.weaponLayer.fillStyle(0xffe066, 1);
        this.weaponLayer.fillCircle(screen.x, screen.y, radius);
      }
    }
    this.hideFrom(this.missileSprites, missileSlot);

    let hazardSlot = 0;
    for (const hazard of this.field.activeHazards) {
      const screen = this.projection.toScreen(hazard.position);
      const isOil = hazard.kind === HAZARD_KIND.OIL;
      const isGasoline = hazard.kind === HAZARD_KIND.GASOLINE;
      const isCrate = hazard.kind === HAZARD_KIND.CRATE;
      const gasolineKey = this.textures.exists(TRAP_GASOLINE_KEY)
        ? TRAP_GASOLINE_KEY
        : GASOLINE_SPRITE_KEY;
      const artKey = isOil
        ? OIL_SPRITE_KEY
        : isCrate
          ? TRAP_CRATE_KEY
          : isGasoline
            ? gasolineKey
            : MINE_SPRITE_KEY;
      if (this.textures.exists(artKey)) {
        const sprite = this.hazardSprite(hazardSlot, artKey);
        hazardSlot += 1;
        const height = (hazard.stackIndex ?? 0) * 1.15;
        const screen = this.projection.toScreen(hazard.position, height);
        sprite
          .setVisible(true)
          .setOrigin(0.5, isCrate || isGasoline ? 0.82 : 0.5)
          .setPosition(screen.x, screen.y)
          .setFrame(0)
          .setDepth(this.projection.depthOf(hazard.position) - 0.2 + height);
        const display = hazard.radius * 2 * (isCrate ? 1.85 : isGasoline ? 2.6 : 1);
        this.scaleWeaponSprite(sprite, display * px);
        if (isOil) {
          sprite.setFrame(Math.floor(this.time.now / 90) % WEAPON_SHEET.frameCount);
        }
      } else {
        const radius = Math.max(10, hazard.radius * px * (isCrate || isGasoline ? 1.8 : 0.85));
        const height = (hazard.stackIndex ?? 0) * 8;
        if (isOil) {
          this.weaponLayer.fillStyle(0x1a1208, 0.85);
          this.weaponLayer.fillEllipse(screen.x, screen.y - height, radius * 2, radius);
        } else if (isGasoline) {
          this.weaponLayer.fillStyle(0xc43a28, 1);
          this.weaponLayer.fillEllipse(screen.x, screen.y - height, radius * 1.4, radius * 1.8);
        } else if (isCrate) {
          this.weaponLayer.fillStyle(0xb07838, 1);
          this.weaponLayer.fillRect(
            screen.x - radius * 0.7,
            screen.y - radius * 0.7 - height,
            radius * 1.4,
            radius * 1.4,
          );
        } else {
          this.weaponLayer.fillStyle(0xff3344, 1);
          this.weaponLayer.fillCircle(screen.x, screen.y - height, radius);
        }
      }
    }
    this.hideFrom(this.hazardSprites, hazardSlot);
  }

  private missileSprite(index: number): Phaser.GameObjects.Sprite {
    let sprite = this.missileSprites[index];
    if (sprite === undefined) {
      sprite = this.add.sprite(0, 0, MISSILE_SPRITE_KEY, 0).setDepth(41);
      this.missileSprites[index] = sprite;
    }
    return sprite;
  }

  private hazardSprite(index: number, textureKey: string): Phaser.GameObjects.Sprite {
    let sprite = this.hazardSprites[index];
    if (sprite === undefined) {
      sprite = this.add.sprite(0, 0, textureKey, 0).setDepth(39);
      this.hazardSprites[index] = sprite;
    } else if (sprite.texture.key !== textureKey) {
      sprite.setTexture(textureKey, 0);
    }
    return sprite;
  }

  /** Scale one sheet frame so its widest side spans `pixelSize` screen pixels. */
  private scaleWeaponSprite(sprite: Phaser.GameObjects.Sprite, pixelSize: number): void {
    const source = Math.max(sprite.frame.width, sprite.frame.height, 1);
    sprite.setScale(Math.max(pixelSize, 8) / source);
  }

  /** Hide every pooled sprite from `start` onward (last frame drew fewer than this). */
  private hideFrom(pool: readonly Phaser.GameObjects.Sprite[], start: number): void {
    for (let index = start; index < pool.length; index += 1) {
      pool[index]?.setVisible(false);
    }
  }

  private presentExplosions(): void {
    for (const explosion of this.pendingExplosions) {
      this.explosions.burst(explosion.position, explosion.intensity, {
        leaveBurnMark: explosion.leaveBurnMark === true,
        skipShards: explosion.leaveBurnMark === true,
        scale: explosion.scale,
      });
      this.audio.playExplosion(explosion.intensity);
    }
    this.pendingExplosions = [];
  }

  private presentScraps(): void {
    for (const scrap of this.pendingScraps) {
      this.scraps.burst(scrap.position, scrap.impactSpeed, scrap.exploded);
    }
    this.pendingScraps = [];
  }

  private presentWood(): void {
    for (const position of this.field.woodBurstsThisStep) {
      this.wood.burst(position);
    }
  }

  private presentTrapSmashes(): void {
    for (const smash of this.field.trapSmashesThisStep) {
      if (smash.kind === TRAP_KIND.CRATE) {
        this.audio.playCrateHit();
      } else {
        this.audio.playDrumHit();
      }
    }
  }

  /**
   * The engine, tyres and impacts the player can hear follow ONE car.
   *
   * While racing that is the keyboard car. In watch / quit-spectator it is the
   * camera target, using that car's last AI throttle so an idle NPC cuts the
   * motor after 3.5 s and the camera returns to the leader (pin released).
   *
   * Only that focus car's impacts are voiced: five cars scraping walls at once
   * would be a wash of noise that tells the driver nothing about their own race.
   */
  private updatePlayerAudio(deltaSeconds: number): void {
    const spectator = this.watch || this.quitedTheRace;
    const focus = spectator ? this.followedRacer() : this.player;
    const maxSpeed = focus.stats.maxSpeed;
    const command = spectator ? focus.lastCommand : this.command;

    if (focus.carId !== this.audioFocusCarId) {
      this.audio.clearIdleShutoff();
      this.audioFocusCarId = focus.carId;
    }

    const speed = focus.telemetry?.speed ?? length(focus.state.velocity);
    if (
      shouldParkEngine({
        destroyed: focus.integrity.condition === CAR_CONDITION.DESTROYED,
        finished: this.field.standingOf(focus.carId, focus.gridIndex)?.finished === true,
        hasTelemetry: focus.telemetry !== null,
        speed,
      })
    ) {
      this.audio.parkEngine();
    } else if (focus.telemetry !== null) {
      this.audio.update(focus.telemetry, command, maxSpeed, deltaSeconds);
    }

    // Pinned on a stalled NPC whose motor just cut → release pin; followedRacer
    // falls back to the leader (and accident rules still win when they fire).
    if (spectator && this.watchPinned && this.audio.isEngineIdleShutOff) {
      this.watchPinned = false;
    }

    const impact = this.field.drainImpact(focus);
    if (impact > 0) {
      this.audio.playImpact(impact, maxSpeed);
    }
    // Every other car's impact is drained and discarded, or it would accumulate
    // forever and then fire as one enormous hit the moment anything read it.
    for (const racer of this.field.racers) {
      if (racer.carId !== focus.carId) {
        this.field.drainImpact(racer);
      }
    }
  }

  /**
   * How loud and large a wreck should be, 0..1.
   *
   * The player's own explosion is always full. Another car's falls off with distance
   * so the mix says whose race just ended, and it never reaches zero — a wreck you
   * cannot hear at all reads as a bug rather than as distance.
   */
  private explosionIntensity(racer: RacerRuntime): number {
    if (racer.isPlayer) {
      return 1;
    }
    const away = Math.abs(this.spline.signedDelta(this.player.distance, racer.distance));
    const nearness = 1 - Math.min(1, away / EXPLOSION_EARSHOT_UNITS);
    return 0.25 + 0.75 * nearness;
  }

  private get player(): RacerRuntime {
    return this.field.player;
  }

  /**
   * The grid: the NPCs first, the player LAST.
   *
   * Grid slots follow entry order, so this puts the player at the back of the field.
   * That is a gameplay choice, not an accident — starting on pole in a packed
   * arcade race means driving away from everyone and never seeing another car.
   */
  private followedRacer(): RacerRuntime {
    const racers = this.field.racers;
    if (racers.length === 0) {
      return this.player;
    }
    if (!this.watch && !this.quitedTheRace) {
      return this.player;
    }
    const accidentId = this.accidentWatch.targetCarId();
    if (accidentId !== null && !this.watchPinned) {
      const wreck = racers.find(racer => racer.carId === accidentId);
      if (wreck !== undefined) {
        return wreck;
      }
    }
    if (!this.watchPinned) {
      const leaderId = this.field.race.standings[0]?.carId;
      const leader = racers.find(racer => racer.carId === leaderId);
      if (leader !== undefined) {
        this.aiFocusIndex = racers.indexOf(leader);
        return leader;
      }
    }
    return racers[this.aiFocusIndex % racers.length] ?? this.player;
  }

  // Hit shake + wreck zoom punch. Commented: the start grid made it look messy.
  // private notePlayerCameraImpulse(impactBefore: readonly number[]): void {
  //   const player = this.player;
  //   if (!player.isPlayer) {
  //     return;
  //   }
  //   if (player.explodedThisStep) {
  //     this.cameraImpulse.punchExplosion();
  //     return;
  //   }
  //   if (player.respawnedThisStep) {
  //     this.cameraImpulse.recoverFromExplosion();
  //     return;
  //   }
  //   const index = this.field.racers.indexOf(player);
  //   const before = impactBefore[index] ?? 0;
  //   if (
  //     player.pendingImpactSpeed > before &&
  //     player.pendingImpactSpeed > IMPACT_DAMAGE_THRESHOLD
  //   ) {
  //     this.cameraImpulse.punchHit();
  //   }
  // }

  private buildEntries(): readonly RacerEntry[] {
    if (this.debugIa) {
      return this.buildDebugIaEntries();
    }
    if (this.watch) {
      return this.buildWatchEntries();
    }
    const playable = playableCarIds(this.manifest);
    if (!playable.includes(this.carId) && playable[0] !== undefined) {
      this.carId = playable[0];
    }
    const planetIds = npcRosterForPlanet(this.planetIndex).filter(id => playable.includes(id));
    const extra = playable.filter(id => !planetIds.includes(id));
    const npcSource = planetIds.length > 0 ? [...planetIds, ...extra] : playable;
    const npcIds = assignNpcCars(npcSource, this.carId, CAREER_NPC_COUNT);
    this.playerPilotName = loadActiveName() || 'YOU';
    const career = loadActiveCareer();
    const rivals = rivalsForPlanet(
      career?.rivalNames ?? [],
      career?.rivalPoints ?? [],
      this.planetIndex,
    );
    const npcPilots = npcPilotNames(rivals, CAREER_NPC_COUNT);
    this.pilotNames = { [this.carId]: this.playerPilotName };
    npcIds.forEach((id, index) => {
      this.pilotNames[seatCarId(id, index)] = npcPilots[index] ?? `RIV${index + 1}`;
    });
    this.sittingRivals = rivals.filter(name => !npcPilots.includes(name));

    // The perk travels with the car, for the NPCs exactly as for the player: an advantage
    // the player can feel is an advantage they must also race against.
    const npcs = npcIds.map((carId, index) => {
      const sheet = findCarSheet(this.manifest, carId);
      return {
        carId: seatCarId(carId, index),
        name: npcPilots[index] ?? `RIV${index + 1}`,
        stats: sheet.stats,
        perk: sheet.perk,
        homePlanetId: sheet.homePlanetId,
        worldAdvantage: sheet.worldAdvantage,
        isPlayer: false,
      };
    });

    const player = findCarSheet(this.manifest, this.carId);
    return [
      ...npcs,
      {
        carId: this.carId,
        name: this.playerPilotName,
        stats: player.stats,
        perk: player.perk,
        homePlanetId: player.homePlanetId,
        worldAdvantage: player.worldAdvantage,
        isPlayer: true,
      },
    ];
  }

  private buildWatchEntries(): readonly RacerEntry[] {
    const allIds = watchCarIds(playableCarIds(this.manifest));
    const planetTwoIndex = Math.max(0, this.planetIndex - 1);
    const { field, reserve } = splitWatchRoster(allIds, planetTwoIndex);
    const pilots = watchPilots();
    this.sittingRivals = reserve.map(carId => findCarSheet(this.manifest, carId).displayName);
    this.pilotNames = {};
    const ids = field.slice(0, WATCH_RACER_COUNT);
    this.carId = ids[0] ?? this.carId;
    return ids.map((carId, index) => {
      const sheet = findCarSheet(this.manifest, carId);
      const name = pilots[index] ?? `RIV${index + 1}`;
      this.pilotNames[carId] = name;
      return {
        carId,
        name,
        stats: sheet.stats,
        perk: sheet.perk,
        homePlanetId: sheet.homePlanetId,
        worldAdvantage: sheet.worldAdvantage,
        isPlayer: false,
      };
    });
  }

  private buildDebugIaEntries(): readonly RacerEntry[] {
    const allIds = playableCarIds(this.manifest);
    const grid = this.debugIaMix
      ? drawSkillMixGrid(allIds, this.debugIaSeed, this.debugIaMix)
      : drawDebugIaGrid(allIds, this.debugIaSeed, this.debugIaNpcCount);
    this.debugIaSeats = grid.seats;
    this.debugIaSeed = grid.seed;
    this.sittingRivals = [];
    this.pilotNames = {};
    this.carId = grid.seats[0]?.carId ?? this.carId;
    return grid.seats.map(seat => {
      const sheet = findCarSheet(this.manifest, seat.carId);
      this.pilotNames[seat.carId] = seat.name;
      return {
        carId: seat.carId,
        name: seat.name,
        stats: sheet.stats,
        perk: sheet.perk,
        homePlanetId: sheet.homePlanetId,
        worldAdvantage: sheet.worldAdvantage,
        isPlayer: false,
      };
    });
  }

  private playerSheetStats() {
    return findCarSheet(this.manifest, this.carId).stats;
  }

  /** Live map fit, then director (manual 10s > live). Hairpins do not yank zoom. */
  private targetZoom(deltaSeconds: number = SIMULATION_STEP_SECONDS): number {
    const focus = this.followedRacer();
    const spectator = this.watch || this.quitedTheRace;
    const live = spectator
      ? this.spectatorLiveZoom()
      : this.mapFractionZoom(CAMERA_PLAYER_MAP_FRACTION);
    return this.cameraDirector.sample(
      deltaSeconds,
      live,
      focus.distance,
      spectatorCameraPreset(this.cameraPreset),
      this.spline.totalLength,
    ).zoom;
  }

  /** Watch / quit: pulled back on the leader. Debug-IA fits the whole circuit. */
  private spectatorLiveZoom(): number {
    if (this.debugIa) {
      return this.mapFractionZoom(DEBUG_IA_CAMERA_MAP_FRACTION);
    }
    return CAMERA_SPECTATOR_ZOOM;
  }

  private loadCameraPreset(): CameraPreset {
    const raw = this.cache.json.get(camerasCacheKey(this.trackId));
    if (raw !== undefined && raw !== null) {
      try {
        return parseTrackCameraPreset(raw);
      } catch {
        /* Generated file missing or stale — analyze live. */
      }
    }
    return analyzeTrackCameras(this.track);
  }

  private loadTrapCatalog() {
    const raw = this.cache.json.get(trapsCacheKey(this.trackId));
    if (raw !== undefined && raw !== null) {
      try {
        return parseTrackTrapCatalog(raw);
      } catch {
        /* Generated file missing or stale — analyze live. */
      }
    }
    return undefined;
  }

  private manualZoomOut(): number {
    return this.mapFractionZoom(0.5);
  }

  private mapFractionZoom(fraction: number): number {
    const bounds = this.trackRenderer.bounds;
    return zoomToFitFraction(
      bounds.width,
      bounds.height,
      this.cameras.main.width,
      this.cameras.main.height,
      fraction,
    );
  }

  /**
   * Velocity along the heading. The input adapter needs it to tell braking from
   * reversing, and it is cheap enough to recompute rather than cache — the previous
   * frame's telemetry would be one frame stale exactly when the car is stopping,
   * which is the moment that decision matters.
   */
  private forwardSpeed(): number {
    const state = this.player.state;
    return dot(state.velocity, fromAngle(state.heading));
  }

  private bindSceneKeys(): void {
    const keyboard = this.requireKeyboard();
    const unlessPaused = (action: () => void): (() => void) => {
      return () => {
        if (this.scene.isPaused(SCENE_KEY.RACE) || this.resultsShown) {
          return;
        }
        action();
      };
    };

    keyboard
      .addKey(Phaser.Input.Keyboard.KeyCodes.M)
      .on('down', unlessPaused(() => this.audio.setMuted(!this.audio.isMuted)));

    // T hides the overlay, for looking at the game rather than at the numbers.
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T).on('down', unlessPaused(() => this.overlay.toggle()));
    const paintKeyCodes = [
      Phaser.Input.Keyboard.KeyCodes.ONE,
      Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE,
      Phaser.Input.Keyboard.KeyCodes.FOUR,
      Phaser.Input.Keyboard.KeyCodes.FIVE,
      Phaser.Input.Keyboard.KeyCodes.SIX,
      Phaser.Input.Keyboard.KeyCodes.SEVEN,
    ] as const;
    PAINT_LAYER_KEYS.forEach((layer, index) => {
      const code = paintKeyCodes[index];
      if (code === undefined) {
        return;
      }
      keyboard.addKey(code).on('down', unlessPaused(() => this.togglePaintLayer(layer.id)));
    });
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N).on('down', unlessPaused(() => {
      this.aiFocusIndex += 1;
      this.watchPinned = true;
      if (!this.overlay.isVisible) {
        this.overlay.toggle();
      }
    }));
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.OPEN_BRACKET).on('down', unlessPaused(() => {
      this.cameraDirector.zoomIn(this.cameraPreset.maxZoomIn ?? CAMERA_MAX_ZOOM_IN);
    }));
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CLOSED_BRACKET).on('down', unlessPaused(() => {
      this.cameraDirector.zoomOut(this.manualZoomOut());
    }));
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ZERO).on('down', unlessPaused(() => {
      this.cameraDirector.resetToDefault();
    }));
    const cycleWatch = (step: number): (() => void) =>
      unlessPaused(() => {
        if (this.watch || this.quitedTheRace) {
          this.cycleSpectator(step);
        }
      });
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT).on('down', cycleWatch(-1));
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT).on('down', cycleWatch(1));
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP).on('down', cycleWatch(-1));
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN).on('down', cycleWatch(1));
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', unlessPaused(() => {
      if (this.watch || this.quitedTheRace) {
        this.jumpSpectatorCluster();
      }
    }));
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L).on('down', unlessPaused(() => {
      this.watchPinned = false;
    }));
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.COMMA).on('down', unlessPaused(() => this.swapWatchTrack(-1)));
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.PERIOD).on('down', unlessPaused(() => this.swapWatchTrack(1)));

    // Esc pauses the race and raises the pause menu (Return / Save / Main Menu).
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this.pauseGame());

    // X wrecks the player's own car on demand. Debug only — not a player control.
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K).on('down', unlessPaused(() => this.wreckPlayer()));

    // Browsers start every AudioContext suspended and only honour a resume that
    // comes from a real user gesture, so the first key press is the earliest the
    // engine can be heard. `resume()` is a no-op once it has taken.
    keyboard.on('keydown', () => this.audio.resume());
  }

  private swapWatchTrack(step: number): void {
    if (!this.watch) {
      return;
    }
    const trackId = nextWatchTrack(this.trackId, step, this.watchTrackPool);
    if (trackId === this.trackId) {
      return;
    }
    this.scene.restart({
      manifest: this.manifest,
      linesByTrack: this.linesByTrack,
      trackId,
      watch: true,
      debugIa: this.debugIa,
      debugIaSeed: this.debugIaSeed,
      debugIaMix: this.debugIaMix,
      debugIaNpcCount: this.debugIaNpcCount,
      watchTrackPool: this.watchTrackPool,
    } satisfies RaceSceneData);
  }

  /** Freezes the race and HUD and raises the pause menu over them. */
  private pauseGame(): void {
    if (this.resultsShown || this.scene.isPaused(SCENE_KEY.RACE)) {
      return;
    }
    this.scene.launch(SCENE_KEY.PAUSE, {
      manifest: this.manifest,
      linesByTrack: this.linesByTrack,
      carId: this.carId,
      muted: this.audio.isMuted,
      setMuted: muted => this.audio.setMuted(muted),
      onQuitRace: this.watch || this.quitedTheRace ? undefined : () => this.quitTheRace(),
    } satisfies PauseSceneData);
    this.scene.pause(SCENE_KEY.HUD);
    this.scene.pause();
  }

  private quitTheRace(): void {
    if (this.watch || this.quitedTheRace || this.resultsShown) {
      return;
    }
    this.quitedTheRace = true;
    this.watchPinned = false;
    this.field.retirePlayer();
    this.audio.silenceEngine();
    this.audio.setMasterScale(CAMERA_QUIT_MASTER_SCALE);
    this.cameraImpulse.cancelHold();
    this.cameraDirector.resetToDefault();
  }

  private cycleSpectator(step: number): void {
    if (!this.watch && !this.quitedTheRace) {
      return;
    }
    const count = this.field.racers.length;
    if (count === 0) {
      return;
    }
    this.watchPinned = true;
    this.aiFocusIndex = (this.aiFocusIndex + step + count) % count;
  }

  private jumpSpectatorCluster(): void {
    if (!this.watch && !this.quitedTheRace) {
      return;
    }
    const id = this.accidentWatch.jumpToCluster(
      this.field.racers.map(racer => ({
        carId: racer.carId,
        position: racer.state.position,
      })),
    );
    if (id === null) {
      return;
    }
    const index = this.field.racers.findIndex(racer => racer.carId === id);
    if (index >= 0) {
      this.aiFocusIndex = index;
      this.watchPinned = false;
    }
  }

  /** Debug: destroys the player's car so the wreck, explosion and respawn can be watched. */
  private wreckPlayer(): void {
    const player = this.player;
    if (player.integrity.condition === CAR_CONDITION.DESTROYED) {
      return;
    }
    player.integrity = {
      integrity: 0,
      condition: CAR_CONDITION.DESTROYED,
      respawnRemaining: DEBUG_RESPAWN_SECONDS,
    };
    this.pendingExplosions.push({ position: player.state.position, intensity: 1, leaveBurnMark: true });
    // this.cameraImpulse.punchExplosion();
    const playerIndex = this.field.racers.findIndex(racer => racer.isPlayer);
    this.pendingScraps.push({
      racerIndex: playerIndex,
      position: player.state.position,
      impactSpeed: 80,
      exploded: true,
    });
  }

  /** Puts the whole field back on the grid and restarts the countdown. */
  private respawn(): void {
    this.field.reset();
    this.quitedTheRace = false;
    this.cameraDirector.resetToDefault();
    this.cameraImpulse.cancelHold();
    this.command = IDLE_INPUT;
    this.pendingExplosions = [];
    this.pendingScraps = [];
    this.loop.reset();
    this.tyreMarks.clear();
    this.explosions.clear();
    this.scraps.clear();
    this.wood.clear();
    this.audio.reset();
    this.field.racers.forEach((racer, index) => {
      this.views[index]?.setVisible(true);
      this.views[index]?.sync(racer.state);
    });
    this.chaseCamera.snapTo(this.followedRacer().state, this.targetZoom());
    this.rebuildNarrator();
  }

  /**
   * Rolls every line this race will speak, then preloads those files.
   *
   * Banter is pinned to the clock of the three laps. Damage / weapons /
   * behind keep shuffled index pools and fire when the world does the thing.
   */
  private rebuildNarrator(): void {
    const plan = planNarratorRace({
      lapCount: this.track.laps,
      parSeconds: this.trackLines?.parTime ?? 50,
    });
    this.narrator = new NarratorDirector(plan);
    this.audio.armNarrator(clipsInPlan(plan));
    this.lastTurboCount = 0;
    this.lastLeaderId = this.field.race.standings[0]?.carId;
    this.lastPlayerHits = { ...this.field.playerWeaponHits };
    this.lastPlayerFinished = false;
    this.impactThisFrame = false;
    this.weaponThisFrame = false;
    this.wrongWayHold = 0;
  }

  private tickNarrator(deltaSeconds: number): void {
    if (this.narrator === undefined) {
      return;
    }
    const spectator = this.watch || this.quitedTheRace;
    const focus = spectator ? this.followedRacer() : this.player;
    const race = this.field.race;
    const standing = this.field.standingOf(focus.carId, focus.gridIndex);
    const position = standing?.position ?? this.field.racers.length;
    const humanRace = race.racers.find(racer => racer.racerIndex === this.player.gridIndex)
      ?? race.racers.find(racer => racer.carId === this.carId);
    const humanFinished = this.player.isPlayer && humanRace?.progress.finished === true;
    const turboCount = this.field.racers.filter(racer => racer.turboRemaining > 0).length;
    const leaderId = race.standings[0]?.carId;
    const becameLeader =
      leaderId !== undefined &&
      this.lastLeaderId !== undefined &&
      leaderId !== this.lastLeaderId &&
      race.phase === RACE_PHASE.RACING;
    const impactJustHappened = this.impactThisFrame || focus.pendingImpactSpeed > 6;

    if (this.isFocusWrongWay(focus)) {
      this.wrongWayHold += deltaSeconds;
    } else {
      this.wrongWayHold = 0;
    }

    const offer = this.narrator.update({
      phase: race.phase,
      countdownRemaining: race.countdownRemaining,
      elapsedSeconds: race.elapsedSeconds,
      playerLap: (standing?.lapsCompleted ?? 0) + 1,
      totalLaps: this.track.laps,
      lapFraction: this.lapFractionOf(focus),
      playerPosition: position,
      totalRacers: this.field.racers.length,
      playerFinished: !spectator && humanFinished && !this.lastPlayerFinished,
      turboJustStarted: turboCount > this.lastTurboCount,
      impactJustHappened,
      weaponJustHappened: this.weaponThisFrame,
      wrongWay: this.wrongWayHold >= 0.7,
      becameLeader,
    });
    if (offer !== undefined) {
      this.audio.enqueueNarrator(offer.clip, offer.priority);
    }

    this.lastTurboCount = turboCount;
    this.lastLeaderId = leaderId;
    this.lastPlayerHits = { ...this.field.playerWeaponHits };
    this.lastPlayerFinished = humanFinished;
    this.impactThisFrame = false;
    this.weaponThisFrame = false;
  }

  private lapFractionOf(racer: RacerRuntime): number {
    if (this.spline.totalLength <= 0) {
      return 0;
    }
    const along = this.spline.wrap(racer.distance - this.track.startLineDistance);
    return along / this.spline.totalLength;
  }

  private isFocusWrongWay(racer: RacerRuntime): boolean {
    const telemetry = racer.telemetry;
    if (telemetry === null || telemetry.forwardSpeed < 6) {
      return false;
    }
    const tangent = this.spline.frameAt(racer.distance).tangent;
    return dot(fromAngle(racer.state.heading), tangent) < -0.25;
  }

  private refreshOverlay(): void {
    const player = this.followedRacer();
    this.overlay.update({
      carName: findCarSheet(this.manifest, player.carId).displayName,
      trackName: this.track.displayName,
      telemetry: player.telemetry,
      lateralOffset: player.lateralOffset,
      halfWidth: this.track.halfWidth,
      reversing: this.command.reverse > 0,
      // The camera's ACTUAL zoom, not `targetZoom()`: the smoothing means the two differ
      // for most of a lap, and the number worth reading is the one on screen.
      zoom: this.cameras.main.zoom,
      muted: this.audio.isMuted,
      spriteFrame: this.playerView()?.sprite.frame.name ?? '0',
      aiLines: this.aiOverlayLines(),
    });
  }

  private aiOverlayLines(): readonly string[] {
    const header = this.debugIaHeaderLines();
    const npcs = this.field.npcNames();
    if (npcs.length === 0) {
      return header;
    }
    const focus = npcs[this.aiFocusIndex % npcs.length];
    if (focus === undefined) {
      return header;
    }
    const snapshot = this.field.aiDebug(focus.carId, focus.gridIndex);
    if (snapshot === undefined) {
      return [...header, `NPC ${focus.name} — no AI snapshot`];
    }
    return [...header, ...formatAiOverlay(snapshot)];
  }

  private debugIaHeaderLines(): readonly string[] {
    if (!this.debugIa) {
      return [];
    }
    const planet = planetForTrackId(this.trackId);
    const terrain = planet?.terrain;
    const leader = this.field.race.standings[0];
    const leaderName = leader ? this.pilotNames[leader.carId] ?? leader.carId : '-';
    const terrainLine = terrain
      ? `TERRA  straight ${terrain.straightBias.toFixed(2)}  tight ${terrain.cornerTightness.toFixed(2)}  grip ${terrain.surfaceGrip.toFixed(2)}  hw ${terrain.halfWidth}`
      : `TERRA  surfGrip ${(this.track.surfaceGrip ?? 1).toFixed(2)}  hw ${this.track.halfWidth}`;
    const mix = this.debugIaMix
      ? `  mix ${this.debugIaMix.experts}:${this.debugIaMix.mediums}:${this.debugIaMix.bobos}`
      : '';
    return [
      `DEBUG-IA  ${this.track.displayName}  ${this.field.racers.length} NPC  cam ${Math.round(DEBUG_IA_CAMERA_MAP_FRACTION * 100)}% map  seed ${this.debugIaSeed}${mix}`,
      terrainLine,
      `LEADER  ${leaderName}  zoom ${this.cameras.main.zoom.toFixed(2)}  t ${this.field.race.elapsedSeconds.toFixed(1)}s  fps ${this.game.loop.actualFps.toFixed(0)}`,
      `LAYERS  1–7 hide  hidden [${[...this.paintHidden].join(' ') || 'none'}]`,
      '',
    ];
  }

  private tickDebugIaLog(deltaSeconds: number): void {
    if (!this.debugIa) {
      return;
    }
    this.debugIaLogElapsed += deltaSeconds;
    this.publishDebugIaWindow();
    if (this.debugIaLogElapsed < DEBUG_IA_LOG_INTERVAL_SECONDS) {
      return;
    }
    this.debugIaLogElapsed = 0;
    void postDebugIaLogs(this.debugIaLogEntries());
  }

  private togglePaintLayer(id: PaintLayerId): void {
    if (this.paintHidden.has(id)) {
      this.paintHidden.delete(id);
    } else {
      this.paintHidden.add(id);
    }
    traceLayer(`hide ${id}`, 0, this.paintHidden.has(id) ? 'OFF' : 'ON');
    this.applyPaintVisibility();
    dumpDisplayList(this);
  }

  private applyPaintVisibility(): void {
    const fillOn = !this.paintHidden.has('fill');
    const tileOn = !this.paintHidden.has('tile');
    const roadOn = !this.paintHidden.has('road');
    this.trackRenderer.setTerrainVisible('fill', fillOn);
    this.trackRenderer.setTerrainVisible('tile', tileOn);
    this.trackRenderer.setTerrainVisible('road', roadOn);
    this.tyreMarks.setVisible(!this.paintHidden.has('tyres'));
    const carsOn = !this.paintHidden.has('cars');
    for (const view of this.views) {
      if (!carsOn) {
        view.setVisible(false);
      }
    }
    const cratesOn = !this.paintHidden.has('crates');
    this.weaponLayer.setVisible(cratesOn);
    if (!cratesOn) {
      for (const sprite of this.missileSprites) {
        sprite.setVisible(false);
      }
      for (const sprite of this.hazardSprites) {
        sprite.setVisible(false);
      }
    }
    this.explosions.setVisible(!this.paintHidden.has('fx'));
  }

  private tickFpsLog(deltaSeconds: number): void {
    this.fpsLogElapsed += deltaSeconds;
    if (this.fpsLogElapsed < 2) {
      return;
    }
    this.fpsLogElapsed = 0;
    logFps(this, `hidden=[${[...this.paintHidden].join(',') || 'none'}]`);
  }

  private debugIaLogEntries(): { file: string; line: string }[] {
    const elapsed = this.field.race.elapsedSeconds;
    const planet = planetForTrackId(this.trackId);
    const terrain = planet?.terrain;
    const leaderId = this.field.race.standings[0]?.carId ?? '-';
    const onTarmac = (offset: number) => Math.abs(offset) <= this.track.halfWidth;
    return this.field.racers.map(racer => {
      const standing = this.field.standingOf(racer.carId, racer.gridIndex);
      const snapshot = this.field.aiDebug(racer.carId, racer.gridIndex);
      const name = this.pilotNames[racer.carId] ?? racer.carId;
      const file = debugIaLogFileName(name, racer.carId);
      const line = [
        `t=${elapsed.toFixed(2)}`,
        `pos=${standing?.position ?? '?'}/${this.field.racers.length}`,
        `lap=${standing?.lapsCompleted ?? 0}/${this.track.laps}`,
        `dist=${racer.distance.toFixed(1)}`,
        `spd=${(racer.telemetry?.speed ?? 0).toFixed(1)}`,
        `lat=${racer.lateralOffset.toFixed(2)}`,
        `surf=${onTarmac(racer.lateralOffset) ? 'TARMAC' : 'DIRT'}`,
        `integ=${racer.integrity.integrity.toFixed(2)}`,
        `cond=${racer.integrity.condition}`,
        `intent=${snapshot?.intention ?? '-'}`,
        `atk=${snapshot?.attackMethod ?? '-'}`,
        `tgt=${snapshot?.targetId ?? '-'}`,
        `exec=${snapshot?.execution ?? '-'}`,
        `profile=${snapshot?.profile.id ?? name.toLowerCase()}`,
        `tier=${snapshot?.profile.tier ?? '-'}`,
        `leader=${leaderId}`,
        `zoom=${this.cameras.main.zoom.toFixed(3)}`,
        terrain
          ? `terra=${terrain.straightBias.toFixed(2)}/${terrain.cornerTightness.toFixed(2)}/${terrain.surfaceGrip.toFixed(2)}/${terrain.halfWidth}`
          : `terra=-`,
      ].join(' ');
      return { file, line };
    });
  }

  private publishDebugIaWindow(): void {
    if (typeof window === 'undefined' || !this.debugIa || this.field === undefined) {
      return;
    }
    const payload = {
      seed: this.debugIaSeed,
      trackId: this.trackId,
      cameraFraction: DEBUG_IA_CAMERA_MAP_FRACTION,
      zoom: this.cameras.main.zoom,
      elapsed: this.field.race.elapsedSeconds,
      seats: this.debugIaSeats,
      standings: this.field.race.standings.map(entry => ({
        position: entry.position,
        carId: entry.carId,
        name: this.pilotNames[entry.carId] ?? entry.carId,
        laps: entry.lapsCompleted,
      })),
    };
    (window as Window & { __DEBUG_IA?: unknown }).__DEBUG_IA = payload;
  }

  private playerView(): VehicleView | undefined {
    const followed = this.followedRacer();
    const index = this.field.racers.findIndex(racer => racer.carId === followed.carId);
    return index < 0 ? undefined : this.views[index];
  }

  /**
   * Phaser hands out `null` for `input.keyboard` when the Keyboard plugin is off.
   * Without this the car would simply never move, with nothing on screen to say why.
   */
  private requireKeyboard(): Phaser.Input.Keyboard.KeyboardPlugin {
    const keyboard = this.input.keyboard;
    if (keyboard === null || keyboard === undefined) {
      throw new Error('RaceScene needs the Phaser Keyboard plugin, but it is not available');
    }
    return keyboard;
  }

  private releaseResources(): void {
    // Stopped explicitly: a HUD left running would be launched a second time on
    // the next `create` and stack another copy of itself.
    this.scene.stop(SCENE_KEY.HUD);
    this.driver.destroy();
    this.audio.destroy();
    for (const view of this.views) {
      view.destroy();
    }
    this.views = [];
    this.weaponLayer.destroy();
    for (const image of this.missileSprites) {
      image.destroy();
    }
    this.missileSprites = [];
    for (const image of this.hazardSprites) {
      image.destroy();
    }
    this.hazardSprites = [];
    this.tyreMarks.destroy();
    this.hitRewards.destroy();
    this.scraps.destroy();
    this.wood.destroy();
    this.explosions.destroy();
    this.trackRenderer.destroy();
    this.overlay.destroy();
  }
}
