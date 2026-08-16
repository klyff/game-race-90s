import type { TrackSpline } from '../track/TrackSpline.ts';
import type { TrackProjection } from '../track/TrackSpline.ts';
import type { VehicleStats } from './VehicleStats.ts';

const STRAIGHT_CURVATURE_EPSILON = 1e-6;
const MINIMUM_BRAKE_FORCE = 1;

/**
 * Corner-speed / braking-zone maths extracted from `PaceDriver` so AIDriver and
 * the line search share one implementation.
 */
export function cornerTargetSpeed(
  projection: TrackProjection,
  stats: VehicleStats,
  spline: TrackSpline,
  speed: number,
  options: {
    readonly cornerLookAheadMinimum: number;
    readonly cornerLookAheadSpan: number;
    readonly brakingZoneSamples: number;
    readonly cornerSafetyFactor: number;
  },
): number {
  const brakeForce = Math.max(stats.brakeForce, MINIMUM_BRAKE_FORCE);
  const brakingZone =
    options.cornerLookAheadMinimum + (speed * speed) / (2 * brakeForce);

  let target = stats.maxSpeed;
  for (let sample = 0; sample <= options.brakingZoneSamples; sample += 1) {
    const ahead = (brakingZone * sample) / options.brakingZoneSamples;
    const curvature = Math.abs(
      spline.curvatureAt(spline.wrap(projection.distance + ahead), options.cornerLookAheadSpan),
    );
    if (curvature <= STRAIGHT_CURVATURE_EPSILON) {
      continue;
    }
    const cornerLimit = options.cornerSafetyFactor * Math.sqrt(Math.max(0, stats.grip) / curvature);
    if (cornerLimit < target) {
      target = cornerLimit;
    }
  }
  return target;
}

export function speedCommand(
  targetSpeed: number,
  currentSpeed: number,
  speedControlGain: number,
  speedDeadband: number,
): { throttle: number; brake: number } {
  const error = targetSpeed - currentSpeed;
  if (Math.abs(error) <= speedDeadband) {
    return { throttle: 0, brake: 0 };
  }
  if (error > 0) {
    return { throttle: Math.min(1, error * speedControlGain), brake: 0 };
  }
  return { throttle: 0, brake: Math.min(1, -error * speedControlGain) };
}
