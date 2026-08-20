import { describe, expect, it } from 'vitest';
import {
  CROWD_COUNT,
  CROWD_KIND,
  CROWD_REACT_RADIUS,
  crowdIsReacting,
  crowdSeed,
  pickStartCrowd,
} from '../../src/domain/crowd/CrowdSlots.ts';
import { thunderBasin } from '../../src/data/tracks/thunder-basin.track.ts';
import { thunderBasinTwo } from '../../src/data/tracks/thunder-basin-2.track.ts';

describe('CrowdSlots', () => {
  it('places 26 people at the start, one flasher, same seed same layout', () => {
    const seed = crowdSeed(1, thunderBasin.id);
    const a = pickStartCrowd(thunderBasin, seed);
    const b = pickStartCrowd(thunderBasin, seed);
    expect(a).toHaveLength(CROWD_COUNT);
    expect(a.filter(slot => slot.kind === CROWD_KIND.FLASHER)).toHaveLength(1);
    expect(a).toEqual(b);
    expect(a.some(slot => slot.kind === CROWD_KIND.ROCK)).toBe(true);
    expect(a.some(slot => slot.kind === CROWD_KIND.PUNK)).toBe(true);
    expect(a.some(slot => slot.kind === CROWD_KIND.CHEER)).toBe(true);
    const left = a.filter(slot => slot.lateral > 0);
    const right = a.filter(slot => slot.lateral < 0);
    expect(left.length).toBeGreaterThan(8);
    expect(right.length).toBeGreaterThan(8);
  });

  it('does not use the same layout for a different track id', () => {
    const seedA = crowdSeed(1, thunderBasin.id);
    const seedB = crowdSeed(1, thunderBasinTwo.id);
    expect(seedA).not.toBe(seedB);
  });

  it('cheers only when the leader is nearby', () => {
    const cheer = { kind: CROWD_KIND.CHEER, distance: 20, lateral: 24 } as const;
    const rock = { kind: CROWD_KIND.ROCK, distance: 20, lateral: 24 } as const;
    expect(crowdIsReacting(cheer, 20, 2000)).toBe(true);
    expect(crowdIsReacting(cheer, 20 + CROWD_REACT_RADIUS, 2000)).toBe(true);
    expect(crowdIsReacting(cheer, 20 + CROWD_REACT_RADIUS + 2, 2000)).toBe(false);
    expect(crowdIsReacting(rock, 20, 2000)).toBe(false);
  });
});
