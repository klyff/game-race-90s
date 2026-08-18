import { describe, expect, it } from 'vitest';

import { MEDIUM_PROFILES } from '../../src/domain/ai/DriverProfile.ts';
import {
  nextWatchTrack,
  splitWatchRoster,
  watchCarIds,
  watchFieldPacks,
  watchPilots,
  watchPlanetTwoTracks,
  WATCH_RACER_COUNT,
} from '../../src/domain/race/WatchField.ts';

const FLEET = Array.from({ length: 20 }, (_, index) => `car-${index + 1}`);

describe('WatchField', () => {
  it('lists all ten medium drivers, technician first', () => {
    const pilots = watchPilots();
    expect(pilots).toHaveLength(WATCH_RACER_COUNT);
    expect(pilots[0]).toBe('TECHNICIAN');
    expect(new Set(pilots).size).toBe(MEDIUM_PROFILES.length);
  });

  it('lists every planet II', () => {
    const tracks = watchPlanetTwoTracks();
    expect(tracks).toHaveLength(10);
    expect(tracks[0]).toBe('thunder-basin-2');
    expect(tracks[1]).toBe('chrome-verge-2');
  });

  it('splits the fleet into a race pack and a reserve', () => {
    const even = splitWatchRoster(FLEET, 0);
    expect(even.field).toHaveLength(10);
    expect(even.reserve).toHaveLength(10);
    expect(even.field).toEqual(FLEET.slice(0, 10));
    expect(even.reserve).toEqual(FLEET.slice(10, 20));

    const odd = splitWatchRoster(FLEET, 1);
    expect(odd.field).toEqual(FLEET.slice(10, 20));
    expect(odd.reserve).toEqual(FLEET.slice(0, 10));
  });

  it('uses the clock fleet once ten or more new strips are listed', () => {
    const mixed = ['car-1', 'car-2', ...Array.from({ length: 12 }, (_, index) => `car_${index + 2}`)];
    expect(watchCarIds(mixed)).toEqual(mixed.filter(id => id.startsWith('car_')));
    expect(watchCarIds(FLEET)).toEqual(FLEET);
  });

  it('does not drop cars when building packs', () => {
    const { packA, packB } = watchFieldPacks(FLEET);
    expect([...packA, ...packB]).toEqual(FLEET);
  });

  it('walks planet II tracks in a circle', () => {
    expect(nextWatchTrack('thunder-basin-2', 1)).toBe('chrome-verge-2');
    expect(nextWatchTrack('verdant-fault-2', 1)).toBe('thunder-basin-2');
    expect(nextWatchTrack('thunder-basin-2', -1)).toBe('verdant-fault-2');
  });
});
