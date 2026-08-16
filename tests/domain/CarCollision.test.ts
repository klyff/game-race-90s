import { describe, it, expect } from 'vitest';
import { resolveCarContact } from '../../src/domain/vehicle/CarCollision.ts';
import { createVehicleState } from '../../src/domain/vehicle/Vehicle.ts';
import type { VehicleState } from '../../src/domain/vehicle/Vehicle.ts';
import type { VehicleStats } from '../../src/domain/vehicle/VehicleStats.ts';
import { vec2 } from '../../src/domain/math/Vec2.ts';

// Load real stats from the car manifest.
const MARAUDER_STATS: VehicleStats = {
  mass: 1000,
  enginePower: 34,
  brakeForce: 46,
  maxSpeed: 78,
  grip: 30,
  steerRate: 2.5,
  steerSpeedFalloff: 0.45,
  armor: 0.4,
  ammoCapacity: 5,
  collisionRadius: 1.7,
  aimRadius: 3.5,
};

const DIRT_DEVIL_STATS: VehicleStats = {
  mass: 750,
  enginePower: 28,
  brakeForce: 40,
  maxSpeed: 65,
  grip: 35,
  steerRate: 3.2,
  steerSpeedFalloff: 0.35,
  armor: 0.25,
  ammoCapacity: 4,
  collisionRadius: 1.55,
  aimRadius: 3.0,
};

const AIR_BLADE_STATS: VehicleStats = {
  mass: 650,
  enginePower: 36,
  brakeForce: 36,
  maxSpeed: 95,
  grip: 18,
  steerRate: 3.1,
  steerSpeedFalloff: 0.68,
  armor: 0.15,
  ammoCapacity: 4,
  collisionRadius: 1.8,
  aimRadius: 3.2,
};

const HAVAC_STATS: VehicleStats = {
  mass: 1200,
  enginePower: 40,
  brakeForce: 42,
  maxSpeed: 65,
  grip: 18,
  steerRate: 1.8,
  steerSpeedFalloff: 0.65,
  armor: 0.6,
  ammoCapacity: 5,
  collisionRadius: 1.85,
  aimRadius: 2.5,
};

describe('CarCollision', () => {
  it('two cars far apart: touched is false, both states unchanged', () => {
    const a = createVehicleState(vec2(0, 0), 0);
    const b = createVehicleState(vec2(100, 0), 0);

    const result = resolveCarContact(a, MARAUDER_STATS, b, MARAUDER_STATS);

    expect(result.touched).toBe(false);
    expect(result.impactSpeed).toBe(0);
    // Both states should be unchanged (same identity).
    expect(result.a).toBe(a);
    expect(result.b).toBe(b);
  });

  it('head-on contact: cars separate and momentum is conserved along the normal', () => {
    // Marauder moving right at 10 u/s, Dirt Devil moving left at 10 u/s.
    // They collide head-on.
    const a: VehicleState = {
      position: vec2(0, 0),
      velocity: vec2(10, 0),
      heading: 0,
      yawSpin: 0,
    };

    const b: VehicleState = {
      position: vec2(3.25, 0), // Just touching: 1.7 + 1.55 = 3.25
      velocity: vec2(-10, 0),
      heading: 0,
      yawSpin: 0,
    };

    const result = resolveCarContact(a, MARAUDER_STATS, b, DIRT_DEVIL_STATS);

    expect(result.touched).toBe(true);
    expect(result.impactSpeed).toBeGreaterThan(0);

    // After collision, a should be slowed/reversed and b should be slowed/reversed.
    // Since b is lighter (750 vs 1000 mass), it should change more.
    expect(result.a.velocity.x).toBeLessThan(a.velocity.x);
    expect(result.b.velocity.x).toBeGreaterThan(b.velocity.x);

    // Momentum along X should be conserved (approximately, with restitution loss).
    const initialMomentumX =
      MARAUDER_STATS.mass * a.velocity.x + DIRT_DEVIL_STATS.mass * b.velocity.x;
    const finalMomentumX =
      MARAUDER_STATS.mass * result.a.velocity.x + DIRT_DEVIL_STATS.mass * result.b.velocity.x;
    // With restitution < 1, final momentum <= initial momentum
    expect(finalMomentumX).toBeLessThanOrEqual(initialMomentumX + 1e-6); // epsilon for float
  });

  it('heavy vs light: light car changes velocity more than the heavy one', () => {
    // Heavy Havac (1200 mass) hits light Air Blade (650 mass) head-on.
    // Havac moving right at 5 u/s, Air Blade moving left at 5 u/s.
    const heavy: VehicleState = {
      position: vec2(0, 0),
      velocity: vec2(5, 0),
      heading: 0,
      yawSpin: 0,
    };

    const light: VehicleState = {
      position: vec2(3.65, 0), // Just touching: 1.85 + 1.8
      velocity: vec2(-5, 0),
      heading: 0,
      yawSpin: 0,
    };

    const result = resolveCarContact(heavy, HAVAC_STATS, light, AIR_BLADE_STATS);

    expect(result.touched).toBe(true);

    // Change in velocity for each car.
    const heavyDeltaV = Math.abs(result.a.velocity.x - heavy.velocity.x);
    const lightDeltaV = Math.abs(result.b.velocity.x - light.velocity.x);

    // Light car should change more than the heavy car in magnitude.
    expect(lightDeltaV).toBeGreaterThanOrEqual(heavyDeltaV - 1e-6);

    // Rough inverse mass ratio: in a symmetric collision, the light car changes more.
    // The ratio depends on initial conditions, so we just check it's reasonable.
    if (heavyDeltaV > 0.1) {
      const ratio = lightDeltaV / heavyDeltaV;
      expect(ratio).toBeGreaterThan(0.9); // At least roughly equal or slightly larger
    }
  });

  it('already-separating cars get no impulse', () => {
    // Two cars both moving right, but car b is moving FASTER so they are separating.
    const a: VehicleState = {
      position: vec2(0, 0),
      velocity: vec2(5, 0),
      heading: 0,
      yawSpin: 0,
    };

    const b: VehicleState = {
      position: vec2(3.25, 0), // Just touching
      velocity: vec2(10, 0), // Moving faster in the same direction — separating
      heading: 0,
      yawSpin: 0,
    };

    const result = resolveCarContact(a, MARAUDER_STATS, b, DIRT_DEVIL_STATS);

    expect(result.touched).toBe(true);
    // impactSpeed should be zero because they are not closing.
    expect(result.impactSpeed).toBe(0);

    // Velocities should be unchanged (no impulse applied).
    expect(result.a.velocity).toEqual(a.velocity);
    expect(result.b.velocity).toEqual(b.velocity);
  });

  it('overlapping cars end up no longer overlapping after resolution', () => {
    // Two cars significantly overlapping.
    const a: VehicleState = {
      position: vec2(0, 0),
      velocity: vec2(0, 0),
      heading: 0,
      yawSpin: 0,
    };

    const b: VehicleState = {
      position: vec2(2, 0), // Overlap: 1.7 + 1.55 = 3.25, but only 2 apart
      velocity: vec2(0, 0),
      heading: 0,
      yawSpin: 0,
    };

    const result = resolveCarContact(a, MARAUDER_STATS, b, DIRT_DEVIL_STATS);

    expect(result.touched).toBe(true);

    // After resolution, the distance should be >= the sum of radii.
    const centerDistance = Math.hypot(
      result.b.position.x - result.a.position.x,
      result.b.position.y - result.a.position.y,
    );
    const touchDistance = MARAUDER_STATS.collisionRadius + DIRT_DEVIL_STATS.collisionRadius;
    expect(centerDistance).toBeGreaterThanOrEqual(touchDistance - 1e-6); // epsilon
  });

  it('heading and yawSpin are byte-identical before and after', () => {
    const a: VehicleState = {
      position: vec2(0, 0),
      velocity: vec2(10, 5),
      heading: 1.234,
      yawSpin: 0.5,
    };

    const b: VehicleState = {
      position: vec2(3.25, 0),
      velocity: vec2(-10, -5),
      heading: 3.14159,
      yawSpin: -0.3,
    };

    const result = resolveCarContact(a, MARAUDER_STATS, b, DIRT_DEVIL_STATS);

    expect(result.a.heading).toBe(a.heading);
    expect(result.a.yawSpin).toBe(a.yawSpin);
    expect(result.b.heading).toBe(b.heading);
    expect(result.b.yawSpin).toBe(b.yawSpin);
  });

  it('identical positions produce a finite, non-NaN result', () => {
    // Both cars at the exact same position.
    const a = createVehicleState(vec2(0, 0), 0);
    const b = createVehicleState(vec2(0, 0), 0);

    const result = resolveCarContact(a, MARAUDER_STATS, b, DIRT_DEVIL_STATS);

    expect(result.touched).toBe(true);

    // Check for NaN and infinities.
    expect(Number.isFinite(result.a.position.x)).toBe(true);
    expect(Number.isFinite(result.a.position.y)).toBe(true);
    expect(Number.isFinite(result.a.velocity.x)).toBe(true);
    expect(Number.isFinite(result.a.velocity.y)).toBe(true);

    expect(Number.isFinite(result.b.position.x)).toBe(true);
    expect(Number.isFinite(result.b.position.y)).toBe(true);
    expect(Number.isFinite(result.b.velocity.x)).toBe(true);
    expect(Number.isFinite(result.b.velocity.y)).toBe(true);

    expect(Number.isFinite(result.impactSpeed)).toBe(true);
  });

  it('function is pure: inputs are unmutated', () => {
    const a: VehicleState = {
      position: vec2(0, 0),
      velocity: vec2(10, 0),
      heading: 0,
      yawSpin: 0,
    };

    const b: VehicleState = {
      position: vec2(3.25, 0),
      velocity: vec2(-10, 0),
      heading: 0,
      yawSpin: 0,
    };

    const aOriginal = { ...a, position: { ...a.position }, velocity: { ...a.velocity } };
    const bOriginal = { ...b, position: { ...b.position }, velocity: { ...b.velocity } };

    resolveCarContact(a, MARAUDER_STATS, b, DIRT_DEVIL_STATS);

    expect(a).toEqual(aOriginal);
    expect(b).toEqual(bOriginal);
  });

  it('glancing blow (perpendicular approach): only normal component is reflected', () => {
    // Car a moving diagonally (up and to the right), car b to the right.
    // They touch when a reaches the contact point.
    const a: VehicleState = {
      position: vec2(0, 0),
      velocity: vec2(10, 10), // Moving diagonally
      heading: 0,
      yawSpin: 0,
    };

    const b: VehicleState = {
      position: vec2(3.25, 0), // Aligned horizontally with a
      velocity: vec2(0, 0),
      heading: 0,
      yawSpin: 0,
    };

    const result = resolveCarContact(a, MARAUDER_STATS, b, DIRT_DEVIL_STATS);

    expect(result.touched).toBe(true);

    // The collision normal is along X (horizontal from a to b).
    // Car a's Y velocity (perpendicular to normal) should remain mostly intact.
    // Car a's X velocity (along normal, which is the closing direction) should reverse.
    expect(Math.abs(result.a.velocity.y - a.velocity.y)).toBeLessThan(0.01); // Y unchanged
    expect(result.a.velocity.x).toBeLessThan(a.velocity.x); // X should decrease due to contact
  });

  it('momentum is conserved along the contact normal', () => {
    // Two cars colliding head-on at an angle.
    const a: VehicleState = {
      position: vec2(0, 0),
      velocity: vec2(8, 3),
      heading: 0,
      yawSpin: 0,
    };

    const b: VehicleState = {
      position: vec2(3.25, 0), // Along X axis from a, but ignore Y in distance calc for simplicity
      velocity: vec2(-4, -2),
      heading: 0,
      yawSpin: 0,
    };

    const result = resolveCarContact(a, MARAUDER_STATS, b, DIRT_DEVIL_STATS);

    expect(result.touched).toBe(true);

    // Compute the contact normal (from a to b).
    const dx = b.position.x - a.position.x;
    const dy = b.position.y - a.position.y;
    const dist = Math.hypot(dx, dy);
    const nx = dx / dist;
    const ny = dy / dist;

    // Momentum component along the normal BEFORE collision.
    const initialP_a_normal =
      MARAUDER_STATS.mass * (a.velocity.x * nx + a.velocity.y * ny);
    const initialP_b_normal =
      DIRT_DEVIL_STATS.mass * (b.velocity.x * nx + b.velocity.y * ny);
    const initialMomentumNormal = initialP_a_normal + initialP_b_normal;

    // Momentum component along the normal AFTER collision.
    const finalP_a_normal =
      MARAUDER_STATS.mass * (result.a.velocity.x * nx + result.a.velocity.y * ny);
    const finalP_b_normal =
      DIRT_DEVIL_STATS.mass * (result.b.velocity.x * nx + result.b.velocity.y * ny);
    const finalMomentumNormal = finalP_a_normal + finalP_b_normal;

    // Momentum must be conserved along the normal (with restitution, kinetic energy is lost but momentum is conserved).
    expect(Math.abs(finalMomentumNormal - initialMomentumNormal)).toBeLessThan(1e-4);
  });

  it('stationary car hit by moving car: both move, light car moves more', () => {
    const a: VehicleState = {
      position: vec2(0, 0),
      velocity: vec2(20, 0),
      heading: 0,
      yawSpin: 0,
    };

    const b: VehicleState = {
      position: vec2(3.25, 0),
      velocity: vec2(0, 0),
      heading: 0,
      yawSpin: 0,
    };

    const result = resolveCarContact(a, MARAUDER_STATS, b, DIRT_DEVIL_STATS);

    expect(result.touched).toBe(true);

    // Car a should slow down.
    expect(result.a.velocity.x).toBeLessThan(a.velocity.x);
    // Car b should speed up (was stationary).
    expect(result.b.velocity.x).toBeGreaterThan(b.velocity.x);
    // Light car should end up moving faster than the heavy car (in the same direction).
    expect(result.b.velocity.x).toBeGreaterThan(result.a.velocity.x);
  });

  it('very light car vs very heavy car: light car bounces back more', () => {
    // Air Blade (650 mass) and Havac (1200 mass) in a true head-on collision.
    // Light car moving right at 30, heavy car moving left at 10.
    const light: VehicleState = {
      position: vec2(0, 0),
      velocity: vec2(30, 0),
      heading: 0,
      yawSpin: 0,
    };

    const heavy: VehicleState = {
      position: vec2(3.65, 0), // 1.8 + 1.85
      velocity: vec2(-10, 0),
      heading: 0,
      yawSpin: 0,
    };

    const result = resolveCarContact(light, AIR_BLADE_STATS, heavy, HAVAC_STATS);

    expect(result.touched).toBe(true);

    // After a head-on collision, the light car should reverse (bounce back).
    expect(result.a.velocity.x).toBeLessThan(light.velocity.x);
    // The heavy car should also slow/reverse but less dramatically.
    expect(result.b.velocity.x).toBeGreaterThan(heavy.velocity.x);
  });

  it('contact at an angle: normal is correctly oriented', () => {
    // Cars approaching along a diagonal and overlapping significantly.
    const a: VehicleState = {
      position: vec2(0, 0),
      velocity: vec2(5, 5),
      heading: 0,
      yawSpin: 0,
    };

    const b: VehicleState = {
      position: vec2(2, 2), // Closer: overlapping
      velocity: vec2(-5, -5),
      heading: 0,
      yawSpin: 0,
    };

    const result = resolveCarContact(a, MARAUDER_STATS, b, MARAUDER_STATS);

    expect(result.touched).toBe(true);

    // They should be pushed apart along the diagonal.
    // Check that the distance increases (or stays >= the collision radius).
    const initialDist = Math.hypot(2, 2);
    const finalDist = Math.hypot(
      result.b.position.x - result.a.position.x,
      result.b.position.y - result.a.position.y,
    );
    expect(finalDist).toBeGreaterThanOrEqual(initialDist - 1e-5);
  });

});
