import type { InputCommand } from '../input/InputCommand.ts';
import type { TrackSpline } from '../track/TrackSpline.ts';
import type { TrackProjection } from '../track/TrackSpline.ts';
import type { VehicleState } from './Vehicle.ts';
import type { VehicleStats } from './VehicleStats.ts';
import { cornerTargetSpeed, speedCommand } from './CornerSpeed.ts';
import { pursuitAimPoint, pursuitSteer } from './PursuitSteering.ts';

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
 * Steering and corner-speed maths live in `PursuitSteering` / `CornerSpeed` so
 * `AIDriver` (T-038) cannot re-break them by copying (locked decision 27).
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
    const { throttle, brake } = speedCommand(
      this.targetSpeed(projection, stats, spline, speed),
      speed,
      this.options.speedControlGain,
      this.options.speedDeadband,
    );
    const aim = pursuitAimPoint(
      projection,
      spline,
      speed,
      this.options.lookAheadBase,
      this.options.lookAheadScaleFactor,
    );

    return {
      throttle,
      brake,
      reverse: 0,
      steer: pursuitSteer(state, aim, this.options.fullLockBearing),
      // Weapon decisions are composed by `RaceField` (aim cone + inventory), not here.
      fire: false,
      dropOil: false,
      dropMine: false,
      boost: false,
    };
  }

  /**
   * The speed this driver will hold for the tightest corner inside its braking zone,
   * world units/s. Public because tests assert against the closed-form grip limit.
   */
  targetSpeed(
    projection: TrackProjection,
    stats: VehicleStats,
    spline: TrackSpline,
    speed: number,
  ): number {
    return cornerTargetSpeed(projection, stats, spline, speed, this.options);
  }
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
