import { describe, expect, it } from 'vitest';
import {
  NITRO_STOCK_CAPACITY,
  NITRO_STOCK_FILL_SECONDS,
  TURBO_SPEED_BONUS,
  createNitroTank,
  nitroCapacityForTier,
  nitroFillSecondsForTier,
  nitroPriceForTier,
  stepNitro,
} from '../../src/domain/vehicle/TurboCharges.ts';

describe('Nitro gauge', () => {
  it('starts full at stock 10', () => {
    expect(createNitroTank()).toBe(NITRO_STOCK_CAPACITY);
    expect(NITRO_STOCK_CAPACITY).toBe(10);
    expect(NITRO_STOCK_FILL_SECONDS).toBe(2);
    expect(TURBO_SPEED_BONUS).toBe(0.35);
  });

  it('burns 1 point per second while held', () => {
    const after = stepNitro(10, 10, 2, true, 10);
    expect(after.tank).toBeCloseTo(0, 5);
    expect(after.burning).toBe(true);
  });

  it('fills 1 point per 2 seconds when released', () => {
    const after = stepNitro(0, 10, 2, false, 20);
    expect(after.tank).toBeCloseTo(10, 5);
    expect(after.burning).toBe(false);
  });

  it('does not burn or bonus when the tank is empty', () => {
    const after = stepNitro(0, 10, 2, true, 1);
    expect(after.tank).toBe(0);
    expect(after.burning).toBe(false);
  });

  it('caps refill at capacity', () => {
    expect(stepNitro(10, 10, 2, false, 5).tank).toBe(10);
  });

  it('locks shop tiers: extra tank and faster fill, price doubles', () => {
    expect(nitroCapacityForTier(0)).toBe(10);
    expect(nitroCapacityForTier(1)).toBe(12);
    expect(nitroCapacityForTier(2)).toBe(16);
    expect(nitroCapacityForTier(3)).toBe(22);
    expect(nitroFillSecondsForTier(0)).toBe(2);
    expect(nitroFillSecondsForTier(1)).toBe(1.8);
    expect(nitroFillSecondsForTier(2)).toBe(1.6);
    expect(nitroFillSecondsForTier(3)).toBe(1.3);
    expect(nitroPriceForTier(1)).toBe(25_000);
    expect(nitroPriceForTier(2)).toBe(50_000);
    expect(nitroPriceForTier(3)).toBe(100_000);
  });
});
