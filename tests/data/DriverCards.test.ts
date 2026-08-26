import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  DRIVER_CARDS,
  driverCardForName,
  driverCardKey,
  driverCardUrl,
} from '../../src/data/cards/DriverCards.ts';
import { JOKER_PILOTS, REGULAR_PILOTS } from '../../src/data/pilots/PilotRoster.ts';

describe('DriverCards', () => {
  it('points every listed card at a file that exists on disk', () => {
    const publicRoot = join(process.cwd(), 'public');
    for (const entry of DRIVER_CARDS) {
      expect(existsSync(join(publicRoot, driverCardUrl(entry)))).toBe(true);
    }
  });

  it('gives every card a distinct name and texture key', () => {
    const names = DRIVER_CARDS.map(entry => entry.name);
    const keys = DRIVER_CARDS.map(entry => entry.key);
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('looks up a pilot by race name', () => {
    expect(driverCardForName('aline')?.file).toBe('Aline.png');
    expect(driverCardForName('CAROL')?.file).toBe('carol.png');
    expect(driverCardForName('FLUFE')?.file).toBe('flufe.png');
    expect(driverCardKey('Enzo')).toBe('driver-card:ENZO');
    expect(driverCardForName('ZARA')?.file).toBe('zara.png');
    expect(driverCardForName('VINCE')?.file).toBe('vince.png');
    expect(driverCardForName('ZOR9')?.file).toBe('zor9.png');
  });

  it('covers every regular and joker that already has art', () => {
    const named = new Set(DRIVER_CARDS.map(entry => entry.name));
    for (const name of [...REGULAR_PILOTS, ...JOKER_PILOTS]) {
      expect(named.has(name)).toBe(true);
    }
  });
});
