import Phaser from 'phaser';
import { FixedStepLoop } from '../app/FixedStepLoop.ts';
import { RaceAudio } from '../adapters/audio/RaceAudio.ts';
import { KeyboardDriver } from '../adapters/input/KeyboardDriver.ts';
import { CameraZoomPolicy } from '../adapters/render/CameraZoomPolicy.ts';
import { ChaseCamera } from '../adapters/render/ChaseCamera.ts';
import { ExplosionEffect } from '../adapters/render/ExplosionEffect.ts';
import type { HudReadout } from '../adapters/render/HudFormat.ts';
import { IsoProjection } from '../adapters/render/IsoProjection.ts';
import { TrackRenderer } from '../adapters/render/TrackRenderer.ts';
import { TuningOverlay } from '../adapters/render/TuningOverlay.ts';
import { TyreMarks } from '../adapters/render/TyreMarks.ts';
import { VehicleView } from '../adapters/render/VehicleView.ts';
import { findCarSheet } from '../data/cars/CarManifest.ts';
import type { CarSetManifest } from '../data/cars/CarManifest.ts';
import { findTrack } from '../data/tracks/registry.ts';
import { SIMULATION_STEP_SECONDS } from '../domain/constants.ts';
import type { InputCommand } from '../domain/input/InputCommand.ts';
import { IDLE_INPUT } from '../domain/input/InputCommand.ts';
import { dot, fromAngle } from '../domain/math/Vec2.ts';
import type { Vec2 } from '../domain/math/Vec2.ts';
import { assignNpcCars } from '../domain/race/CarAssignment.ts';
import { RaceField } from '../domain/race/RaceField.ts';
import type { RacerEntry, RacerRuntime } from '../domain/race/RaceField.ts';
import type { TrackDefinition } from '../domain/track/TrackDefinition.ts';
import { TrackSpline } from '../domain/track/TrackSpline.ts';
import { CAR_CONDITION } from '../domain/vehicle/CarIntegrity.ts';
import { DEFAULT_TRACK_ID, PLAYER_CAR_ID, SCENE_KEY } from './sceneKeys.ts';

/** Milliseconds → seconds, for Phaser's `update` delta. */
const MILLISECONDS_PER_SECOND = 1000;

/**
 * How far ahead the camera reads the track to decide its zoom.
 *
 * Expressed in seconds of travel rather than units, so the camera starts opening
 * up for a corner at the same *time* before it regardless of speed — which is what
 * a driver needs. Floored so a stationary car still sees the corner it is facing.
 */
const ZOOM_LOOK_AHEAD_SECONDS = 1.1;
const ZOOM_LOOK_AHEAD_MINIMUM_UNITS = 25;

/**
 * Arc length the curvature is averaged over for the camera, world units.
 *
 * Wider than `curvatureAt`'s default local-segment span on purpose (decision 10):
 * the camera should respond to "there is a corner here", not to every wobble of the
 * spline, and a twitching zoom is worse than no zoom at all.
 */
const ZOOM_CURVATURE_SPAN_UNITS = 45;

/**
 * The camera's zoom is quantised to multiples of this.
 *
 * The adaptive policy (T-020) produces a continuous value between 1.5 and 2.0, but the
 * cars are pre-rendered 64 px sprites: a zoom that drifts every frame resamples them
 * every frame, which reads as a shimmer along the car's edges. Snapping to 0.5 parks the
 * car at one of two stable scales and confines any resampling to the transition between
 * them, which `zoomSmoothingSeconds` already spreads over about 0.6 s.
 */
const CAMERA_ZOOM_STEP = 0.5;

/**
 * How many cars line up, the player included.
 *
 * Five is the whole roster, which is what makes `assignNpcCars` a straight selection
 * with no duplicates: the player takes one car and the NPCs take the other four.
 */
const RACER_COUNT = 5;

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
  /**
   * Which car the player drives. Absent on the first entry from `BootScene`; set when
   * the scene restarts itself to swap cars, and eventually by the car select (T-018).
   */
  readonly carId?: string;
}

/** One explosion waiting to be presented, queued inside a simulation step. */
interface PendingExplosion {
  readonly position: Vec2;
  readonly intensity: number;
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
  private carId: string = PLAYER_CAR_ID;
  private track!: TrackDefinition;
  private spline!: TrackSpline;
  private projection!: IsoProjection;
  private trackRenderer!: TrackRenderer;
  private tyreMarks!: TyreMarks;
  private explosions!: ExplosionEffect;
  private chaseCamera!: ChaseCamera;
  private zoomPolicy!: CameraZoomPolicy;
  private driver!: KeyboardDriver;
  private loop!: FixedStepLoop;
  private audio!: RaceAudio;
  private overlay!: TuningOverlay;
  private field!: RaceField;
  /** One view per racer, index-aligned with `field.racers`. */
  private views: VehicleView[] = [];
  private command: InputCommand = IDLE_INPUT;
  private pendingExplosions: PendingExplosion[] = [];

  constructor() {
    super(SCENE_KEY.RACE);
  }

  init(data: RaceSceneData): void {
    this.manifest = data.manifest;
    this.carId = data.carId ?? PLAYER_CAR_ID;
  }

  create(): void {
    this.track = findTrack(DEFAULT_TRACK_ID);
    this.spline = new TrackSpline(this.track.controlPoints);

    // One number ties sprites and road together (locked decision 3): the scale the
    // sprite generator measured the whole car set at. Hard-coding a road width here
    // would make the cars quietly the wrong size relative to the track.
    this.projection = new IsoProjection(this.manifest.pixelsPerUnit);

    this.trackRenderer = new TrackRenderer(this, this.track, this.spline, this.projection);
    this.tyreMarks = new TyreMarks(this, this.projection);
    this.explosions = new ExplosionEffect(this, this.projection);
    this.chaseCamera = new ChaseCamera(this.cameras.main, this.projection);
    this.zoomPolicy = new CameraZoomPolicy({ zoomStep: CAMERA_ZOOM_STEP });
    this.driver = new KeyboardDriver(this.requireKeyboard());
    this.loop = new FixedStepLoop(SIMULATION_STEP_SECONDS);
    this.audio = new RaceAudio(this.playerSheetStats());

    this.field = new RaceField(this.buildEntries(), this.track, this.spline);
    this.views = this.field.racers.map(racer =>
      new VehicleView(this, this.manifest, findCarSheet(this.manifest, racer.carId), this.projection),
    );

    const bounds = this.trackRenderer.bounds;
    this.cameras.main.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);

    this.overlay = new TuningOverlay(this, this.cameras.main);

    this.bindSceneKeys();
    this.respawn();

    // The HUD is its own scene deliberately (decision 25): launched over this one, it
    // gets a camera at zoom 1 so screen pixels stay screen pixels. `launch` rather than
    // `start`, because this scene must keep running underneath it.
    this.scene.launch(SCENE_KEY.HUD);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.releaseResources());
  }

  update(_time: number, deltaMilliseconds: number): void {
    const deltaSeconds = deltaMilliseconds / MILLISECONDS_PER_SECOND;

    // The command is read once per rendered frame rather than per simulation step:
    // the keyboard cannot change between two steps of the same frame anyway, and it
    // keeps every step of a frame perfectly reproducible. The driver needs the
    // current forward speed because Down means "brake" while rolling and "reverse"
    // once stopped (decision 18).
    this.command = this.driver.read(deltaSeconds, this.forwardSpeed());
    this.loop.advance(deltaSeconds, stepSeconds => this.stepSimulation(stepSeconds));

    this.syncViews();
    // Once per frame, whatever the number of cars: ageing marks is a property of time
    // passing. Calling it per car aged them five times too fast.
    this.tyreMarks.update(deltaSeconds);
    this.presentExplosions();
    this.updatePlayerAudio();
    this.explosions.update(deltaSeconds);
    this.chaseCamera.follow(this.player.state, deltaSeconds, this.targetZoom());
    this.refreshOverlay();
  }

  /**
   * Everything the HUD needs, assembled once per frame.
   *
   * The HUD is a separate scene that pulls this rather than being pushed to, which
   * keeps the race loop free of any knowledge of what is on screen.
   */
  hudReadout(): HudReadout {
    const player = this.player;
    const standing = this.field.standingOf(player.carId);
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
      // Ammo is full until the weapon system exists (T-016). Reporting the capacity
      // rather than a hard-coded number means the HUD is already correct per car —
      // battle-trak carries 15 rounds where air-blade carries 4.
      ammo: player.stats.ammoCapacity,
      ammoCapacity: player.stats.ammoCapacity,
      integrity: player.integrity.integrity,
      standings: race.standings.map(entry => ({
        carId: entry.carId,
        position: entry.position,
      })),
      speed: player.telemetry?.speed ?? 0,
      maxSpeed: player.stats.maxSpeed,
    };
  }

  /** The standings with display names rather than ids, for the HUD's list. */
  standingsWithNames(): readonly { readonly name: string; readonly position: number }[] {
    return this.field.race.standings.map(entry => ({
      name: findCarSheet(this.manifest, entry.carId).displayName,
      position: entry.position,
    }));
  }

  /**
   * One 60 Hz simulation step for the whole field. Every rule lives in `RaceField`;
   * all this does is notice what the presentation layer owes the player as a result.
   */
  private stepSimulation(stepSeconds: number): void {
    this.field.step(this.command, stepSeconds);

    // Collected here rather than in `update`, because `explodedThisStep` is true for
    // one step only and a frame can contain several steps.
    for (const racer of this.field.racers) {
      if (racer.explodedThisStep) {
        this.pendingExplosions.push({
          position: racer.state.position,
          intensity: this.explosionIntensity(racer),
        });
      }
    }
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

      view.sync(racer.state);
      if (racer.telemetry !== null) {
        // Per-car index: `TyreMarks` keeps a wheel trail per car, and sharing one
        // would join two cars' wheels with a streak across the track.
        this.tyreMarks.record(index, racer.state, racer.telemetry);
      }
    });
  }

  private presentExplosions(): void {
    for (const explosion of this.pendingExplosions) {
      this.explosions.burst(explosion.position, explosion.intensity);
      this.audio.playExplosion(explosion.intensity);
    }
    this.pendingExplosions = [];
  }

  /**
   * The engine, tyres and impacts the player can hear are their own car's.
   *
   * Only the player's impacts are voiced: five cars scraping walls at once would be a
   * wash of noise that tells the driver nothing about their own race.
   */
  private updatePlayerAudio(): void {
    const player = this.player;
    const maxSpeed = player.stats.maxSpeed;

    if (player.telemetry !== null) {
      this.audio.update(player.telemetry, this.command, maxSpeed);
    }

    const impact = this.field.drainImpact(player);
    if (impact > 0) {
      this.audio.playImpact(impact, maxSpeed);
    }
    // Every other car's impact is drained and discarded, or it would accumulate
    // forever and then fire as one enormous hit the moment anything read it.
    for (const racer of this.field.racers) {
      if (!racer.isPlayer) {
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
   * That is a gameplay choice, not an accident — starting on pole in a five-car
   * arcade race means driving away from everyone and never seeing another car.
   */
  private buildEntries(): readonly RacerEntry[] {
    const rosterIds = this.manifest.cars.map(car => car.id);
    const npcIds = assignNpcCars(rosterIds, this.carId, RACER_COUNT - 1);

    // The perk travels with the car, for the NPCs exactly as for the player: an advantage
    // the player can feel is an advantage they must also race against.
    const npcs = npcIds.map(carId => {
      const sheet = findCarSheet(this.manifest, carId);
      return { carId, stats: sheet.stats, perk: sheet.perk, isPlayer: false };
    });

    const player = findCarSheet(this.manifest, this.carId);
    return [...npcs, { carId: this.carId, stats: player.stats, perk: player.perk, isPlayer: true }];
  }

  private playerSheetStats() {
    return findCarSheet(this.manifest, this.carId).stats;
  }

  /** Zoom in on a fast straight, out for a corner (decision 21). */
  private targetZoom(): number {
    const player = this.player;
    const speed = player.telemetry?.speed ?? 0;
    const lookAhead = Math.max(
      ZOOM_LOOK_AHEAD_MINIMUM_UNITS,
      speed * ZOOM_LOOK_AHEAD_SECONDS,
    );
    const curvature = this.spline.curvatureAt(
      player.distance + lookAhead,
      ZOOM_CURVATURE_SPAN_UNITS,
    );
    return this.zoomPolicy.targetZoom(speed, player.stats.maxSpeed, curvature);
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

    // R restarts the race. Cheap to add, and the alternative while tuning handling is
    // reloading the page after every mistake.
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R).on('down', () => this.respawn());
    keyboard
      .addKey(Phaser.Input.Keyboard.KeyCodes.M)
      .on('down', () => this.audio.setMuted(!this.audio.isMuted));

    // T hides the overlay, for looking at the game rather than at the numbers.
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T).on('down', () => this.overlay.toggle());

    // C cycles the player's car. Driving all five back to back is the only way to judge
    // whether the stat sets actually feel different, which is T-012's gate.
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C).on('down', () => this.cycleCar());

    // X wrecks the player's own car on demand. This is a debug aid and it earns its
    // place: destruction is otherwise reachable only by crashing hard enough, which
    // makes the explosion, the respawn and the integrity bar tedious to look at while
    // they are being tuned. It only ever harms the car of whoever pressed it.
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X).on('down', () => this.wreckPlayer());

    // Browsers start every AudioContext suspended and only honour a resume that
    // comes from a real user gesture, so the first key press is the earliest the
    // engine can be heard. `resume()` is a no-op once it has taken.
    keyboard.on('keydown', () => this.audio.resume());
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
    this.pendingExplosions.push({ position: player.state.position, intensity: 1 });
  }

  /** Puts the whole field back on the grid and restarts the countdown. */
  private respawn(): void {
    this.field.reset();
    this.command = IDLE_INPUT;
    this.pendingExplosions = [];
    this.loop.reset();
    this.tyreMarks.clear();
    this.explosions.clear();
    this.audio.reset();
    this.field.racers.forEach((racer, index) => {
      this.views[index]?.setVisible(true);
      this.views[index]?.sync(racer.state);
    });
    this.chaseCamera.snapTo(this.player.state, this.targetZoom());
  }

  /**
   * Restarts the scene on the next car in the manifest.
   *
   * A restart rather than an in-place swap: `BootScene` has already loaded every car's
   * sprite sheet, so nothing needs fetching, and the existing SHUTDOWN hook already tears
   * down the audio graph and the views. Teaching `VehicleView` and `RaceAudio` to change
   * car mid-life would add two stateful paths that exist only for a tuning convenience.
   */
  private cycleCar(): void {
    const cars = this.manifest.cars;
    const current = cars.findIndex(car => car.id === this.carId);
    const next = cars[(current + 1) % cars.length];
    if (next === undefined) {
      return;
    }
    this.scene.restart({ manifest: this.manifest, carId: next.id } satisfies RaceSceneData);
  }

  private refreshOverlay(): void {
    const player = this.player;
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
    });
  }

  private playerView(): VehicleView | undefined {
    const index = this.field.racers.findIndex(racer => racer.isPlayer);
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
    // Stopped explicitly: `C` restarts this scene, and a HUD left running would be
    // launched a second time on the next `create` and stack another copy of itself.
    this.scene.stop(SCENE_KEY.HUD);
    this.driver.destroy();
    this.audio.destroy();
    for (const view of this.views) {
      view.destroy();
    }
    this.views = [];
    this.tyreMarks.destroy();
    this.explosions.destroy();
    this.trackRenderer.destroy();
    this.overlay.destroy();
  }
}
