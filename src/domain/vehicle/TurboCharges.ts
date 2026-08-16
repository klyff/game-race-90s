/**
 * Consumable turbo: four charges, +35% pace for two seconds, refill at the line.
 */

export const TURBO_START_COUNT = 4;
export const TURBO_DURATION_SECONDS = 2;
export const TURBO_SPEED_BONUS = 0.35;

export function createTurboCharges(): number {
  return TURBO_START_COUNT;
}

export function consumeTurbo(current: number): number | null {
  const stock = Number.isFinite(current) ? current : 0;
  if (stock <= 0) {
    return null;
  }
  return stock - 1;
}

export function refillTurboCharges(current: number): number {
  const stock = Number.isFinite(current) ? current : 0;
  return Math.max(stock, TURBO_START_COUNT);
}
