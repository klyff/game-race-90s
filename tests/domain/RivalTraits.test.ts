import { describe, expect, it } from 'vitest';
import {
  RIVAL_TRAIT_IDS,
  commitCornerPlan,
  goForPass,
  traitsFor,
  traitWeight,
} from '../../src/domain/vehicle/RivalTraits.ts';

const BOLD: ReturnType<typeof traitsFor> = {
  daring: 8,
  precision: 6,
  attack: 8,
  block: 3,
  composure: 5,
  ambition: 9,
  contest: 8,
};

const TIMID: ReturnType<typeof traitsFor> = {
  daring: 3,
  precision: 7,
  attack: 3,
  block: 8,
  composure: 8,
  ambition: 4,
  contest: 4,
};

describe('rival traits', () => {
  it('is an odd set of at least five', () => {
    expect(RIVAL_TRAIT_IDS.length).toBeGreaterThanOrEqual(5);
    expect(RIVAL_TRAIT_IDS.length % 2).toBe(1);
  });

  it('scores 1..10 and stays stable for a name', () => {
    const a = traitsFor('KIRA');
    const b = traitsFor('KIRA');
    expect(a).toEqual(b);
    for (const id of RIVAL_TRAIT_IDS) {
      expect(a[id]).toBeGreaterThanOrEqual(1);
      expect(a[id]).toBeLessThanOrEqual(10);
    }
  });

  it('gives different sheets to different pilots', () => {
    expect(traitsFor('KIRA')).not.toEqual(traitsFor('SNAKE'));
  });
});

describe('decisions', () => {
  it('an 8/10 daring driver commits the fast-straight corner plan', () => {
    expect(commitCornerPlan(BOLD, 0.7, true)).toBe(true);
  });

  it('a timid driver does not commit that same maneuver', () => {
    expect(commitCornerPlan(TIMID, 0.7, true)).toBe(false);
  });

  it('does not even consider the plan below 60% speed or off a straight', () => {
    expect(commitCornerPlan(BOLD, 0.4, true)).toBe(false);
    expect(commitCornerPlan(BOLD, 0.8, false)).toBe(false);
  });

  it('daring weighs the instant of the dive', () => {
    expect(goForPass(BOLD, 12)).toBeGreaterThan(goForPass(TIMID, 12));
  });

  it('ambition and contest both pull the weight, not a player flag', () => {
    expect(traitWeight(BOLD, ['ambition', 'contest'])).toBeGreaterThan(0.7);
    expect(traitWeight(TIMID, ['ambition', 'contest'])).toBeLessThan(0.5);
  });
});
