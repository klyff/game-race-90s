import { RACE_PHASE } from '../constants.ts';
import type { InputCommand } from '../input/InputCommand.ts';
import { IDLE_INPUT } from '../input/InputCommand.ts';
import { add, angleOf, dot, length, normalize, scale, subtract, VEC2_ZERO } from '../math/Vec2.ts';
import { resolveWallContact } from '../track/TrackCollision.ts';
import type { TrackDefinition } from '../track/TrackDefinition.ts';
import type { TrackSpline } from '../track/TrackSpline.ts';
import { resolveCarContact } from '../vehicle/CarCollision.ts';
import {
  applyImpactDamage,
  CAR_CONDITION,
  createCarIntegrity,
  DAMAGE_ROLE,
  tickIntegrity,
} from '../vehicle/CarIntegrity.ts';
import type { CarIntegrity, DamageRole } from '../vehicle/CarIntegrity.ts';
import {
  contactStats,
  drivingStats,
  perkDamageMultiplier,
  perkProfile,
  perkSurface,
} from '../vehicle/CarPerk.ts';
import type { CarPerkProfile } from '../vehicle/CarPerk.ts';
import type { CarPerkId } from '../constants.ts';
import { PaceDriver } from '../vehicle/PaceDriver.ts';
import { createVehicleState } from '../vehicle/Vehicle.ts';
import type { VehicleState, VehicleTelemetry } from '../vehicle/Vehicle.ts';
import type { VehicleStats } from '../vehicle/VehicleStats.ts';
import { slipstreamFactor } from './Slipstream.ts';
import type { DraftCandidate } from './Slipstream.ts';
import { advanceRace, createRaceState } from './RaceSimulation.ts';
import type { RaceState, RacerStep } from './RaceSimulation.ts';
import type { RacerStanding } from './PositionRanker.ts';
import { buildStartingGrid } from './StartingGrid.ts';
import { stepVehicleOnTrack } from './OnTrackStep.ts';

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
 *  1. every car integrates INDEPENDENTLY (`stepVehicleOnTrack`, walls included);
 *  2. only THEN is car-to-car contact resolved, pair by pair;
 *  3. any car a contact moved is re-checked against the wall;
 *  4. damage is applied from the hardest contact of the step;
 *  5. lap progress and standings advance last, from the final positions.
 *
 * Steps 1 and 2 must not interleave. Resolving contact inside the per-car loop
 * would let the first car in the list collide with cars that had already moved this
 * step and cars that had not, which makes the result depend on array order — the
 * same pair of cars would exchange a different impulse depending on who was listed
 * first. Step 3 exists because a contact impulse is free to shove a car sideways
 * through a wall that had already been resolved in step 1.
 */
export class RaceField {
  readonly racers: readonly RacerRuntime[];

  private readonly track: TrackDefinition;
  private readonly spline: TrackSpline;
  private readonly pace: PaceDriver;
  private readonly countdownSeconds: number;
  private readonly projectionWindow: number;
  private readonly gridSetbackUnits: number;
  private raceState: RaceState;

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
    this.countdownSeconds = options.countdownSeconds ?? DEFAULT_COUNTDOWN_SECONDS;
    this.projectionWindow = options.projectionWindow ?? DEFAULT_PROJECTION_WINDOW;
    this.gridSetbackUnits = options.gridSetbackUnits ?? DEFAULT_GRID_SETBACK_UNITS;

    // Grid slots follow entry order, so the caller decides where the player starts by
    // where it puts the player in the list. The scene puts them at the back.
    const grid = buildStartingGrid(entries.length, track, spline, this.gridSetbackUnits);

    this.racers = entries.map((entry, index) => {
      const slot = grid[index];
      if (slot === undefined) {
        throw new Error(`starting grid produced no slot for racer ${index}`);
      }
      return {
        carId: entry.carId,
        stats: entry.stats,
        isPlayer: entry.isPlayer,
        perk: perkProfile(entry.perk),
        gridIndex: slot.index,
        state: createVehicleState(slot.position, slot.heading),
        telemetry: null,
        distance: slot.distance,
        lateralOffset: slot.lateralOffset,
        integrity: createCarIntegrity(),
        pendingImpactSpeed: 0,
        explodedThisStep: false,
        respawnedThisStep: false,
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
      racer.pendingImpactSpeed = 0;
      racer.explodedThisStep = false;
      racer.respawnedThisStep = false;
    });

    this.raceState = this.freshRaceState();
  }

  /**
   * Advances the whole field by one fixed step. See the class comment for why the
   * five stages are in this order.
   */
  step(playerCommand: InputCommand, stepSeconds: number): void {
    const frozen = this.raceState.phase === RACE_PHASE.COUNTDOWN;
    const previousDistances = this.racers.map(racer => racer.distance);
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
    /** Cars a contact impulse moved, which therefore need a second wall check. */
    const nudged = this.racers.map(() => false);
    const stepped: RacerStep[] = [];

    const recordImpact = (index: number, speed: number, role: DamageRole): void => {
      if (speed <= (impacts[index] ?? 0)) {
        return;
      }
      impacts[index] = speed;
      roles[index] = role;
    };

    // 1. Every car integrates on its own, against the track only.
    this.racers.forEach((racer, index) => {
      racer.explodedThisStep = false;
      racer.respawnedThisStep = false;

      if (racer.integrity.condition === CAR_CONDITION.DESTROYED) {
        this.sitOutWreck(racer, stepSeconds);
        return;
      }

      const speedBefore = length(racer.state.velocity);
      const command = frozen ? IDLE_INPUT : this.commandFor(racer, playerCommand);

      // Perks enter as DERIVED values, never as a special case inside the physics: the
      // stats this one step is driven with, and an adjustment to whatever surface the
      // track picks. Both are recomputed every step from the current field, so nothing
      // is cached and nothing can go stale — the trap that produced T-039.
      const draft = this.draftFor(racer);
      const stats = drivingStats(racer.stats, racer.perk, command.brake > 0, draft);
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
        recordImpact(i, contact.impactSpeed, aggressor === CONTACT_SIDE.A ? DAMAGE_ROLE.AGGRESSOR : DAMAGE_ROLE.VICTIM);
        recordImpact(j, contact.impactSpeed, aggressor === CONTACT_SIDE.B ? DAMAGE_ROLE.AGGRESSOR : DAMAGE_ROLE.VICTIM);

        a.state = contact.a;
        b.state = contact.b;
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

    // 4. Damage from the hardest contact of the step, once per car.
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
        perkDamageMultiplier(racer.perk, role),
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

    // 5. Lap progress and standings, from the final positions of the step.
    this.raceState = advanceRace(this.raceState, stepped, this.track, this.spline, stepSeconds);
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
   * way to cheat the physics.
   *
   * The extra `projectNear` here is deliberate. `stepVehicleOnTrack` projects
   * internally and does not hand the projection back, and the pace driver needs one
   * to aim with; four NPCs at 60 Hz is 240 extra projections a second, which is a
   * bounded search over a hinted window and far cheaper than restructuring the step
   * to thread a projection out of it.
   */
  private commandFor(racer: RacerRuntime, playerCommand: InputCommand): InputCommand {
    if (racer.isPlayer) {
      return playerCommand;
    }
    const projection = this.spline.projectNear(racer.state.position, racer.distance, this.projectionWindow);
    return this.pace.command(racer.state, projection, racer.stats, this.spline);
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
