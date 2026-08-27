import { describe, expect, it } from 'vitest';
import { parseCareer } from '../../src/domain/progress/Career.ts';
import {
  isTrackDefeat,
  isUpgradedRacer,
  nextTrackLosses,
  RETRY_FEE_FRACTION,
  RETRY_FEE_KIND,
  RETRY_LOSS_THRESHOLD,
  retryFeeAmount,
  retryFeeApplies,
  retryFeeMark,
  retryLevy,
  retryPayoutLines,
  retryWarningLine,
  trackLossCount,
} from '../../src/domain/progress/TrackRetryFee.ts';

const STARTER = '2-sportivo-blue-combat';
const UPGRADED = '3-red-oh-red';

describe('TrackRetryFee', () => {
  it('treats only a non-starter as an upgraded racer', () => {
    expect(isUpgradedRacer(STARTER)).toBe(false);
    expect(isUpgradedRacer('')).toBe(false);
    expect(isUpgradedRacer(UPGRADED)).toBe(true);
  });

  it('counts 4th and worse as a defeat, podium as a clear', () => {
    expect(isTrackDefeat(4)).toBe(true);
    expect(isTrackDefeat(8)).toBe(true);
    expect(isTrackDefeat(3)).toBe(false);
    expect(isTrackDefeat(1)).toBe(false);
  });

  it('does not count losses for the starter car', () => {
    expect(nextTrackLosses({}, 'thunder-basin', 6, STARTER)).toEqual({});
    expect(retryFeeApplies(5, STARTER)).toBe(false);
    expect(retryWarningLine(5, 80_000, 40, STARTER)).toBeNull();
    expect(retryPayoutLines(5, 80_000, 40, STARTER)).toEqual([]);
  });

  it('increments per-track losses for an upgraded car off the podium', () => {
    const once = nextTrackLosses({}, 'thunder-basin', 5, UPGRADED);
    expect(trackLossCount(once, 'thunder-basin')).toBe(1);
    const twice = nextTrackLosses(once, 'thunder-basin', 4, UPGRADED);
    expect(trackLossCount(twice, 'thunder-basin')).toBe(2);
    expect(trackLossCount(twice, 'other-track')).toBe(0);
  });

  it('clears the streak when the upgraded car finishes on the podium', () => {
    const hot = { 'thunder-basin': 4, 'other-track': 2 };
    expect(nextTrackLosses(hot, 'thunder-basin', 2, UPGRADED)).toEqual({ 'other-track': 2 });
  });

  it('charges 10% of the bank from the third defeat onward', () => {
    expect(RETRY_LOSS_THRESHOLD).toBe(3);
    expect(RETRY_FEE_FRACTION).toBe(0.1);
    expect(retryFeeApplies(2, UPGRADED)).toBe(false);
    expect(retryFeeApplies(3, UPGRADED)).toBe(true);
    expect(retryFeeAmount(70_000)).toBe(7_000);
    expect(retryFeeAmount(0)).toBe(0);
    expect(retryFeeAmount(5)).toBe(1);
  });

  it('takes 10% of respect when the bank is empty, then Game Over', () => {
    expect(retryLevy(3, 70_000, 80, UPGRADED)).toEqual({ kind: RETRY_FEE_KIND.CASH, amount: 7_000 });
    expect(retryLevy(3, 0, 80, UPGRADED)).toEqual({ kind: RETRY_FEE_KIND.POINTS, amount: 8 });
    expect(retryLevy(3, 0, 1, UPGRADED)).toEqual({ kind: RETRY_FEE_KIND.POINTS, amount: 1 });
    expect(retryLevy(3, 0, 0, UPGRADED)).toEqual({ kind: RETRY_FEE_KIND.GAME_OVER, amount: 0 });
    expect(retryLevy(2, 0, 0, UPGRADED)).toEqual({ kind: RETRY_FEE_KIND.NONE, amount: 0 });
  });

  it('writes a readable warning with count and cash, not color alone', () => {
    expect(retryWarningLine(1, 70_000, 0, UPGRADED)).toBe('LOSS 1/3  ·  2 FREE RETRIES LEFT');
    expect(retryWarningLine(2, 70_000, 0, UPGRADED)).toBe('LOSS 2/3  ·  1 FREE RETRY LEFT');
    expect(retryWarningLine(3, 70_000, 80, UPGRADED)).toBe('!  3 LOSSES  ·  RETRY FEE 10%  ·  $7,000');
    expect(retryWarningLine(3, 0, 80, UPGRADED)).toBe('!  3 LOSSES  ·  BANK $0  ·  FEE 10% RESPECT  ·  8 PTS');
    expect(retryWarningLine(3, 0, 0, UPGRADED)).toBe('!  3 LOSSES  ·  BANK $0  ·  0 PTS  ·  GAME OVER');
    expect(retryFeeMark(3, 0, 80, UPGRADED)).toBe('  FEE 8 PTS');
    expect(retryFeeMark(3, 0, 0, UPGRADED)).toBe('  GAME OVER');
    const payout = retryPayoutLines(3, 80_000, 40, UPGRADED);
    expect(payout[0]).toMatch(/LOSS\s+3/);
    expect(payout[1]).toMatch(/NEXT\s+FEE \$8,000/);
    expect(retryPayoutLines(3, 0, 0, UPGRADED)[1]).toMatch(/GAME OVER/);
  });
});

describe('Career sidecar — trackLosses', () => {
  it('defaults missing trackLosses on old saves and keeps a valid map', () => {
    const empty = parseCareer({
      activeSlotIndex: 0,
      slots: [
        {
          cash: 70_000,
          points: 0,
          ownedCarIds: [UPGRADED],
          equippedCarId: UPGRADED,
          lastPlanetId: 'thunder-basin',
          lastTrackId: 'thunder-basin',
          rivalNames: ['KIRA'],
          rivalPoints: [0],
          trackPoints: {},
          clearedTrackIds: [],
        },
        null,
        null,
      ],
    });
    expect(empty.slots[0]?.trackLosses).toEqual({});

    const saved = parseCareer({
      activeSlotIndex: 0,
      slots: [
        {
          cash: 70_000,
          points: 0,
          ownedCarIds: [UPGRADED],
          equippedCarId: UPGRADED,
          lastPlanetId: 'thunder-basin',
          lastTrackId: 'thunder-basin',
          rivalNames: ['KIRA'],
          rivalPoints: [0],
          trackPoints: {},
          clearedTrackIds: [],
          trackLosses: { 'thunder-basin': 3, junk: -1, bad: 'no' },
        },
        null,
        null,
      ],
    });
    expect(saved.slots[0]?.trackLosses).toEqual({ 'thunder-basin': 3 });
  });
});
