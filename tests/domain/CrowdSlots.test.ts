import { describe, expect, it } from 'vitest';
import {
  CROWD_COUNT,
  CROWD_HIT_RADIUS,
  CROWD_KIND,
  CROWD_LAP_COUNT,
  CROWD_REACT_RADIUS,
  CROWD_START_COUNT,
  crowdHitsFromCars,
  crowdIsReacting,
  crowdSeed,
  pickTrackCrowd,
} from '../../src/domain/crowd/CrowdSlots.ts';
import { thunderBasin } from '../../src/data/tracks/thunder-basin.track.ts';
import { thunderBasinTwo } from '../../src/data/tracks/thunder-basin-2.track.ts';
import { TrackSpline } from '../../src/domain/track/TrackSpline.ts';
import { trackFullHalfWidth } from '../../src/domain/track/TrackDefinition.ts';

function lengthOf(track: typeof thunderBasin): number {
  return new TrackSpline(track.controlPoints).totalLength;
}

describe('CrowdSlots', () => {
  it('places 6× the original pack, dense at the start, one flasher per 26, same seed same layout', () => {
    const length = lengthOf(thunderBasin);
    const seed = crowdSeed(1, thunderBasin.id);
    const a = pickTrackCrowd(thunderBasin, seed, length);
    const b = pickTrackCrowd(thunderBasin, seed, length);
    expect(a).toHaveLength(CROWD_COUNT);
    expect(CROWD_COUNT).toBe(156);
    expect(CROWD_START_COUNT).toBe(52);
    expect(CROWD_LAP_COUNT).toBe(104);
    expect(a.filter(slot => slot.kind === CROWD_KIND.FLASHER).length).toBeGreaterThanOrEqual(5);
    expect(a).toEqual(b);
    expect(a.some(slot => slot.kind === CROWD_KIND.ROCK)).toBe(true);
    expect(a.some(slot => slot.kind === CROWD_KIND.PUNK)).toBe(true);
    expect(a.some(slot => slot.kind === CROWD_KIND.CHEER)).toBe(true);
    const left = a.filter(slot => slot.lateral > 0);
    const right = a.filter(slot => slot.lateral < 0);
    expect(left.length).toBeGreaterThan(40);
    expect(right.length).toBeGreaterThan(40);
  });

  it('packs the start/finish and still rings the rest of the lap', () => {
    const length = lengthOf(thunderBasin);
    const slots = pickTrackCrowd(thunderBasin, crowdSeed(1, thunderBasin.id), length);
    const start = thunderBasin.startLineDistance;
    const nearStart = slots.filter(slot => {
      const delta = ((slot.distance - start) % length + length) % length;
      return delta <= 90 || delta >= length - 14;
    });
    expect(nearStart.length).toBeGreaterThanOrEqual(CROWD_START_COUNT);
    const spread = slots.map(slot => ((slot.distance % length) + length) % length);
    const min = Math.min(...spread);
    const max = Math.max(...spread);
    expect(max - min).toBeGreaterThan(length * 0.5);
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

  it('sits some people on the shoulder where a wall scrape can hit them', () => {
    const length = lengthOf(thunderBasin);
    const slots = pickTrackCrowd(thunderBasin, 1, length);
    const wall = trackFullHalfWidth(thunderBasin);
    const inner = slots.filter(slot => Math.abs(slot.lateral) < wall);
    expect(inner.length).toBeGreaterThan(CROWD_COUNT / 3);
  });

  it('reports a hit when a grounded car overlaps a person', () => {
    const person = { x: 10, y: 0 };
    const hits = crowdHitsFromCars(
      [person],
      new Set(),
      [
        {
          position: { x: 10 + CROWD_HIT_RADIUS * 0.4, y: 0 },
          radius: 1.7,
          velocity: { x: 12, y: 0 },
          airborne: false,
        },
      ],
    );
    expect(hits).toHaveLength(1);
    expect(hits[0]?.throwVelocity.x).toBe(12);
  });

  it('ignores airborne cars and already-dead people', () => {
    const person = { x: 0, y: 0 };
    const flying = crowdHitsFromCars(
      [person],
      new Set(),
      [{ position: { x: 0, y: 0 }, radius: 2, velocity: { x: 8, y: 0 }, airborne: true }],
    );
    expect(flying).toHaveLength(0);
    const dead = crowdHitsFromCars(
      [person],
      new Set([0]),
      [{ position: { x: 0, y: 0 }, radius: 2, velocity: { x: 8, y: 0 }, airborne: false }],
    );
    expect(dead).toHaveLength(0);
  });
});
