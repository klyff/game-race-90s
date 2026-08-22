import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  driverBodyFile,
  driverBodyForName,
  driverBodyKey,
  driverBodyUrl,
} from '../../src/data/cards/DriverBodies.ts';
import { REGULAR_PILOTS } from '../../src/data/pilots/PilotRoster.ts';

describe('DriverBodies', () => {
  it('maps race names to on-disk profile poses', () => {
    expect(driverBodyFile('KLYFF')).toBe('klyff-profile.png');
    expect(driverBodyFile('FLUFE')).toBe('flufe-profile.png');
    expect(driverBodyKey('aline')).toBe('driver-body:ALINE');
    expect(driverBodyUrl('ENZO')).toBe('assets/bodies/enzo-profile.png');
    expect(driverBodyForName('Hex').name).toBe('HEX');
  });

  it('points every regular at a profile PNG that exists on disk', () => {
    const publicRoot = join(process.cwd(), 'public');
    for (const name of REGULAR_PILOTS) {
      const url = driverBodyUrl(name);
      expect(existsSync(join(publicRoot, url)), url).toBe(true);
    }
  });
});
