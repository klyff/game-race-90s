/**
 * Nitro gauge: hold to burn, release to refill. Not discrete charges.
 * Shop tiers raise tank size and shorten fill — data only until the garage sells them.
 */

export const NITRO_STOCK_CAPACITY = 10;
export const NITRO_BURN_PER_SECOND = 1;
export const NITRO_STOCK_FILL_SECONDS = 2;
export const TURBO_SPEED_BONUS = 0.35;

/** Cumulative extra tank units (stock 10, then 12 / 16 / 22). */
export const NITRO_TIER_EXTRA = [0, 2, 6, 12] as const;

/** Seconds to refill one point, per shop tier. */
export const NITRO_TIER_FILL_SECONDS = [2, 1.8, 1.6, 1.3] as const;

/** Shop prices double each step. First upgrade cost is this; unused until the shop. */
export const NITRO_TIER_BASE_PRICE = 25_000;

export interface NitroStep {
  readonly tank: number;
  readonly burning: boolean;
}

export function clampNitroTier(tier: number): number {
  if (!Number.isFinite(tier) || tier < 0) {
    return 0;
  }
  const max = NITRO_TIER_EXTRA.length - 1;
  return tier > max ? max : Math.floor(tier);
}

export function nitroCapacityForTier(tier: number): number {
  return NITRO_STOCK_CAPACITY + NITRO_TIER_EXTRA[clampNitroTier(tier)]!;
}

export function nitroFillSecondsForTier(tier: number): number {
  return NITRO_TIER_FILL_SECONDS[clampNitroTier(tier)]!;
}

export function nitroPriceForTier(tier: number): number {
  const step = clampNitroTier(tier);
  if (step === 0) {
    return 0;
  }
  return NITRO_TIER_BASE_PRICE * 2 ** (step - 1);
}

/** Full tank at this shop tier. */
export function createNitroTank(tier = 0): number {
  return nitroCapacityForTier(tier);
}

/** Lap bonus: +count on the tank, and raise the cap so the extra is usable. */
export function awardLapTurbo(
  tank: number,
  capacity: number,
  bonus: number,
): { readonly tank: number; readonly capacity: number } {
  const extra = Number.isFinite(bonus) && bonus > 0 ? bonus : 0;
  const next = (Number.isFinite(tank) ? tank : 0) + extra;
  const cap = Number.isFinite(capacity) && capacity > 0 ? capacity : NITRO_STOCK_CAPACITY;
  return { tank: next, capacity: Math.max(cap, next) };
}

export function stepNitro(
  tank: number,
  capacity: number,
  fillSeconds: number,
  hold: boolean,
  dt: number,
): NitroStep {
  const cap = Number.isFinite(capacity) && capacity > 0 ? capacity : NITRO_STOCK_CAPACITY;
  const fill = Number.isFinite(fillSeconds) && fillSeconds > 0 ? fillSeconds : NITRO_STOCK_FILL_SECONDS;
  const current = Number.isFinite(tank) ? tank : 0;
  const step = Number.isFinite(dt) && dt > 0 ? dt : 0;
  if (hold) {
    if (current > 0) {
      return {
        tank: Math.max(0, current - NITRO_BURN_PER_SECOND * step),
        burning: true,
      };
    }
    return { tank: 0, burning: false };
  }
  return {
    tank: Math.min(cap, current + step / fill),
    burning: false,
  };
}

/** @deprecated Use createNitroTank — kept so garage/tests that still say "charges" compile. */
export const TURBO_START_COUNT = NITRO_STOCK_CAPACITY;
export const createTurboCharges = createNitroTank;
