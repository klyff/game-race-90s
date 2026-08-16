import { OFFROAD, TARMAC } from '../vehicle/ArcadeCarPhysics.ts';
import type { SurfaceConditions, VehicleState } from '../vehicle/Vehicle.ts';
import { add, dot, scale, subtract } from '../math/Vec2.ts';
import type { Vec2 } from '../math/Vec2.ts';
import { trackFullHalfWidth } from './TrackDefinition.ts';
import type { TrackDefinition } from './TrackDefinition.ts';
import type { TrackProjection } from './TrackSpline.ts';

/**
 * Velocity retained along the wall-inward normal on a head-on hit, RNR-style
 * "scrape and continue" rather than a hard bounce. Low on purpose: a car that
 * plants itself into a wall should mostly stop advancing into it, not spring
 * back into traffic.
 */
const WALL_RESTITUTION = 0.3;

/**
 * Fraction of tangential (along-the-wall) speed shaved off on contact, so that
 * scraping a wall costs lap time even when the car survives it with most of
 * its speed intact.
 */
const WALL_SCRUB = 0.15;

/** Result of testing a car against the track walls this step. */
export interface WallResolution {
  /** Corrected state; identical object contents to the input when there is no contact. */
  readonly state: VehicleState;
  readonly touchedWall: boolean;
  /** Speed INTO the wall before correction, world units/s. Zero when there is no contact. */
  readonly impactSpeed: number;
  /**
   * Lateral offset of the CORRECTED position, so callers never have to reason
   * about whether the projection they passed in is still true of the car. The
   * projection's own `lateralOffset` describes where the car was before the wall
   * pushed it back, which is a different number during any contact.
   */
  readonly lateralOffset: number;
}

/**
 * Ground conditions from lateral offset alone: off the racing surface beyond
 * `halfWidth`, tarmac inside it. Deliberately this simple — see decision 11 in
 * WORKLOG.md, drag must stay a function of the car, never of the surface, so
 * this function must never touch anything related to drag.
 */
export function surfaceAt(lateralOffset: number, track: TrackDefinition): SurfaceConditions {
  return Math.abs(lateralOffset) > track.halfWidth ? OFFROAD : TARMAC;
}

/**
 * Keeps a car's centre inside the wall-to-wall envelope and turns an impact
 * into a scrape rather than a bounce, Rock N Roll Racing style.
 *
 * The wall sits at `trackFullHalfWidth(track)`; a car of radius `carRadius`
 * therefore has its own limit, `wallLimit`, short of that by its radius. Past
 * that limit the car is pushed back onto the limit along the projection's
 * NORMAL — not re-projected onto the spline, which would only be exact for a
 * straight wall and could disagree with the velocity correction on a curve.
 *
 * Velocity is split into the component along the normal (signed, positive
 * meaning "further left") and the tangential remainder. Only the part that
 * points INTO the wall is reflected and damped: a car already sliding back out
 * of a scrape must not be yanked back in. The tangential part is always
 * scrubbed a little, so a scrape always costs some speed even when it is
 * perfectly glancing.
 */
export function resolveWallContact(
  state: VehicleState,
  projection: TrackProjection,
  track: TrackDefinition,
  carRadius: number,
): WallResolution {
  const wallLimit = trackFullHalfWidth(track) - carRadius;
  const lateralOffset = projection.lateralOffset;

  if (Math.abs(lateralOffset) <= wallLimit) {
    return { state, touchedWall: false, impactSpeed: 0, lateralOffset };
  }

  const wallSign = Math.sign(lateralOffset);
  const normal = projection.normal;

  // Move the centre back onto the limit along the normal, from the overshoot,
  // rather than re-projecting — this is exact regardless of local curvature
  // and can never leave the car short of (or past) the limit.
  const targetOffset = wallSign * wallLimit;
  const correction: Vec2 = scale(normal, targetOffset - lateralOffset);
  const position = add(state.position, correction);

  const normalComponent = dot(state.velocity, normal);
  const tangentialVelocity = subtract(state.velocity, scale(normal, normalComponent));

  // "Into the wall" means the normal component pushes further towards the
  // side that overshot: same sign as `wallSign`. A component already pointing
  // the other way is a car leaving the wall and must be left untouched.
  const movingIntoWall = normalComponent * wallSign > 0;
  const impactSpeed = movingIntoWall ? Math.abs(normalComponent) : 0;
  const resolvedNormalComponent = movingIntoWall
    ? -normalComponent * WALL_RESTITUTION
    : normalComponent;

  const velocity = add(
    scale(normal, resolvedNormalComponent),
    scale(tangentialVelocity, 1 - WALL_SCRUB),
  );

  const nextState: VehicleState = {
    position,
    velocity,
    heading: state.heading,
    yawSpin: state.yawSpin,
  };

  return { state: nextState, touchedWall: true, impactSpeed, lateralOffset: targetOffset };
}
