import { findTrack } from '../../src/data/tracks/registry.ts';
import { TrackSpline } from '../../src/domain/track/TrackSpline.ts';
import type { TrackProjection } from '../../src/domain/track/TrackSpline.ts';
import { trackFullHalfWidth } from '../../src/domain/track/TrackDefinition.ts';
import { resolveWallContact, surfaceAt } from '../../src/domain/track/TrackCollision.ts';
import { OFFROAD, TARMAC } from '../../src/domain/vehicle/ArcadeCarPhysics.ts';
import type { VehicleState } from '../../src/domain/vehicle/Vehicle.ts';
import { add, length, scale } from '../../src/domain/math/Vec2.ts';
import type { Vec2 } from '../../src/domain/math/Vec2.ts';

/**
 * Real circuit fixture, exactly as `tests/domain/TrackSpline.test.ts` builds
 * one: `resolveWallContact` is written against Thunder Basin's actual wall
 * width (29 units: 20 half-width + 9 shoulder), so a synthetic circle would
 * not exercise the real `trackFullHalfWidth`.
 */
const track = findTrack('thunder-basin');
const spline = new TrackSpline(track.controlPoints);

/** Marauder's authored collision radius; any positive value would do. */
const CAR_RADIUS = 1.7;
const WALL_LIMIT = trackFullHalfWidth(track) - CAR_RADIUS;

/**
 * A frame in the middle of the bottom straight, far from the hairpin (which
 * loops back close to this same corner of the map) and from the sweeper, so
 * a point offset tens of units sideways still projects back unambiguously
 * onto this same stretch of road rather than onto a different part of the
 * lap.
 */
const anchor: TrackProjection = spline.project({ x: -60, y: -162 });

function buildState(position: Vec2, velocity: Vec2): VehicleState {
  return { position, velocity, heading: 1.23, yawSpin: 0.45 };
}

/** A projection at `anchor`'s frame but with an overridden lateral offset. */
function projectionAt(lateralOffset: number): TrackProjection {
  return { ...anchor, lateralOffset };
}

describe('surfaceAt', () => {
  it('is tarmac at the centreline', () => {
    expect(surfaceAt(0, track)).toBe(TARMAC);
  });

  it('is tarmac just inside halfWidth, on both sides', () => {
    expect(surfaceAt(track.halfWidth - 0.001, track)).toBe(TARMAC);
    expect(surfaceAt(-(track.halfWidth - 0.001), track)).toBe(TARMAC);
  });

  it('is tarmac exactly at halfWidth, on both sides', () => {
    expect(surfaceAt(track.halfWidth, track)).toBe(TARMAC);
    expect(surfaceAt(-track.halfWidth, track)).toBe(TARMAC);
  });

  it('is offroad just outside halfWidth, on both sides', () => {
    expect(surfaceAt(track.halfWidth + 0.001, track)).toBe(OFFROAD);
    expect(surfaceAt(-(track.halfWidth + 0.001), track)).toBe(OFFROAD);
  });

  it('is offroad far outside the road, on both sides', () => {
    expect(surfaceAt(track.halfWidth + 100, track)).toBe(OFFROAD);
    expect(surfaceAt(-(track.halfWidth + 100), track)).toBe(OFFROAD);
  });
});

describe('resolveWallContact — no contact', () => {
  it('returns the state unchanged, field by field, well inside the road', () => {
    const position = add(anchor.position, scale(anchor.normal, 5));
    const state = buildState(position, { x: 12, y: -3 });
    const projection = projectionAt(5);

    const result = resolveWallContact(state, projection, track, CAR_RADIUS);

    expect(result.touchedWall).toBe(false);
    expect(result.impactSpeed).toBe(0);
    expect(result.state.position).toEqual(state.position);
    expect(result.state.velocity).toEqual(state.velocity);
    expect(result.state.heading).toBe(state.heading);
    expect(result.state.yawSpin).toBe(state.yawSpin);
  });

  it('has no contact exactly at the wall limit', () => {
    const projection = projectionAt(WALL_LIMIT);
    const state = buildState(anchor.position, { x: 0, y: 0 });

    const result = resolveWallContact(state, projection, track, CAR_RADIUS);

    expect(result.touchedWall).toBe(false);
  });
});

describe('resolveWallContact — position correction', () => {
  it('pushes a left-wall overlap back onto the limit, verified by re-projecting', () => {
    const offset = WALL_LIMIT + 3;
    const position = add(anchor.position, scale(anchor.normal, offset));
    const projection = spline.project(position);
    const state = buildState(position, scale(projection.normal, 10));

    const result = resolveWallContact(state, projection, track, CAR_RADIUS);

    expect(result.touchedWall).toBe(true);
    const check = spline.project(result.state.position);
    expect(check.lateralOffset).toBeGreaterThan(0);
    expect(Math.abs(check.lateralOffset - WALL_LIMIT)).toBeLessThan(0.5);
  });

  it('pushes a right-wall overlap back onto the limit, verified by re-projecting', () => {
    const offset = -(WALL_LIMIT + 3);
    const position = add(anchor.position, scale(anchor.normal, offset));
    const projection = spline.project(position);
    const state = buildState(position, scale(projection.normal, -10));

    const result = resolveWallContact(state, projection, track, CAR_RADIUS);

    expect(result.touchedWall).toBe(true);
    const check = spline.project(result.state.position);
    expect(check.lateralOffset).toBeLessThan(0);
    expect(Math.abs(Math.abs(check.lateralOffset) - WALL_LIMIT)).toBeLessThan(0.5);
  });

  it('never leaves the car outside the wall even for a huge overshoot at high speed and a large dt', () => {
    // A car at 95 units/s (faster than any authored maxSpeed) with dt = 0.5 s
    // covers 47.5 units in one naive kinematic step — deep past the wall if
    // nothing had caught it. Anti-tunnelling means the corrected position
    // must still land on the limit, not merely closer to it.
    const startOffset = 5;
    const dt = 0.5;
    const speed = 95;
    const startPosition = add(anchor.position, scale(anchor.normal, startOffset));
    const velocity = scale(anchor.normal, speed);
    const rawPosition = add(startPosition, scale(velocity, dt));

    const projection = spline.project(rawPosition);
    const state = buildState(rawPosition, velocity);

    const result = resolveWallContact(state, projection, track, CAR_RADIUS);

    expect(result.touchedWall).toBe(true);
    const check = spline.project(result.state.position);
    expect(Math.abs(check.lateralOffset)).toBeLessThanOrEqual(WALL_LIMIT + 0.5);
    expect(Math.abs(Math.abs(check.lateralOffset) - WALL_LIMIT)).toBeLessThan(0.5);
  });
});

describe('resolveWallContact — velocity response', () => {
  it('reverses and damps a head-on hit to about 30% speed', () => {
    const wallSign = 1;
    const offset = WALL_LIMIT + 1;
    const position = add(anchor.position, scale(anchor.normal, offset));
    const projection = spline.project(position);
    const impactVelocity = scale(projection.normal, wallSign * 40);
    const state = buildState(position, impactVelocity);

    const result = resolveWallContact(state, projection, track, CAR_RADIUS);

    expect(result.impactSpeed).toBeCloseTo(40, 0);
    const resolvedNormalComponent = wallSign * length(result.state.velocity);
    // The velocity is now almost entirely along the (reversed) normal, so its
    // signed projection back onto the wall-inward direction is negative.
    expect(result.state.velocity.x * projection.normal.x + result.state.velocity.y * projection.normal.y)
      .toBeCloseTo(-40 * 0.3, 0);
    expect(resolvedNormalComponent).toBeGreaterThan(0); // magnitude sanity, sign checked above
    expect(length(result.state.velocity)).toBeCloseTo(40 * 0.3, 0);
  });

  it('keeps about 85% of tangential speed on a glancing hit', () => {
    const wallSign = 1;
    const offset = WALL_LIMIT + 1;
    const position = add(anchor.position, scale(anchor.normal, offset));
    const projection = spline.project(position);
    const tangentialSpeed = 50;
    const smallInward = 2;
    const velocity = add(
      scale(projection.tangent, tangentialSpeed),
      scale(projection.normal, wallSign * smallInward),
    );
    const state = buildState(position, velocity);

    const result = resolveWallContact(state, projection, track, CAR_RADIUS);

    expect(length(result.state.velocity)).toBeCloseTo(tangentialSpeed * 0.85, 0);
  });

  it('leaves velocity pointing away from the wall untouched in sign, even while still overlapping', () => {
    const wallSign = 1;
    const offset = WALL_LIMIT + 1;
    const position = add(anchor.position, scale(anchor.normal, offset));
    const projection = spline.project(position);
    // Moving OUT of the wall: normal component has the opposite sign to the
    // overshoot.
    const outwardVelocity = add(
      scale(projection.tangent, 20),
      scale(projection.normal, -wallSign * 15),
    );
    const state = buildState(position, outwardVelocity);

    const result = resolveWallContact(state, projection, track, CAR_RADIUS);

    expect(result.impactSpeed).toBe(0);
    const originalNormalComponent =
      outwardVelocity.x * projection.normal.x + outwardVelocity.y * projection.normal.y;
    const resolvedNormalComponent =
      result.state.velocity.x * projection.normal.x + result.state.velocity.y * projection.normal.y;
    expect(Math.sign(resolvedNormalComponent)).toBe(Math.sign(originalNormalComponent));
    expect(resolvedNormalComponent).toBeCloseTo(originalNormalComponent, 5);
  });

  it('reports impactSpeed near zero for a pure glancing contact and large for a head-on one', () => {
    const offset = WALL_LIMIT + 1;
    const position = add(anchor.position, scale(anchor.normal, offset));
    const projection = spline.project(position);

    const pureGlance = buildState(position, scale(projection.tangent, 60));
    const glanceResult = resolveWallContact(pureGlance, projection, track, CAR_RADIUS);
    expect(glanceResult.impactSpeed).toBeCloseTo(0, 5);

    const headOn = buildState(position, scale(projection.normal, 50));
    const headOnResult = resolveWallContact(headOn, projection, track, CAR_RADIUS);
    expect(headOnResult.impactSpeed).toBeCloseTo(50, 0);
    expect(headOnResult.impactSpeed).toBeGreaterThan(glanceResult.impactSpeed + 10);
  });
});

describe('resolveWallContact — untouched fields', () => {
  it('never modifies heading or yawSpin, on contact or off', () => {
    const noContact = buildState(add(anchor.position, scale(anchor.normal, 5)), { x: 1, y: 1 });
    const noContactResult = resolveWallContact(noContact, projectionAt(5), track, CAR_RADIUS);
    expect(noContactResult.state.heading).toBe(noContact.heading);
    expect(noContactResult.state.yawSpin).toBe(noContact.yawSpin);

    const offset = WALL_LIMIT + 4;
    const position = add(anchor.position, scale(anchor.normal, offset));
    const projection = spline.project(position);
    const contact = buildState(position, scale(projection.normal, 30));
    const contactResult = resolveWallContact(contact, projection, track, CAR_RADIUS);
    expect(contactResult.state.heading).toBe(contact.heading);
    expect(contactResult.state.yawSpin).toBe(contact.yawSpin);
  });
});

/**
 * The returned `lateralOffset` exists because the offset carried by the
 * projection ARGUMENT describes where the car was before the wall pushed it
 * back — a different number during any contact. A caller that reported the
 * projection's own value would claim the car was 40 units off the centreline
 * on a track whose wall limit is 27.3, which is exactly the misreport that hid
 * a projection bug during T-024 verification.
 */
describe('resolveWallContact — reported lateral offset', () => {
  it('passes the projection offset straight through when there is no contact', () => {
    const position = add(anchor.position, scale(anchor.normal, 5));
    const result = resolveWallContact(buildState(position, { x: 1, y: 1 }), projectionAt(5), track, CAR_RADIUS);

    expect(result.lateralOffset).toBe(5);
  });

  it('reports the CORRECTED offset, not the overshoot, on the left wall', () => {
    const overshoot = WALL_LIMIT + 13;
    const position = add(anchor.position, scale(anchor.normal, overshoot));
    const result = resolveWallContact(buildState(position, { x: 1, y: 1 }), projectionAt(overshoot), track, CAR_RADIUS);

    expect(result.touchedWall).toBe(true);
    expect(result.lateralOffset).toBeCloseTo(WALL_LIMIT, 10);
  });

  it('reports the CORRECTED offset on the right wall, keeping the sign', () => {
    const overshoot = -(WALL_LIMIT + 13);
    const position = add(anchor.position, scale(anchor.normal, overshoot));
    const result = resolveWallContact(buildState(position, { x: 1, y: 1 }), projectionAt(overshoot), track, CAR_RADIUS);

    expect(result.lateralOffset).toBeCloseTo(-WALL_LIMIT, 10);
  });

  it('agrees with re-projecting the corrected position', () => {
    const overshoot = WALL_LIMIT + 8;
    const position = add(anchor.position, scale(anchor.normal, overshoot));
    const result = resolveWallContact(buildState(position, { x: 4, y: 4 }), projectionAt(overshoot), track, CAR_RADIUS);

    expect(spline.project(result.state.position).lateralOffset).toBeCloseTo(result.lateralOffset, 3);
  });
});
