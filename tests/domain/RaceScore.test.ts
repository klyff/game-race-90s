import { describe, it, expect } from 'vitest';
import {
  POSITION_WEIGHT,
  TIME_WEIGHT,
  computeRaceScore,
  positionFraction,
  timeFraction,
} from '../../src/domain/race/RaceScore.ts';

describe('RaceScore — positionFraction', () => {
  it('is 1 for the winner and 0 for last', () => {
    expect(positionFraction(1, 5)).toBe(1);
    expect(positionFraction(5, 5)).toBe(0);
  });

  it('is linear in between', () => {
    expect(positionFraction(3, 5)).toBeCloseTo(0.5, 5);
  });

  it('is 1 for a single-car field', () => {
    expect(positionFraction(1, 1)).toBe(1);
  });
});

describe('RaceScore — timeFraction', () => {
  it('is capped at 1 when the player beats par', () => {
    expect(timeFraction(90, 120)).toBe(1);
  });

  it('falls off proportionally when slower than par', () => {
    expect(timeFraction(120, 90)).toBeCloseTo(0.75, 5);
  });

  it('is 0 without a valid par', () => {
    expect(timeFraction(120, 0)).toBe(0);
  });
});

describe('RaceScore — computeRaceScore', () => {
  it('a winner on par scores 100', () => {
    expect(computeRaceScore({ position: 1, totalRacers: 5, finishSeconds: 100, parSeconds: 100 })).toBe(
      POSITION_WEIGHT + TIME_WEIGHT,
    );
  });

  it('last place, well off par, scores 0', () => {
    expect(
      computeRaceScore({ position: 5, totalRacers: 5, finishSeconds: 100000, parSeconds: 100 }),
    ).toBe(0);
  });

  it('winner running slow still earns full position weight', () => {
    // 1st place = 70; time far off par ≈ 0, so ~70.
    const score = computeRaceScore({ position: 1, totalRacers: 5, finishSeconds: 100000, parSeconds: 100 });
    expect(score).toBe(POSITION_WEIGHT);
  });

  it('falls back to a purely positional score without par', () => {
    // 3rd of 5 → positionFraction 0.5 → 50.
    expect(computeRaceScore({ position: 3, totalRacers: 5, finishSeconds: 120 })).toBe(50);
  });
});
