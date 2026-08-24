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

const SPINNER = ['2-sportivo-blue-combat', '1-muscle-car-gray-number9'] as const;

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

  it('never falls back to matrix ids and repeats spinner models to fill the grid', () => {
    const mixed = ['car-1', 'car_21', 'delorean', 'nogo-99', ...SPINNER];
    const field = watchCarIds(mixed);
    expect(field).toHaveLength(WATCH_RACER_COUNT);
    expect(new Set(field)).toEqual(new Set(SPINNER));
    expect(field.every(id => SPINNER.includes(id as (typeof SPINNER)[number]))).toBe(true);
    expect(watchCarIds(['nogo-99', 'car_2', 'car-18'])).toEqual([]);
  });

  it('keeps a long spinner list as-is once ten or more exist', () => {
    const many = Array.from({ length: 12 }, (_, index) => `${index + 1}-spinner-slug`);
    expect(watchCarIds(many)).toEqual(many);
  });

  it('does not drop cars when building packs', () => {
    const fleet = Array.from({ length: 20 }, (_, index) => `${index + 1}-spinner-slug`);
    const { packA, packB } = watchFieldPacks(fleet);
    expect([...packA, ...packB]).toEqual(fleet);
    const even = splitWatchRoster(fleet, 0);
    expect(even.field).toHaveLength(10);
    expect(even.reserve).toHaveLength(10);
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
    const pinned = applyWatchPin(
      ['2-sportivo-blue-combat', '1-muscle-car-gray-number9'],
      ['TECHNICIAN', 'RAZOR'],
      {
        carId: '1-muscle-car-gray-number9',
        pilot: 'KLYFF',
      },
    );
    expect(pinned.field[0]).toBe('1-muscle-car-gray-number9');
    expect(pinned.pilots[0]).toBe('KLYFF');
    expect(pinned.field).toEqual(['1-muscle-car-gray-number9', '2-sportivo-blue-combat']);
    expect(pinned.pilots).toEqual(['KLYFF', 'TECHNICIAN', 'RAZOR']);
  });

  it('walks the splash Watch pool in a circle', () => {
    const pool = watchAttractTracks();
    expect(nextWatchTrack('thunder-basin', 1, pool)).toBe('thunder-basin-2');
    expect(nextWatchTrack('thunder-basin-3', 1, pool)).toBe('thunder-basin');
    expect(nextWatchTrack('thunder-basin', -1, pool)).toBe('thunder-basin-3');
  });
});
