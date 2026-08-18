import { describe, expect, it } from 'vitest';
import {
  BASE_FIRST_POINTS,
  CASH_IN_PAYOUT,
  cashInValue,
  podiumPoints,
  POINTS_PER_CASH_IN,
  weaponHitPoints,
} from '../../src/domain/progress/SeasonPoints.ts';

describe('SeasonPoints', () => {
  it('pays 100 / 50 / 25 on planet 1 track 1', () => {
    expect(podiumPoints(1, 1, 1)).toBe(BASE_FIRST_POINTS);
    expect(podiumPoints(2, 1, 1)).toBe(50);
    expect(podiumPoints(3, 1, 1)).toBe(25);
    expect(podiumPoints(4, 1, 1)).toBe(0);
  });

  it('pays 10 / 8 / 4 for hits on planet 1', () => {
    expect(weaponHitPoints({ missiles: 1, oil: 0, mines: 0 }, 1)).toBe(10);
    expect(weaponHitPoints({ missiles: 0, oil: 0, mines: 1 }, 1)).toBe(8);
    expect(weaponHitPoints({ missiles: 0, oil: 1, mines: 0 }, 1)).toBe(4);
    expect(weaponHitPoints({ missiles: 0, oil: 0, mines: 0, contacts: 1 }, 1)).toBe(3);
  });

  it('cashes 400 points for $50k and can repeat', () => {
    expect(cashInValue(400)).toEqual({ batches: 1, cash: CASH_IN_PAYOUT, remaining: 0 });
    expect(cashInValue(800)).toEqual({ batches: 2, cash: CASH_IN_PAYOUT * 2, remaining: 0 });
    expect(cashInValue(399).batches).toBe(0);
    expect(POINTS_PER_CASH_IN).toBe(400);
  });
});
