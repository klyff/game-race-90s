import { RACE_PHASE } from '../constants.ts';
import type { InputCommand } from '../input/InputCommand.ts';
import { IDLE_INPUT } from '../input/InputCommand.ts';
import { add, angleOf, dot, length, normalize, scale, subtract, VEC2_ZERO } from '../math/Vec2.ts';
import type { Vec2 } from '../math/Vec2.ts';
import { resolveWallContact } from '../track/TrackCollision.ts';
import type { TrackDefinition } from '../track/TrackDefinition.ts';
import { trackFullHalfWidth } from '../track/TrackDefinition.ts';
import type { TrackSpline } from '../track/TrackSpline.ts';
import { resolveCarContact } from '../vehicle/CarCollision.ts';
import {
  applyImpactDamage,
  applyWeaponDamage,
  CAR_CONDITION,
  createCarIntegrity,
  DAMAGE_ROLE,
  tickIntegrity,
} from '../vehicle/CarIntegrity.ts';
import type { CarIntegrity, DamageRole } from '../vehicle/CarIntegrity.ts';
import {
  contactStats,
  drivingStats,
  homeWorldStats,
  perkDamageMultiplier,
  perkDealtDamageMultiplier,
  perkProfile,
  perkSurface,
} from '../vehicle/CarPerk.ts';
import type { CarPerkProfile } from '../vehicle/CarPerk.ts';
import type { CarPerkId } from '../constants.ts';
import { PaceDriver } from '../vehicle/PaceDriver.ts';
import { AIDriver } from '../vehicle/AIDriver.ts';
import type { RivalView } from '../vehicle/AIDriver.ts';
import { findLineForCar } from './RacingLine.ts';
import type { TrackLinesManifest } from './RacingLine.ts';
import { createVehicleState, isAirborne } from '../vehicle/Vehicle.ts';
import type { VehicleState, VehicleTelemetry } from '../vehicle/Vehicle.ts';
import {
  consumeJump,
  createJumpCharges,
  hopLaunchSpeed,
  refillJumpCharges,
} from '../vehicle/JumpCharges.ts';
import type { VehicleStats } from '../vehicle/VehicleStats.ts';
import { decideMissileAim } from '../weapons/WeaponAim.ts';
import {
  MISSILE_RAW_DAMAGE,
  NPC_MINE_DROP_GAP_UNITS,
  NPC_OIL_DROP_GAP_UNITS,
  NPC_WEAPON_COOLDOWN_SECONDS,
  OIL_LAP_REFERENCE_SPEED,
  OIL_LIFETIME_LAPS,
} from '../weapons/WeaponConstants.ts';
import {
  ageHazards,
  dropMine,
  dropOil,
  findHazardHits,
  HAZARD_KIND,
  oilYawSpinForArmor,
} from '../weapons/Hazard.ts';
import type { TrackHazard } from '../weapons/Hazard.ts';
import { findMissileHit, launchMissile, stepMissile } from '../weapons/Missile.ts';
import type { Missile } from '../weapons/Missile.ts';
import {
  consumeMine,
  consumeMissile,
  consumeOil,
  createWeaponInventory,
  npcWeaponCooldownSeconds,
  refillWeaponInventory,
} from '../weapons/WeaponInventory.ts';
import type { WeaponInventory } from '../weapons/WeaponInventory.ts';
import { slipstreamFactor } from './Slipstream.ts';
import type { DraftCandidate } from './Slipstream.ts';
import { advanceRace, createRaceState } from './RaceSimulation.ts';
import type { RaceState, RacerStep } from './RaceSimulation.ts';
import type { RacerStanding } from './PositionRanker.ts';
import { buildStartingGrid } from './StartingGrid.ts';
import { stepVehicleOnTrack } from './OnTrackStep.ts';
import { coastInput, isNearlyStopped } from './Coast.ts';

/** What the caller has to say about a car before the race starts. */
export interface RacerEntry {
  readonly carId: string;
  readonly stats: VehicleStats;
  /** Exactly one entry should be the player; the rest are driven by `PaceDriver`. */
  readonly isPlayer: boolean;
  /**
   * This car's one signature advantage, read from `cars.json`. Optional: a car may
   * have none, in which case every perk rule is a no-op against it.
   */
  readonly perk?: CarPerkId;
  readonly homePlanetId?: string;
  readonly worldAdvantage?: number;
}

/**
 * Everything that changes about one car during a race.
 *
 * Mutable on purpose, and the one place in `src/domain/` that is: the render layer
 * reads these objects every frame for five cars at 60 Hz, and rebuilding five frozen
 * records per step only to throw them away would be churn with no safety gained —
 * the rules that decide the values are still pure functions, and this type only
 * *holds* their results.
 */
export interface RacerRuntime {
  readonly carId: string;
  readonly stats: VehicleStats;
  readonly isPlayer: boolean;
  /**
   * The tunables behind this car's signature advantage, resolved once at construction.
   *
   * Resolved here rather than looked up per step because the lookup is by string id and
   * `step` runs five times per car at 60 Hz. Held as the PROFILE, not the id, so no rule
   * downstream has to know how an id becomes numbers.
   */
  readonly perk: CarPerkProfile;
  readonly homePlanetId: string | undefined;
  readonly worldAdvantage: number | undefined;
  /** Grid slot this car started from, 0 = pole. */
  readonly gridIndex: number;
  state: VehicleState;
  /** Null until the car's first simulation step, exactly as `RaceScene` had it. */
  telemetry: VehicleTelemetry | null;
  /** Arc length along the centreline; also the hint that keeps `projectNear` cheap. */
  distance: number;
  /** Signed distance from the centreline, positive left. */
  lateralOffset: number;
  integrity: CarIntegrity;
  /** Missiles, oil and mines this car is carrying (T-046). */
  inventory: WeaponInventory;
  /** Hops remaining this lap. Refills at the finish line. */
  jumps: number;
  /**
   * Hardest contact seen since the presentation layer last read it, world units/s.
   * The scene drains this to trigger the impact sound; the damage rules have
   * already consumed the same number inside `step`.
   */
  pendingImpactSpeed: number;
  /** True for the one step in which this car's integrity reached zero. */
  explodedThisStep: boolean;
  /** True for the one step in which this car came back from a wreck. */
  respawnedThisStep: boolean;
  /**
   * Seconds until this NPC may take another weapon decision. Unused for the player
   * (keyboard is already edge-triggered). Arsenal shortens it via reloadMultiplier.
   */
  weaponCooldownRemaining: number;
}

export interface RaceFieldOptions {
  /** Seconds of held lights before the race starts. */
  readonly countdownSeconds?: number;
  /** Arc length `projectNear` searches either side of the last known distance. */
  readonly projectionWindow?: number;
  /** How far behind the start line pole sits. */
  readonly gridSetbackUnits?: number;
  /** Injectable so a test can pin the NPC driver's tuning. */
  readonly paceDriver?: PaceDriver;
  /**
   * When false, NPCs never fire or drop weapons. Player input is unchanged.
   * Default true. Tests that assert a clean contact-free lap turn this off so
   * missile exchanges on the packed grid do not count as "a dirty lap".
   */
  readonly npcWeapons?: boolean;
  /** Searched racing lines (T-043). When present, NPCs use `AIDriver` + the line. */
  readonly trackLines?: TrackLinesManifest;
  /** Planet this race is on; home-world bonus only applies when it matches. */
  readonly planetId?: string;
}

const DEFAULT_COUNTDOWN_SECONDS = 3;
const DEFAULT_PROJECTION_WINDOW = 20;
const DEFAULT_GRID_SETBACK_UNITS = 14;

/**
 * The whole field of cars for one race, and the order in which a step resolves.
 *
 * This exists so `RaceScene` never owns a rule. The scene draws whatever this
 * reports and feeds it the player's keyboard command; every decision about where a
 * car ends up, whether it scored a lap, who is winning and whether it just blew up
 * is made here, out of Phaser's reach and under test.
 *
 * The step order is the reason this is a class rather than five loose calls in the
 * scene, and it is not interchangeable:
 *
 *  1. every car integrates INDEPENDENTLY (`stepVehicleOnTrack`, walls included)
 *     and may launch weapons from its command; missiles then advance and hit-test;
 *  2. only THEN is car-to-car contact resolved, pair by pair;
 *  3. any car a contact moved is re-checked against the wall;
 *  4. damage is applied from the hardest contact of the step, then weapon hits
 *     and hazard overlaps resolve (oil → yawSpin, mine → destroy, missile → 50%);
 *  5. lap progress and standings advance last; a finish-line crossing refills ammo.
 *
 * Steps 1 and 2 must not interleave. Resolving contact inside the per-car loop
 * would let the first car in the list collide with cars that had already moved this
 * step and cars that had not, which makes the result depend on array order — the
 * same pair of cars would exchange a different impulse depending on who was listed
 * first. Step 3 exists because a contact impulse is free to shove a car sideways
 * through a wall that had already been resolved in step 1. Weapons live INSIDE this
 * order (T-046) rather than beside it, so a missile cannot resolve against a car
 * that has not yet integrated this step.
 */
export class RaceField {
  readonly racers: readonly RacerRuntime[];

  private readonly track: TrackDefinition;
  private readonly spline: TrackSpline;
  private readonly pace: PaceDriver;
  private readonly ai: AIDriver;
  private readonly trackLines: TrackLinesManifest | undefined;
  private readonly countdownSeconds: number;
  private readonly projectionWindow: number;
  private readonly gridSetbackUnits: number;
  private readonly oilLifetimeSeconds: number;
  private readonly npcWeapons: boolean;
  private readonly planetId: string | undefined;
  private raceState: RaceState;
  private missiles: Missile[] = [];
  private hazards: TrackHazard[] = [];
  /** Missile bursts this step (car hit or wall), for the presentation layer. */
  private weaponBursts: Vec2[] = [];
  /** Hazard ids spawned this step — their dropper is immune until the next step. */
  private readonly freshHazardIds = new Set<number>();
  /** Player weapon hits landed on rivals this race (for the purse bounty). */
  private playerHits = { missiles: 0, oil: 0, mines: 0 };


  constructor(
    entries: readonly RacerEntry[],
    track: TrackDefinition,
    spline: TrackSpline,
    options: RaceFieldOptions = {},
  ) {
    if (entries.length === 0) {
      throw new Error('RaceField needs at least one racer');
    }

    this.track = track;
    this.spline = spline;
    this.pace = options.paceDriver ?? new PaceDriver();
    this.ai = new AIDriver(this.pace.options);
    this.trackLines = options.trackLines;
    this.countdownSeconds = options.countdownSeconds ?? DEFAULT_COUNTDOWN_SECONDS;
    this.projectionWindow = options.projectionWindow ?? DEFAULT_PROJECTION_WINDOW;
    this.gridSetbackUnits = options.gridSetbackUnits ?? DEFAULT_GRID_SETBACK_UNITS;
    // Oil lifetime is derived per track: 1.6 × an estimated lap, never a constant.
    this.oilLifetimeSeconds =
      OIL_LIFETIME_LAPS * (this.spline.totalLength / OIL_LAP_REFERENCE_SPEED);
    this.npcWeapons = options.npcWeapons ?? true;
    this.planetId = options.planetId;

    // Grid slots follow entry order, so the caller decides where the player starts by
    // where it puts the player in the list. The scene puts them at the back.
    const grid = buildStartingGrid(entries.length, track, spline, this.gridSetbackUnits);

    // A slippery (or extra-grippy) planet scales every car's grip for this track.
    // Baking it into the stored stats means both the physics step and the AI's
    // corner-speed see the same reduced grip without threading a surface value
    // through every signature.
    const surfaceGrip = track.surfaceGrip ?? 1;

    this.racers = entries.map((entry, index) => {
      const slot = grid[index];
      if (slot === undefined) {
        throw new Error(`starting grid produced no slot for racer ${index}`);
      }
      const stats =
        surfaceGrip === 1
          ? entry.stats
          : { ...entry.stats, grip: entry.stats.grip * surfaceGrip };
      return {
        carId: entry.carId,
        stats,
        isPlayer: entry.isPlayer,
        perk: perkProfile(entry.perk),
        homePlanetId: entry.homePlanetId,
        worldAdvantage: entry.worldAdvantage,
        gridIndex: slot.index,
        state: createVehicleState(slot.position, slot.heading),
        telemetry: null,
        distance: slot.distance,
        lateralOffset: slot.lateralOffset,
        integrity: createCarIntegrity(),
        inventory: createWeaponInventory(perkProfile(entry.perk)),
        jumps: createJumpCharges(),
        pendingImpactSpeed: 0,
        explodedThisStep: false,
        respawnedThisStep: false,
        weaponCooldownRemaining: 0,
      };
    });

    this.raceState = this.freshRaceState();
    this.reset();
  }

  get race(): RaceState {
    return this.raceState;
  }

  /** The car the keyboard drives. Guaranteed to exist: falls back to the first entry. */
  get player(): RacerRuntime {
    const player = this.racers.find(racer => racer.isPlayer);
    return player ?? this.firstRacer();
  }

  get standings(): readonly RacerStanding[] {
    return this.raceState.standings;
  }

  /** Live missiles, for the presentation layer. */
  get activeMissiles(): readonly Missile[] {
    return this.missiles;
  }

  /** Live oil slicks and mines, for the presentation layer. */
  get activeHazards(): readonly TrackHazard[] {
    return this.hazards;
  }

  /** How many of the player's weapons have hit a rival this race. */
  get playerWeaponHits(): { readonly missiles: number; readonly oil: number; readonly mines: number } {
    return this.playerHits;
  }

  /** Missile explosion points from the step just run (car hit or wall). */
  get weaponBurstsThisStep(): readonly Vec2[] {
    return this.weaponBursts;
  }

  /** True once every car is wrecked or rolling slower than the coast stop speed. */
  get allNearlyStopped(): boolean {
    return this.racers.every(
      racer =>
        racer.integrity.condition === CAR_CONDITION.DESTROYED ||
        isNearlyStopped(length(racer.state.velocity)),
    );
  }

  /** Laps completed by one car, for the HUD. */
  standingOf(carId: string): RacerStanding | undefined {
    return this.raceState.standings.find(standing => standing.carId === carId);
  }

  /** Puts every car back on its grid slot at rest and restarts the countdown. */
  reset(): void {
    const grid = buildStartingGrid(this.racers.length, this.track, this.spline, this.gridSetbackUnits);

    this.racers.forEach((racer, index) => {
      const slot = grid[index];
      if (slot === undefined) {
        return;
      }
      racer.state = createVehicleState(slot.position, slot.heading);
      racer.telemetry = null;
      racer.distance = slot.distance;
      racer.lateralOffset = slot.lateralOffset;
      racer.integrity = createCarIntegrity();
      racer.inventory = createWeaponInventory(racer.perk);
      racer.jumps = createJumpCharges();
      racer.pendingImpactSpeed = 0;
      racer.explodedThisStep = false;
      racer.respawnedThisStep = false;
      racer.weaponCooldownRemaining = 0;
    });

    this.missiles = [];
    this.hazards = [];
    this.freshHazardIds.clear();
    this.playerHits = { missiles: 0, oil: 0, mines: 0 };
    this.raceState = this.freshRaceState();
  }

  /**
   * Advances the whole field by one fixed step. See the class comment for why the
   * five stages are in this order.
   */
  step(playerCommand: InputCommand, stepSeconds: number): void {
    const frozen = this.raceState.phase === RACE_PHASE.COUNTDOWN;
    const previousDistances = this.racers.map(racer => racer.distance);
    const previousLaps = this.racers.map(racer => this.standingOf(racer.carId)?.lapsCompleted ?? 0);
    const impacts = this.racers.map(() => 0);
    /**
     * Who is to blame for each car's HARDEST contact this step.
     *
     * The role has to travel with the impact that won, not be accumulated separately:
     * a car can shunt a rival and then hit a wall in the same step, and only one of
     * those two events is the one it takes damage from. `recordImpact` keeps the pair
     * consistent by only overwriting the role when a bigger impact arrives.
     */
    const roles: DamageRole[] = this.racers.map(() => DAMAGE_ROLE.VICTIM);
    /**
     * Outgoing ram scale from the OTHER car on the hardest contact this step.
     * Walls leave this at 1; only a car-to-car hit can raise it.
     */
    const dealtScales = this.racers.map(() => 1);
    /** Cars a contact impulse moved, which therefore need a second wall check. */
    const nudged = this.racers.map(() => false);
    const stepped: RacerStep[] = [];
    /** Missile hits queued during stage 1, applied in stage 4 with contact damage. */
    const missileHits: { targetIndex: number; ownerCarId: string; position: Vec2 }[] = [];
    this.freshHazardIds.clear();
    this.weaponBursts = [];

    const recordImpact = (index: number, speed: number, role: DamageRole, dealtScale = 1): void => {
      if (speed <= (impacts[index] ?? 0)) {
        return;
      }
      impacts[index] = speed;
      roles[index] = role;
      dealtScales[index] = dealtScale;
    };

    // 1. Every car integrates on its own, against the track only — and may fire.
    this.racers.forEach((racer, index) => {
      racer.explodedThisStep = false;
      racer.respawnedThisStep = false;
      if (racer.weaponCooldownRemaining > 0) {
        racer.weaponCooldownRemaining = Math.max(0, racer.weaponCooldownRemaining - stepSeconds);
      }

      if (racer.integrity.condition === CAR_CONDITION.DESTROYED) {
        this.sitOutWreck(racer, stepSeconds);
        return;
      }

      const speedBefore = length(racer.state.velocity);
      const finished = this.standingOf(racer.carId)?.finished === true;
      const command = frozen
        ? IDLE_INPUT
        : finished
          ? coastInput(speedBefore)
          : this.commandFor(racer, playerCommand, stepSeconds);

      if (!frozen) {
        this.resolveWeaponCommand(racer, command);
        this.resolveHopCommand(racer, command);
      }

      // Perks enter as DERIVED values, never as a special case inside the physics: the
      // stats this one step is driven with, and an adjustment to whatever surface the
      // track picks. Both are recomputed every step from the current field, so nothing
      // is cached and nothing can go stale — the trap that produced T-039.
      const draft = this.draftFor(racer);
      const worlded = homeWorldStats(
        racer.stats,
        racer.homePlanetId,
        racer.worldAdvantage,
        this.planetId,
      );
      const stats = drivingStats(worlded, racer.perk, command.brake > 0, draft);
      const step = stepVehicleOnTrack(
        racer.state,
        command,
        stats,
        this.track,
        this.spline,
        racer.distance,
        this.projectionWindow,
        stepSeconds,
        surface => perkSurface(surface, racer.perk),
      );

      racer.state = step.state;
      racer.telemetry = step.telemetry;
      racer.distance = step.distance;
      racer.lateralOffset = step.lateralOffset;

      if (step.touchedWall) {
        // Damage is driven by the SPEED THE CRASH COST, not by `impactSpeed` alone.
        // `resolveWallContact` reports only the component normal to the wall, and
        // measurement showed that is nearly always tiny: real driving glances off
        // walls tangentially, so a threshold on the normal component was crossed once
        // or twice a lap and no car could ever be destroyed (T-033). Total speed lost
        // in the step catches the case the normal component misses — grinding a wall
        // at 70 u/s wrecks a car, which is what it should do — and it is only read
        // when the wall was actually touched, so braking never counts as a crash.
        const speedLost = speedBefore - length(step.state.velocity);
        // Always the victim: a car that hits a wall is the victim of its own crash.
        recordImpact(index, Math.max(step.impactSpeed, speedLost), DAMAGE_ROLE.VICTIM);
      }

      const previous = previousDistances[index];
      if (previous !== undefined) {
        stepped.push({
          carId: racer.carId,
          previousDistance: previous,
          currentDistance: step.distance,
        });
      }
    });

    // 1b. Missiles fly in a straight line and hit-test against the just-moved field.
    if (!frozen) {
      const targets = this.racers
        .filter(racer => this.canCollide(racer) && !isAirborne(racer.state))
        .map(racer => ({
          carId: racer.carId,
          position: racer.state.position,
          radius: racer.stats.collisionRadius,
        }));

      const surviving: Missile[] = [];
      for (const missile of this.missiles) {
        const advanced = stepMissile(missile, stepSeconds);
        if (advanced === null) {
          continue;
        }
        const hit = findMissileHit(advanced, targets);
        if (hit === null) {
          const projection = this.spline.project(advanced.position);
          const wallLimit = trackFullHalfWidth(this.track) - advanced.radius;
          if (Math.abs(projection.lateralOffset) > wallLimit) {
            this.weaponBursts.push(advanced.position);
            continue;
          }
          surviving.push(advanced);
          continue;
        }
        const targetIndex = this.racers.findIndex(racer => racer.carId === hit.targetCarId);
        if (targetIndex >= 0) {
          missileHits.push({
            targetIndex,
            ownerCarId: hit.ownerCarId,
            position: advanced.position,
          });
          if (hit.ownerCarId === this.player.carId && hit.targetCarId !== this.player.carId) {
            this.playerHits.missiles += 1;
          }
        }
        this.weaponBursts.push(advanced.position);
        // Missile is consumed on hit — if the target dies, both "explode" (stage 4).
      }
      this.missiles = surviving;
    }

    // 2. Car-to-car contact, every unordered pair, after all of them have moved.
    for (let i = 0; i < this.racers.length; i += 1) {
      for (let j = i + 1; j < this.racers.length; j += 1) {
        const a = this.racers[i];
        const b = this.racers[j];
        if (a === undefined || b === undefined || !this.canCollide(a) || !this.canCollide(b)) {
          continue;
        }

        // Contact perks are expressed as EFFECTIVE MASS, so `resolveCarContact` keeps
        // splitting the impulse by reciprocal mass exactly as it always has: a heavier
        // car both shoves harder and is shoved less, which is what "wins contact" and
        // "immovable" mean, and momentum is still conserved for the masses used. The
        // roster's authored mass is never touched — it is shared data from `cars.json`.
        const contact = resolveCarContact(
          a.state,
          contactStats(a.stats, a.perk),
          b.state,
          contactStats(b.stats, b.perk),
        );
        if (!contact.touched) {
          continue;
        }

        // Blame is read BEFORE the impulse is applied, because resolving the contact is
        // exactly what destroys the evidence: afterwards both cars are moving apart and
        // neither looks like the one that closed the gap.
        const aggressor = aggressorOf(a.state, b.state);
        recordImpact(
          i,
          contact.impactSpeed,
          aggressor === CONTACT_SIDE.A ? DAMAGE_ROLE.AGGRESSOR : DAMAGE_ROLE.VICTIM,
          perkDealtDamageMultiplier(b.perk),
        );
        recordImpact(
          j,
          contact.impactSpeed,
          aggressor === CONTACT_SIDE.B ? DAMAGE_ROLE.AGGRESSOR : DAMAGE_ROLE.VICTIM,
          perkDealtDamageMultiplier(a.perk),
        );

        a.state = contact.a;
        b.state = contact.b;
        if (a.perk.contactYawSpin > 0) {
          b.state = {
            ...b.state,
            yawSpin: b.state.yawSpin + oilYawSpinForArmor(b.stats.armor) * a.perk.contactYawSpin,
          };
        }
        if (b.perk.contactYawSpin > 0) {
          a.state = {
            ...a.state,
            yawSpin: a.state.yawSpin + oilYawSpinForArmor(a.stats.armor) * b.perk.contactYawSpin,
          };
        }
        nudged[i] = true;
        nudged[j] = true;
      }
    }

    // 3. A contact can push a car through a wall that was already resolved in stage 1.
    this.racers.forEach((racer, index) => {
      if (!nudged[index]) {
        return;
      }
      const projection = this.spline.projectNear(racer.state.position, racer.distance, this.projectionWindow);
      const wall = resolveWallContact(racer.state, projection, this.track, racer.stats.collisionRadius);
      racer.state = wall.state;
      racer.distance = projection.distance;
      racer.lateralOffset = wall.lateralOffset;
      if (wall.touchedWall) {
        recordImpact(index, wall.impactSpeed, DAMAGE_ROLE.VICTIM);
      }
    });

    // 4. Damage from the hardest contact of the step, once per car — then weapons.
    this.racers.forEach((racer, index) => {
      const impact = impacts[index] ?? 0;
      if (impact <= 0) {
        return;
      }

      racer.pendingImpactSpeed = Math.max(racer.pendingImpactSpeed, impact);

      const before = racer.integrity;
      const role = roles[index] ?? DAMAGE_ROLE.VICTIM;
      racer.integrity = applyImpactDamage(
        before,
        impact,
        racer.stats,
        role,
        perkDamageMultiplier(racer.perk, role) * (dealtScales[index] ?? 1),
      );
      if (
        before.condition !== CAR_CONDITION.DESTROYED &&
        racer.integrity.condition === CAR_CONDITION.DESTROYED
      ) {
        racer.explodedThisStep = true;
        // A wreck stops dead where it blew up; the respawn timer takes it from here.
        racer.state = { ...racer.state, velocity: VEC2_ZERO, yawSpin: 0 };
      }
    });

    for (const hit of missileHits) {
      const racer = this.racers[hit.targetIndex];
      if (racer === undefined || !this.canCollide(racer)) {
        continue;
      }
      const before = racer.integrity;
      racer.integrity = applyWeaponDamage(before, MISSILE_RAW_DAMAGE, racer.stats);
      if (
        before.condition !== CAR_CONDITION.DESTROYED &&
        racer.integrity.condition === CAR_CONDITION.DESTROYED
      ) {
        racer.explodedThisStep = true;
        racer.state = { ...racer.state, velocity: VEC2_ZERO, yawSpin: 0 };
      }
    }

    if (!frozen) {
      this.resolveHazardOverlaps();
      this.hazards = ageHazards(this.hazards, stepSeconds);
    }

    // 5. Lap progress and standings, from the final positions of the step.
    this.raceState = advanceRace(this.raceState, stepped, this.track, this.spline, stepSeconds);

    // Finish-line refill: missiles up to (Arsenal-boosted) ammoCapacity; oil/mines to start.
    this.racers.forEach((racer, index) => {
      const before = previousLaps[index] ?? 0;
      const after = this.standingOf(racer.carId)?.lapsCompleted ?? 0;
      if (after > before) {
        racer.inventory = refillWeaponInventory(racer.inventory, racer.stats, racer.perk);
        racer.jumps = refillJumpCharges(racer.jumps);
      }
    });
  }

  /** Launch from a just-read command. Edge-triggering is the adapter's job. */
  private resolveWeaponCommand(racer: RacerRuntime, command: InputCommand): void {
    if (command.fire) {
      const next = consumeMissile(racer.inventory);
      if (next !== null) {
        racer.inventory = next;
        this.missiles.push(
          launchMissile(
            racer.carId,
            racer.state.position,
            racer.state.heading,
            racer.stats.maxSpeed,
            racer.stats.collisionRadius,
          ),
        );
      }
    }

    if (command.dropOil) {
      const next = consumeOil(racer.inventory);
      if (next !== null) {
        racer.inventory = next;
        const hazard = dropOil(
          racer.carId,
          racer.state.position,
          racer.state.heading,
          racer.stats.collisionRadius,
          racer.distance,
          this.oilLifetimeSeconds,
        );
        this.hazards.push(hazard);
        this.freshHazardIds.add(hazard.id);
      }
    }

    if (command.dropMine) {
      const next = consumeMine(racer.inventory);
      if (next !== null) {
        racer.inventory = next;
        const hazard = dropMine(
          racer.carId,
          racer.state.position,
          racer.state.heading,
          racer.stats.collisionRadius,
          racer.distance,
        );
        this.hazards.push(hazard);
        this.freshHazardIds.add(hazard.id);
      }
    }
  }

  /** Impart hop velocity when grounded and a charge remains. */
  private resolveHopCommand(racer: RacerRuntime, command: InputCommand): void {
    if (!command.jump || isAirborne(racer.state)) {
      return;
    }
    const next = consumeJump(racer.jumps);
    if (next === null) {
      return;
    }
    racer.jumps = next;
    racer.state = { ...racer.state, verticalVelocity: hopLaunchSpeed(racer.stats) };
  }

  /**
   * Oil → yawSpin (decision 19); mine → instant destroy. A hazard is consumed on
   * contact. The dropper is immune to a hazard on the step it was spawned.
   */
  private resolveHazardOverlaps(): void {
    const targets = this.racers
      .filter(racer => this.canCollide(racer) && !isAirborne(racer.state))
      .map(racer => ({
        carId: racer.carId,
        position: racer.state.position,
        radius: racer.stats.collisionRadius,
      }));

    const hits = findHazardHits(this.hazards, targets);
    if (hits.length === 0) {
      return;
    }

    const consumed = new Set<number>();
    for (const hit of hits) {
      if (this.freshHazardIds.has(hit.hazardId)) {
        const hazard = this.hazards.find(entry => entry.id === hit.hazardId);
        if (hazard !== undefined && hazard.ownerCarId === hit.targetCarId) {
          continue;
        }
      }
      const racer = this.racers.find(entry => entry.carId === hit.targetCarId);
      if (racer === undefined || !this.canCollide(racer)) {
        continue;
      }
      consumed.add(hit.hazardId);

      const hazard = this.hazards.find(entry => entry.id === hit.hazardId);
      if (
        hazard !== undefined &&
        hazard.ownerCarId === this.player.carId &&
        hit.targetCarId !== this.player.carId
      ) {
        if (hit.kind === HAZARD_KIND.OIL) {
          this.playerHits.oil += 1;
        } else if (hit.kind === HAZARD_KIND.MINE) {
          this.playerHits.mines += 1;
        }
      }

      if (hit.kind === HAZARD_KIND.OIL) {
        racer.state = {
          ...racer.state,
          yawSpin: racer.state.yawSpin + oilYawSpinForArmor(racer.stats.armor),
        };
        continue;
      }

      // Landmine: destroy outright.
      const before = racer.integrity;
      racer.integrity = applyWeaponDamage(before, 1, { ...racer.stats, armor: 0 });
      if (
        before.condition !== CAR_CONDITION.DESTROYED &&
        racer.integrity.condition === CAR_CONDITION.DESTROYED
      ) {
        racer.explodedThisStep = true;
        racer.state = { ...racer.state, velocity: VEC2_ZERO, yawSpin: 0 };
      }
    }

    if (consumed.size > 0) {
      this.hazards = this.hazards.filter(hazard => !consumed.has(hazard.id));
    }
  }

  /** Reads and clears the impact the presentation layer owes a sound. */
  drainImpact(racer: RacerRuntime): number {
    const impact = racer.pendingImpactSpeed;
    racer.pendingImpactSpeed = 0;
    return impact;
  }

  /**
   * How much tow this car is getting from the rest of the field, 0..1.
   *
   * Returns 0 immediately for a car that cannot draft at all, which is four of the five
   * cars — so the pair scan below only ever runs for the one car whose perk uses it, and
   * the common case costs a single comparison rather than a loop over the field.
   *
   * Read at the top of stage 1, from positions as they stood at the END of the previous
   * step. That is the only consistent answer available: reading them mid-stage would make
   * a car's tow depend on where it sits in the array, which is precisely the ordering
   * dependence stages 1 and 2 are kept apart to avoid.
   */
  private draftFor(racer: RacerRuntime): number {
    if (racer.perk.slipstreamBonus <= 0) {
      return 0;
    }
    const candidates: DraftCandidate[] = [];
    for (const other of this.racers) {
      if (other === racer || !this.canCollide(other)) {
        continue;
      }
      candidates.push({ position: other.state.position, heading: other.state.heading });
    }
    return slipstreamFactor(racer.state, candidates);
  }

  private canCollide(racer: RacerRuntime): boolean {
    return racer.integrity.condition !== CAR_CONDITION.DESTROYED;
  }

  /**
   * A wrecked car keeps its position but takes no part in the race: no physics, no
   * lap progress, and no contact. When the timer runs out it is set back down on the
   * centreline where it died, facing the right way — respawning at the grid would
   * teleport a car that was half a lap ahead.
   */
  private sitOutWreck(racer: RacerRuntime, stepSeconds: number): void {
    racer.state = { ...racer.state, velocity: VEC2_ZERO, yawSpin: 0 };
    racer.telemetry = null;

    const before = racer.integrity;
    racer.integrity = tickIntegrity(before, stepSeconds);

    if (racer.integrity.condition !== CAR_CONDITION.DESTROYED) {
      const frame = this.spline.frameAt(racer.distance);
      racer.state = createVehicleState(frame.position, angleOf(frame.tangent));
      racer.lateralOffset = 0;
      racer.pendingImpactSpeed = 0;
      racer.respawnedThisStep = true;
    }
  }

  /**
   * The player's command comes from the keyboard; an NPC's comes from `PaceDriver`,
   * through the exact same `InputCommand` contract (decision 12), so an NPC has no
   * way to cheat the physics. Weapon intent is composed HERE from the aim cone so
   * PaceDriver stays a pure centreline follower.
   *
   * The extra `projectNear` here is deliberate. `stepVehicleOnTrack` projects
   * internally and does not hand the projection back, and the pace driver needs one
   * to aim with; four NPCs at 60 Hz is 240 extra projections a second, which is a
   * bounded search over a hinted window and far cheaper than restructuring the step
   * to thread a projection out of it.
   */
  private commandFor(
    racer: RacerRuntime,
    playerCommand: InputCommand,
    _stepSeconds: number,
  ): InputCommand {
    if (racer.isPlayer) {
      return playerCommand;
    }
    const projection = this.spline.projectNear(racer.state.position, racer.distance, this.projectionWindow);
    const rivals: RivalView[] = this.racers
      .filter(other => other !== racer && this.canCollide(other))
      .map(other => ({
        carId: other.carId,
        // LIVE stage-1 distance — never stage-5 standings (one step stale).
        distance: other.distance,
        isPlayer: other.isPlayer,
      }));

    const line = this.trackLines === undefined
      ? undefined
      : findLineForCar(this.trackLines, racer.carId);

    const drive = line !== undefined
      ? this.ai.command(racer.state, projection, racer.stats, this.spline, line, rivals)
      : this.pace.command(racer.state, projection, racer.stats, this.spline);

    if (!this.npcWeapons || racer.weaponCooldownRemaining > 0) {
      return drive;
    }

    // 1) Offence: fire a missile when a target sits in the aim corridor.
    if (racer.inventory.missiles > 0) {
      const aim = decideMissileAim(
        racer.state.position,
        racer.state.heading,
        racer.stats.collisionRadius,
        racer.stats.aimRadius,
        this.racers
          .filter(other => other !== racer && this.canCollide(other))
          .map(other => ({
            carId: other.carId,
            position: other.state.position,
            isPlayer: other.isPlayer,
          })),
      );
      if (aim.shouldFire) {
        this.armWeaponCooldown(racer);
        return { ...drive, fire: true };
      }
    }

    // 2) Defence: drop a hazard in the path of a rival close behind (the player
    //    is prioritised). A mine is spent only when the chaser is right on the
    //    tail; oil goes down over a looser gap.
    const behind = this.closestRivalBehind(racer);
    if (behind !== null) {
      if (racer.inventory.mines > 0 && behind.gap < NPC_MINE_DROP_GAP_UNITS) {
        this.armWeaponCooldown(racer);
        return { ...drive, dropMine: true };
      }
      if (racer.inventory.oil > 0 && behind.gap < NPC_OIL_DROP_GAP_UNITS) {
        this.armWeaponCooldown(racer);
        return { ...drive, dropOil: true };
      }
    }

    return drive;
  }

  private armWeaponCooldown(racer: RacerRuntime): void {
    racer.weaponCooldownRemaining = npcWeaponCooldownSeconds(
      NPC_WEAPON_COOLDOWN_SECONDS,
      racer.perk,
    );
  }

  /**
   * The nearest rival tailing `racer`, by live arc-length gap. The player is
   * preferred over an NPC at similar range so hazards are spent on the human.
   */
  private closestRivalBehind(
    racer: RacerRuntime,
  ): { carId: string; gap: number } | null {
    const total = this.spline.totalLength;
    let bestPlayer: { carId: string; gap: number } | null = null;
    let bestOther: { carId: string; gap: number } | null = null;

    for (const other of this.racers) {
      if (other === racer || !this.canCollide(other)) {
        continue;
      }
      let gap = racer.distance - other.distance;
      if (gap <= 0) gap += total;
      if (gap <= 0 || gap > total * 0.5) {
        continue;
      }
      const pick = { carId: other.carId, gap };
      if (other.isPlayer) {
        if (bestPlayer === null || pick.gap < bestPlayer.gap) bestPlayer = pick;
      } else if (bestOther === null || pick.gap < bestOther.gap) {
        bestOther = pick;
      }
    }

    return bestPlayer ?? bestOther;
  }

  private freshRaceState(): RaceState {
    return createRaceState(
      this.racers.map(racer => racer.carId),
      this.track.startLineDistance,
      this.countdownSeconds,
    );
  }

  private firstRacer(): RacerRuntime {
    const first = this.racers[0];
    if (first === undefined) {
      throw new Error('RaceField has no racers');
    }
    return first;
  }
}

/** Which side of a two-car contact is which. Used only to name the aggressor. */
const CONTACT_SIDE = {
  A: 'a',
  B: 'b',
  NEITHER: 'neither',
} as const;
type ContactSide = (typeof CONTACT_SIDE)[keyof typeof CONTACT_SIDE];

/**
 * Which of two touching cars ran into the other.
 *
 * The aggressor is whichever car was closing the gap faster along the line joining
 * their centres. That single number is the honest test: it makes the car behind in a
 * rear-end the aggressor, it makes a car turning into another's flank the aggressor,
 * and in a genuine head-on — both closing at the same rate — it names NEITHER, so
 * both cars take full victim damage. A slow car minding its own line is never blamed
 * for being hit, which is the whole point of the rule.
 *
 * Must be called with the states from BEFORE the contact impulse is applied.
 */
function aggressorOf(a: VehicleState, b: VehicleState): ContactSide {
  const separation = subtract(b.position, a.position);
  if (length(separation) === 0) {
    // Perfectly co-located cars have no line of contact to judge, so neither is blamed.
    return CONTACT_SIDE.NEITHER;
  }

  const normal = normalize(separation);
  const closingA = dot(a.velocity, normal);
  const closingB = -dot(b.velocity, normal);

  if (closingA > closingB) {
    return CONTACT_SIDE.A;
  }
  if (closingB > closingA) {
    return CONTACT_SIDE.B;
  }
  return CONTACT_SIDE.NEITHER;
}

/** Grid position on the centreline, for anything that needs to draw the slot. */
export function gridSlotPosition(spline: TrackSpline, distance: number, lateralOffset: number) {
  const frame = spline.frameAt(distance);
  return add(frame.position, scale(frame.normal, lateralOffset));
}
