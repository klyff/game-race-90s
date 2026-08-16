import { cross, dot, fromAngle, subtract } from '../math/Vec2.ts';
import type { InputCommand } from '../input/InputCommand.ts';
import type { TrackSpline } from '../track/TrackSpline.ts';
import type { TrackProjection } from '../track/TrackSpline.ts';
import type { VehicleState } from './Vehicle.ts';
import type { VehicleStats } from './VehicleStats.ts';

/**
 * Curvature at or below this counts as a straight, 1/world-units.
 *
 * Purely a division guard: `sqrt(grip / curvature)` goes to Infinity as the track
 * straightens, and every value past this point is already far above any car's `maxSpeed`.
 */
const STRAIGHT_CURVATURE_EPSILON = 1e-6;

/** Floor on `brakeForce` when sizing the braking zone, so a bad stat cannot divide by zero. */
const MINIMUM_BRAKE_FORCE = 1;

/** Configuration for the deterministic `PaceDriver` controller. */
export interface PaceDriverOptions {
  /**
   * Aim distance along the centreline when the car is stationary, world units.
   * Also the floor on the aim distance at any speed.
   */
  readonly lookAheadBase: number;

  /**
   * Seconds of travel added to the aim distance, so it grows with speed.
   *
   * This is the single most important stability knob in pure pursuit: aim too close and
   * the car saws left and right chasing a point it can never reach; aim too far and it
   * cuts corners because it is already pointing at the exit.
   */
  readonly lookAheadScaleFactor: number;

  /**
   * Shortest braking zone the driver ever looks over, world units. At a standstill the
   * derived braking distance is zero, and a driver that cannot see the corner it is
   * sitting in front of will accelerate straight into it.
   */
  readonly cornerLookAheadMinimum: number;

  /**
   * Arc length the curvature is averaged over, world units. Wider smooths spline wobble;
   * narrower tracks authored corner tightness more literally (decision 10).
   */
  readonly cornerLookAheadSpan: number;

  /** How many points across the braking zone are sampled for the tightest corner. */
  readonly brakingZoneSamples: number;

  /** Proportional gain on the speed error, per world unit/s. */
  readonly speedControlGain: number;

  /**
   * Speed error, world units/s, inside which the driver neither throttles nor brakes.
   * Without a deadband the controller alternates the two every single step once it
   * arrives at its target, which scrubs speed and makes the engine audio stutter.
   */
  readonly speedDeadband: number;

  /**
   * Bearing error that commands full steering lock, radians. Errors beyond it saturate.
   * Smaller means a sharper, twitchier driver.
   */
  readonly fullLockBearing: number;

  /**
   * Fraction of the grip limit the driver aims at when cornering (0..1). At 1.0 it aims
   * exactly at the edge of sliding, where any bump or spline wobble tips it over.
   */
  readonly cornerSafetyFactor: number;
}

/**
 * Defaults measured against Thunder Basin, which mixes a 377-unit straight with a
 * 39.8-radius hairpin — the two cases that break a naive controller in opposite ways.
 */
export const PACE_DRIVER_DEFAULTS: PaceDriverOptions = {
  lookAheadBase: 12,
  lookAheadScaleFactor: 0.45,
  cornerLookAheadMinimum: 30,
  cornerLookAheadSpan: 25,
  brakingZoneSamples: 8,
  speedControlGain: 0.35,
  speedDeadband: 1.5,
  fullLockBearing: 0.45,
  cornerSafetyFactor: 0.85,
};

/**
 * A deterministic, pure centreline-following controller for automated lap driving.
 *
 * It exists because T-012's headless lap harness needs something that can complete a lap
 * unattended: a fixed scripted key sequence cannot survive both a 377-unit straight and a
 * 39.8-radius hairpin. Locked decision 12 requires every non-human driver to emit an
 * `InputCommand` and go through `stepVehicle` like the player does, so this controller
 * cannot cheat by writing velocity or position directly — it only ever asks for throttle,
 * brake and steering, and lives with the result.
 *
 * Decision 13 fixes the sign conventions used here (+Y is left, positive `steer` turns
 * left). Decision 15's `SCREEN_ROTATION_SIGN` is deliberately NOT used: that constant
 * compensates for the isometric projection's mirror and belongs only to the keyboard
 * adapter. A driver that borrowed it would steer into every wall.
 *
 * No randomness and no time source, so a lap is reproducible to the last decimal.
 */
export class PaceDriver {
  readonly options: PaceDriverOptions;

  constructor(options: PaceDriverOptions = PACE_DRIVER_DEFAULTS) {
    if (options.lookAheadBase <= 0) throw new Error('lookAheadBase must be positive');
    if (options.lookAheadScaleFactor < 0) {
      throw new Error('lookAheadScaleFactor must be non-negative');
    }
    if (options.cornerLookAheadMinimum <= 0) {
      throw new Error('cornerLookAheadMinimum must be positive');
    }
    if (options.cornerLookAheadSpan <= 0) throw new Error('cornerLookAheadSpan must be positive');
    if (!Number.isInteger(options.brakingZoneSamples) || options.brakingZoneSamples < 1) {
      throw new Error('brakingZoneSamples must be a positive integer');
    }
    if (options.speedControlGain <= 0) throw new Error('speedControlGain must be positive');
    if (options.speedDeadband < 0) throw new Error('speedDeadband must be non-negative');
    if (options.fullLockBearing <= 0) throw new Error('fullLockBearing must be positive');
    if (options.cornerSafetyFactor <= 0 || options.cornerSafetyFactor > 1) {
      throw new Error('cornerSafetyFactor must be in (0, 1]');
    }
    this.options = options;
  }

  /**
   * The command for one step: where to point and how fast to go.
   *
   * `projection` is the car's own projection onto the centreline, which the caller
   * already has — the race loop computes it every step anyway (see `stepVehicleOnTrack`),
   * so taking it as an argument avoids a second `projectNear` per step.
   */
  command(
    state: VehicleState,
    projection: TrackProjection,
    stats: VehicleStats,
    spline: TrackSpline,
  ): InputCommand {
    const speed = Math.hypot(state.velocity.x, state.velocity.y);
    const { throttle, brake } = this.computeSpeed(projection, stats, spline, speed);

    return {
      throttle,
      brake,
      reverse: 0,
      steer: this.computeSteer(state, projection, spline, speed),
      fire: false,
      dropMine: false,
    };
  }

  /**
   * Pure pursuit: aim at a point on the centreline ahead of the car, and steer at it.
   *
   * There is deliberately NO separate "correct the lateral offset" term. Pure pursuit
   * converges on the path by itself — a car sitting left of the centreline sees an aim
   * point to its right and turns right — and a proportional term added on top fights it.
   * Worse, `lateralOffset` is in world units and reaches 27 near the wall, so any gain
   * near 1 pins the steering at full lock and the car saws left and right until it beaches
   * itself. That is precisely how the first version of this file failed, about a third of
   * the way around Thunder Basin.
   *
   * The error is measured with `atan2(cross, dot)` rather than the cross product alone.
   * The cross product is the sine of the error, so on its own it reads 150° off course as
   * gently as 30° off course, and the driver coasts wide instead of hauling the car round.
   *
   * Returns a value in [-1, 1], positive turning left (decision 13).
   */
  private computeSteer(
    state: VehicleState,
    projection: TrackProjection,
    spline: TrackSpline,
    speed: number,
  ): number {
    const opts = this.options;
    const lookAhead = opts.lookAheadBase + opts.lookAheadScaleFactor * speed;
    const aimFrame = spline.frameAt(spline.wrap(projection.distance + lookAhead));

    const toAim = subtract(aimFrame.position, state.position);
    const heading = fromAngle(state.heading);

    // Signed, full-range bearing error. Positive means the aim point lies to the left,
    // which decision 13 says is positive steer.
    const bearingError = Math.atan2(cross(heading, toAim), dot(heading, toAim));

    return clampSteer(bearingError / opts.fullLockBearing);
  }

  /**
   * The speed this driver will hold for the tightest corner inside its braking zone,
   * world units/s.
   *
   * The target is the steady-state cornering limit. Taking a corner of radius r at speed
   * v demands v²/r of lateral acceleration, and `stats.grip` IS that acceleration limit
   * (see `VehicleStats`), so the fastest a car can hold the line is
   *
   *   v_max = sqrt(grip / |curvature|)
   *
   * The subtlety is *where* to evaluate it. One fixed lookahead is not enough: braking
   * from 78 u/s down to a 33 u/s hairpin takes on the order of 80 world units, so a
   * 30-unit lookahead arrives at the corner still flat out. This samples the whole braking
   * zone — its length derived from the car's own `brakeForce` and current speed — and
   * takes the MINIMUM limit found, so the car starts slowing for the tightest part of what
   * is actually coming rather than for whatever happens to sit at one arbitrary distance.
   *
   * Public because it is the one number worth asserting about the speed controller: a test
   * can compare it against the closed-form grip limit instead of memorising whatever
   * throttle value happened to come out.
   */
  targetSpeed(
    projection: TrackProjection,
    stats: VehicleStats,
    spline: TrackSpline,
    speed: number,
  ): number {
    const opts = this.options;

    // How far this car needs to shed its speed, plus a floor so a stationary car still
    // sees the corner ahead of it.
    const brakingZone =
      opts.cornerLookAheadMinimum +
      (speed * speed) / (2 * Math.max(stats.brakeForce, MINIMUM_BRAKE_FORCE));

    let target = stats.maxSpeed;
    for (let sample = 0; sample <= opts.brakingZoneSamples; sample += 1) {
      const ahead = (brakingZone * sample) / opts.brakingZoneSamples;
      const curvature = Math.abs(
        spline.curvatureAt(spline.wrap(projection.distance + ahead), opts.cornerLookAheadSpan),
      );
      if (curvature <= STRAIGHT_CURVATURE_EPSILON) {
        continue;
      }
      const cornerLimit = opts.cornerSafetyFactor * Math.sqrt(stats.grip / curvature);
      if (cornerLimit < target) {
        target = cornerLimit;
      }
    }
    return target;
  }

  /**
   * Throttle below the target speed, brake above it, coast inside the deadband.
   *
   * Returns `{ throttle, brake }`, each in [0, 1] and mutually exclusive.
   */
  private computeSpeed(
    projection: TrackProjection,
    stats: VehicleStats,
    spline: TrackSpline,
    speed: number,
  ): { throttle: number; brake: number } {
    const opts = this.options;
    const speedError = this.targetSpeed(projection, stats, spline, speed) - speed;

    if (Math.abs(speedError) <= opts.speedDeadband) {
      return { throttle: 0, brake: 0 };
    }
    if (speedError > 0) {
      return { throttle: Math.min(1, speedError * opts.speedControlGain), brake: 0 };
    }
    return { throttle: 0, brake: Math.min(1, -speedError * opts.speedControlGain) };
  }
}

/** Clamps a steering value into the range the input contract allows. */
function clampSteer(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(-1, Math.min(1, value));
}

/**
 * Functional API for callers that are happy with the defaults. Clients that need to tune
 * the options should construct a `PaceDriver` and keep it.
 */
export function paceCommand(
  state: VehicleState,
  projection: TrackProjection,
  stats: VehicleStats,
  spline: TrackSpline,
): InputCommand {
  const driver = new PaceDriver();
  return driver.command(state, projection, stats, spline);
}
