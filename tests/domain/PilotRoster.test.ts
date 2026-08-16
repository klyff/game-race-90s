import { describe, expect, it } from 'vitest';
import {
  drawRivalNames,
  MYSTERIOUS_PILOTS,
  REGULAR_PILOTS,
  rivalsForPlanet,
  RIVALS_PER_SAVE,
} from '../../src/data/pilots/PilotRoster.ts';

describe('PilotRoster', () => {
  it('draws 9 unique regulars deterministically', () => {
    const a = drawRivalNames(12345);
    const b = drawRivalNames(12345);
    expect(a).toEqual(b);
    expect(a).toHaveLength(RIVALS_PER_SAVE);
    expect(new Set(a).size).toBe(RIVALS_PER_SAVE);
    expect(a.every(name => (REGULAR_PILOTS as readonly string[]).includes(name))).toBe(true);
  });

  it('keeps the same nine until world 10, then swaps in the mysterious five', () => {
    const rivals = drawRivalNames(99);
    const scores = rivals.map((_, index) => index * 10);
    expect(rivalsForPlanet(rivals, scores, 9)).toEqual(rivals);
    const last = rivalsForPlanet(rivals, scores, 10);
    expect(last).toHaveLength(RIVALS_PER_SAVE);
    for (const name of MYSTERIOUS_PILOTS) {
      expect(last).toContain(name);
    }
  });
});
