import type { InputCommand } from '../input/InputCommand.ts';
import type { TrackSpline } from '../track/TrackSpline.ts';
import type { TrackProjection } from '../track/TrackSpline.ts';
import { offsetAt } from '../race/RacingLine.ts';
import type { RacingLine } from '../race/RacingLine.ts';
import { cornerTargetSpeed, speedCommand } from './CornerSpeed.ts';
import { pursuitAimPoint, pursuitSteer } from './PursuitSteering.ts';
import type { VehicleState } from './Vehicle.ts';
import type { VehicleStats } from './VehicleStats.ts';
import {
  PACE_DRIVER_DEFAULTS,
  type PaceDriverOptions,
} from './PaceDriver.ts';
import {
  commitCornerPlan,
  cornerCommitLookAhead,
  goForPass,
  isStraight,
  nextCornerMarks,
  type RivalTraits,
} from './RivalTraits.ts';

/**
 * A rival the AI may want to overtake or defend against. Distances are LIVE
 * stage-1 arc lengths — never stage-5 standings (those are one step stale).
 */
export interface RivalView {
  readonly carId: string;
  readonly distance: number;
}

/**
 * How hard NPCs race by default, 0..1. Owner asked for competitive rivals that
 * "arriscam mais": at 0 the AI drives like the conservative `PaceDriver`, at 1 it
 * carries the most corner speed it dares, brakes latest, and barely lifts off the
 * throttle when it catches a car ahead.
 */
export const AI_DEFAULT_AGGRESSION = 0.9;

/** Hard ceiling on the cornering grip fraction, so even a maxed-out AI is not a guaranteed spin. */
const MAX_CORNER_SAFETY_FACTOR = 0.99;

/**
 * NPC driver that follows a searched racing line and reacts to rivals ahead.
 *
 * Built on the shared `PursuitSteering` / `CornerSpeed` maths so locked decision
 * 27 cannot be re-broken by a copy of `PaceDriver`.
 */
export class AIDriver {
  readonly options: PaceDriverOptions;
  readonly aggression: number;
  readonly traits: RivalTraits | undefined;

  /** Options actually used for corner speed / braking, sharpened by `aggression`. */
  private readonly driveOptions: PaceDriverOptions;
  /** Throttle multiplier when a rival is close ahead: 1 = never lift, attack. */
  private readonly closingThrottle: number;

  constructor(
    options: PaceDriverOptions = PACE_DRIVER_DEFAULTS,
    aggression: number = AI_DEFAULT_AGGRESSION,
    traits?: RivalTraits,
  ) {
    this.options = options;
    this.aggression = Math.max(0, Math.min(1, aggression));
    this.traits = traits;

    // Push the cornering limit toward the edge of grip and shorten the braking
    // margin so the car brakes later — both are "risk" the owner asked for.
    const safety = Math.min(
      MAX_CORNER_SAFETY_FACTOR,
      options.cornerSafetyFactor + this.aggression * (MAX_CORNER_SAFETY_FACTOR - options.cornerSafetyFactor),
    );
    this.driveOptions = {
      ...options,
      cornerSafetyFactor: safety,
      cornerLookAheadMinimum: options.cornerLookAheadMinimum * (1 - this.aggression * 0.3),
    };
    // At full aggression the AI keeps ~92% throttle even while catching a car,
    // so it presses for the overtake instead of tucking in behind.
    this.closingThrottle = 0.55 + this.aggression * 0.4;
  }

  command(
    state: VehicleState,
    projection: TrackProjection,
    stats: VehicleStats,
    spline: TrackSpline,
    line: RacingLine | undefined,
    rivals: readonly RivalView[],
    laneBias = 0,
  ): InputCommand {
    const speed = Math.hypot(state.velocity.x, state.velocity.y);
    const speedRatio = stats.maxSpeed > 0 ? speed / stats.maxSpeed : 0;
    const traits = this.traits;
    const committed =
      traits !== undefined && commitCornerPlan(traits, speedRatio, isStraight(spline, projection.distance));
    const marks = committed ? nextCornerMarks(spline, projection.distance) : null;
    const commitLook =
      traits !== undefined && marks !== null ? cornerCommitLookAhead(traits, marks) : null;
    const lateral = (line === undefined ? 0 : offsetAt(line, projection.distance + 12, spline)) + laneBias;
    const aim = pursuitAimPoint(
      projection,
      spline,
      speed,
      this.options.lookAheadBase,
      this.options.lookAheadScaleFactor,
      lateral,
    );
    const cornerOpts =
      commitLook === null || traits === undefined
        ? this.driveOptions
        : {
            ...this.driveOptions,
            cornerLookAheadMinimum: commitLook * (0.35 + (1 - traits.daring / 10) * 0.5),
          };
    let { throttle, brake } = speedCommand(
      cornerTargetSpeed(projection, stats, spline, speed, cornerOpts),
      speed,
      this.options.speedControlGain,
      this.options.speedDeadband,
    );

    // Dive on whoever is ahead — the field, not the human. Daring hits at this instant.
    const ahead = closestRivalAhead(projection.distance, rivals, spline.totalLength);
    if (ahead !== null && ahead.gap < 18 && ahead.gap > 0) {
      const dive = traits === undefined ? this.closingThrottle : 0.55 + goForPass(traits, ahead.gap) * 0.4;
      throttle *= dive;
    }

    return {
      throttle,
      brake,
      reverse: 0,
      steer: pursuitSteer(state, aim, this.options.fullLockBearing),
      fire: false,
      dropOil: false,
      dropMine: false,
      jump: false,
      boost: false,
    };
  }
}

function closestRivalAhead(
  selfDistance: number,
  rivals: readonly RivalView[],
  trackLength: number,
): { gap: number; rival: RivalView } | null {
  let best: { gap: number; rival: RivalView } | null = null;
  for (const rival of rivals) {
    let gap = rival.distance - selfDistance;
    if (gap <= 0) gap += trackLength;
    if (gap <= 0 || gap > trackLength * 0.5) {
      continue;
    }
    if (best === null || gap < best.gap) {
      best = { gap, rival };
    }
  }
  return best;
}
