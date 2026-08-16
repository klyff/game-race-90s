import { cross, dot, fromAngle, subtract } from '../math/Vec2.ts';
import type { Vec2 } from '../math/Vec2.ts';
import type { TrackSpline } from '../track/TrackSpline.ts';
import type { TrackProjection } from '../track/TrackSpline.ts';
import type { VehicleState } from '../vehicle/Vehicle.ts';

/**
 * Pure-pursuit steering maths, extracted from `PaceDriver` so T-038's AIDriver
 * and the offline line evaluator share one implementation (locked decision 27:
 * do not re-break paid-for mistakes by copying).
 */
export function pursuitSteer(
  state: VehicleState,
  aimPoint: Vec2,
  fullLockBearing: number,
): number {
  const toAim = subtract(aimPoint, state.position);
  const heading = fromAngle(state.heading);
  const bearingError = Math.atan2(cross(heading, toAim), dot(heading, toAim));
  const steer = bearingError / fullLockBearing;
  if (steer < -1) return -1;
  if (steer > 1) return 1;
  return steer;
}

/** Aim point on the centreline (or an offset line) for pure pursuit. */
export function pursuitAimPoint(
  projection: TrackProjection,
  spline: TrackSpline,
  speed: number,
  lookAheadBase: number,
  lookAheadScaleFactor: number,
  lateralOffset: number = 0,
): Vec2 {
  const lookAhead = lookAheadBase + lookAheadScaleFactor * speed;
  const aimFrame = spline.frameAt(spline.wrap(projection.distance + lookAhead));
  if (lateralOffset === 0) {
    return aimFrame.position;
  }
  return {
    x: aimFrame.position.x + aimFrame.normal.x * lateralOffset,
    y: aimFrame.position.y + aimFrame.normal.y * lateralOffset,
  };
}
