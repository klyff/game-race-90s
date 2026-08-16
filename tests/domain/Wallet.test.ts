import { describe, it, expect } from 'vitest';
import {
  BASE_FIRST_PRIZE,
  firstPlacePrize,
  formatCash,
  podiumPrize,
  prizeTable,
  weaponHitEarnings,
} from '../../src/domain/progress/Wallet.ts';

describe('Wallet — prize table', () => {
  it('pays $100,000 for 1st on planet 1 track 1', () => {
    expect(firstPlacePrize(1, 1)).toBe(BASE_FIRST_PRIZE);
    expect(prizeTable(1, 1)).toEqual({
      first: 100_000,
      second: 50_000,
      third: 25_000,
    });
  });

  it('grows with each later track on the same planet', () => {
    expect(firstPlacePrize(1, 2)).toBeGreaterThan(firstPlacePrize(1, 1));
    expect(firstPlacePrize(1, 3)).toBeGreaterThan(firstPlacePrize(1, 2));
  });

  it('grows with each later planet', () => {
    expect(firstPlacePrize(2, 1)).toBeGreaterThan(firstPlacePrize(1, 1));
    expect(firstPlacePrize(3, 1)).toBeGreaterThan(firstPlacePrize(2, 1));
  });

  it('pays only the podium: 1st / 2nd / 3rd, nothing for 4th', () => {
    expect(podiumPrize(1, 1, 1)).toBe(100_000);
    expect(podiumPrize(2, 1, 1)).toBe(50_000);
    expect(podiumPrize(3, 1, 1)).toBe(25_000);
    expect(podiumPrize(4, 1, 1)).toBe(0);
    expect(podiumPrize(5, 1, 1)).toBe(0);
  });
});

describe('Wallet — weapon hits', () => {
  it('pays a little for each player weapon that lands', () => {
    expect(weaponHitEarnings({ missiles: 1, oil: 0, mines: 0 }, 1)).toBe(2_500);
    expect(weaponHitEarnings({ missiles: 0, oil: 1, mines: 0 }, 1)).toBe(1_000);
    expect(weaponHitEarnings({ missiles: 0, oil: 0, mines: 1 }, 1)).toBe(4_000);
    expect(weaponHitEarnings({ missiles: 2, oil: 1, mines: 1 }, 1)).toBe(10_000);
  });

  it('grows hit bounties on later planets', () => {
    const p1 = weaponHitEarnings({ missiles: 1, oil: 0, mines: 0 }, 1);
    const p2 = weaponHitEarnings({ missiles: 1, oil: 0, mines: 0 }, 2);
    expect(p2).toBeGreaterThan(p1);
  });
});

describe('Wallet — formatCash', () => {
  it('formats with a dollar sign and thousands separators', () => {
    expect(formatCash(100_000)).toBe('$100,000');
    expect(formatCash(0)).toBe('$0');
    expect(formatCash(-12)).toBe('$0');
  });
});
