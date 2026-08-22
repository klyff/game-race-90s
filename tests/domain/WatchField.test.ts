import { describe, expect, it } from 'vitest';

import { MEDIUM_PROFILES } from '../../src/domain/ai/DriverProfile.ts';
import {
  applyWatchPin,
  nextWatchTrack,
  splitWatchRoster,
  watchAttractTracks,
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

  it('keeps nogo labs out of the default watch grid', () => {
    const mixed = [...FLEET, 'nogo-98', 'nogo-99'];
    expect(watchCarIds(mixed)).toEqual(FLEET);
    expect(watchCarIds(['nogo-99', 'car_2', 'car_18'])).toEqual(['car_2', 'car_18']);
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

  it('lists Thunder Basin I–III for splash Watch', () => {
    const tracks = watchAttractTracks();
    expect(tracks).toHaveLength(3);
    expect(tracks[0]).toBe('thunder-basin');
    expect(tracks[1]).toBe('thunder-basin-2');
    expect(tracks[2]).toBe('thunder-basin-3');
  });

  it('pins a spectator pairing at seat 0 without dropping the rest', () => {
    const pinned = applyWatchPin(['car-1', 'car-2', 'delorean'], ['TECHNICIAN', 'RAZOR'], {
      carId: 'delorean',
      pilot: 'KLYFF',
    });
    expect(pinned.field[0]).toBe('delorean');
    expect(pinned.pilots[0]).toBe('KLYFF');
    expect(pinned.field).toEqual(['delorean', 'car-1', 'car-2']);
    expect(pinned.pilots).toEqual(['KLYFF', 'TECHNICIAN', 'RAZOR']);
  });

  it('walks the splash Watch pool in a circle', () => {
    const pool = watchAttractTracks();
    expect(nextWatchTrack('thunder-basin', 1, pool)).toBe('thunder-basin-2');
    expect(nextWatchTrack('thunder-basin-3', 1, pool)).toBe('thunder-basin');
    expect(nextWatchTrack('thunder-basin', -1, pool)).toBe('thunder-basin-3');
  });
});
