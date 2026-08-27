import { describe, expect, it } from 'vitest';
import {
  driverBodyFile,
  driverBodyKey,
  driverDefeatFile,
  driverDefeatKey,
  driverDefeatUrl,
  driverVictoryFile,
  driverVictoryKey,
  driverVictoryUrl,
} from '../../src/data/cards/DriverBodies.ts';

describe('DriverBodies', () => {
  it('maps a pilot to profile, defeat, and victory poses', () => {
    expect(driverBodyKey('Klyff')).toBe('driver-body:KLYFF');
    expect(driverBodyFile('KLYFF')).toBe('klyff-profile.png');
    expect(driverDefeatKey('Klyff')).toBe('driver-defeat:KLYFF');
    expect(driverDefeatFile('KLYFF')).toBe('klyff-defeat.png');
    expect(driverDefeatUrl('FLUFE')).toBe('assets/bodies/flufe-defeat.png');
    expect(driverVictoryKey('Klyff')).toBe('driver-victory:KLYFF');
    expect(driverVictoryFile('KLYFF')).toBe('klyff-victory.png');
    expect(driverVictoryUrl('FLUFE')).toBe('assets/bodies/flufe-victory.png');
  });
});
