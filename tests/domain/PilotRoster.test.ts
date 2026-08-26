import { describe, expect, it } from 'vitest';
import {
  drawRivalNames,
  JOKER_PILOTS,
  REGULAR_PILOTS,
  rivalsForPlanet,
  RIVALS_PER_SAVE,
} from '../../src/data/pilots/PilotRoster.ts';

describe('PilotRoster', () => {
  it('locks all 21 regulars deterministically, KLYFF first', () => {
    const a = drawRivalNames(12345);
    const b = drawRivalNames(12345);
    expect(a).toEqual(b);
    expect(a).toHaveLength(RIVALS_PER_SAVE);
    expect(REGULAR_PILOTS).toHaveLength(21);
    expect(REGULAR_PILOTS[0]).toBe('KLYFF');
    expect(REGULAR_PILOTS[3]).toBe('CAROL');
    expect(REGULAR_PILOTS[6]).toBe('FLUFE');
    expect(RIVALS_PER_SAVE).toBe(21);
    expect(new Set(a).size).toBe(RIVALS_PER_SAVE);
    expect(a.every(name => (REGULAR_PILOTS as readonly string[]).includes(name))).toBe(true);
    expect(a).toContain('KLYFF');
  });

  it('keeps the same locker until world 10, then puts the five jokers first', () => {
    const rivals = drawRivalNames(99);
    const scores = rivals.map((_, index) => index * 10);
    expect(rivalsForPlanet(rivals, scores, 9)).toEqual(rivals);
    const last = rivalsForPlanet(rivals, scores, 10);
    expect(last).toHaveLength(RIVALS_PER_SAVE);
    expect(last.slice(0, JOKER_PILOTS.length)).toEqual([...JOKER_PILOTS]);
    for (const name of JOKER_PILOTS) {
      expect(last).toContain(name);
    }
  });
});
