import { describe, expect, it } from 'vitest';
import { PLANETS } from '../../src/data/tracks/planets.ts';
import {
  GARAGE_PLATE_COUNT,
  GARAGE_PLATE_DIRECTORY,
  garageArtFile,
  garageArtKey,
  garagePlateIndex,
} from '../../src/scenes/sceneKeys.ts';

describe('garage plates', () => {
  it('has one plate per campaign world', () => {
    expect(GARAGE_PLATE_COUNT).toBe(PLANETS.length);
  });

  it('maps world 1 to the first bay and world 10 to the last', () => {
    expect(GARAGE_PLATE_DIRECTORY).toBe('assets/ui/garages');
    expect(garageArtFile(1)).toBe('garage-01.png');
    expect(garageArtKey(1)).toBe('garage-art:1');
    expect(garageArtFile(10)).toBe('garage-10.png');
    expect(garageArtKey(10)).toBe('garage-art:10');
  });

  it('clamps junk indexes onto the ladder', () => {
    expect(garagePlateIndex(0)).toBe(1);
    expect(garagePlateIndex(99)).toBe(10);
    expect(garagePlateIndex(Number.NaN)).toBe(1);
  });
});
