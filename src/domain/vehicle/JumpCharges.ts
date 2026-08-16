/**
 * Hop charges each car carries. Separate from weapons: a jump is a defensive
 * hop over oil, mines and missiles, not an item you fire.
 *
 * Four on the grid; the finish line puts the stock back to four the same way
 * oil and mines refill. Peak height and airtime come from `HOP_LAUNCH_SPEED`
 * under the shared ramp gravity — one feel knob, not a second integrator.
 */

/** Hops each car starts a lap with. */
export const JUMP_START_COUNT = 4;

/**
 * Vertical launch speed of a hop, world units/s.
 *
 * Under `RAMP_GRAVITY` (40) this is ~0.5 s of airtime and a peak of ~1.25 u,
 * long enough to clear an oil slick or mine at race speed.
 */
export const HOP_LAUNCH_SPEED = 10;

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
