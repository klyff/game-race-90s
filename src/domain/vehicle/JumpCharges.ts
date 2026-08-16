import type { VehicleStats } from './VehicleStats.ts';

/**
 * Hop charges each car carries. Separate from weapons: a jump is a defensive
 * hop over oil, mines and missiles, not an item you fire.
 *
 * Four on the grid; the finish line puts the stock back to four the same way
 * oil and mines refill. Peak height and airtime come from `hopLaunchSpeed`
 * under the shared ramp gravity — one feel knob, scaled by how light and
 * fast the car is, not a second integrator.
 */

/** Hops each car starts a lap with. */
export const JUMP_START_COUNT = 4;

/**
 * Vertical launch speed of a hop for a mid-table car, world units/s.
 *
 * Under `RAMP_GRAVITY` (40) this is ~0.5 s of airtime and a peak of ~1.25 u,
 * long enough to clear an oil slick or mine at race speed. Light, fast cars
 * launch a little harder; heavy, slow cars a little softer.
 */
export const HOP_LAUNCH_SPEED = 10;

/** Mass and top speed the baseline hop is authored against (car-1 / marauder). */
export const HOP_REF_MASS = 1000;
export const HOP_REF_SPEED = 78;

/** How far a hop may drift from the baseline. Felt, not decisive. */
export const HOP_SCALE_MIN = 0.82;
export const HOP_SCALE_MAX = 1.22;

/**
 * Launch speed for this car's hop. Geometric mean of lightness and pace so
 * a featherweight sprinter jumps farther and a tank hops shorter, without
 * either stat dominating.
 */
export function hopLaunchSpeed(stats: Pick<VehicleStats, 'mass' | 'maxSpeed'>): number {
  const mass = Number.isFinite(stats.mass) && stats.mass > 0 ? stats.mass : HOP_REF_MASS;
  const speed = Number.isFinite(stats.maxSpeed) && stats.maxSpeed > 0 ? stats.maxSpeed : HOP_REF_SPEED;
  const scale = clamp(Math.sqrt((HOP_REF_MASS / mass) * (speed / HOP_REF_SPEED)), HOP_SCALE_MIN, HOP_SCALE_MAX);
  return HOP_LAUNCH_SPEED * scale;
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function createJumpCharges(): number {
  return JUMP_START_COUNT;
}

export function consumeJump(current: number): number | null {
  const stock = Number.isFinite(current) ? current : 0;
  if (stock <= 0) {
    return null;
  }
  return stock - 1;
}

/** Finish-line refill. Never reduces a stock that is already above the start count. */
export function refillJumpCharges(current: number): number {
  const stock = Number.isFinite(current) ? current : 0;
  return Math.max(stock, JUMP_START_COUNT);
}
