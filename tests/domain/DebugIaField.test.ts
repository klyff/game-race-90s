import { describe, expect, it } from 'vitest';

import { DRIVER_PROFILE_TIER } from '../../src/domain/ai/DriverProfile.ts';
import { profileFor } from '../../src/domain/ai/DriverRoster.ts';
import {
  DEBUG_IA_RACER_COUNT,
  debugIaSignaturePilots,
  drawDebugIaGrid,
  drawSkillMixGrid,
  lastWorldBestPilots,
  skillBandForName,
} from '../../src/domain/race/DebugIaField.ts';

const FLEET = Array.from({ length: 20 }, (_, index) => `car-${index + 1}`);

describe('DebugIaField', () => {
  it('locks Klyff, Aline, and the two strongest last-world jokers', () => {
    const signatures = debugIaSignaturePilots();
    expect(signatures).toEqual(['KLYFF', 'ALINE', ...lastWorldBestPilots(2)]);
    expect(signatures).toHaveLength(4);
    expect(lastWorldBestPilots(2)[0]).toBe('ZOR9');
    expect(lastWorldBestPilots(2)[1]).toBe('LUCA');
  });

  it('draws 15 unique cars with four signatures then a lottery', () => {
    const grid = drawDebugIaGrid(FLEET, 42);
    expect(grid.seats).toHaveLength(DEBUG_IA_RACER_COUNT);
    expect(grid.seats.slice(0, 4).map(seat => seat.name)).toEqual(debugIaSignaturePilots());
    expect(grid.seats.filter(seat => seat.slot === 'signature')).toHaveLength(4);
    expect(new Set(grid.seats.map(seat => seat.carId)).size).toBe(DEBUG_IA_RACER_COUNT);
    expect(grid.seats.every(seat => FLEET.includes(seat.carId.split('#')[0] ?? ''))).toBe(true);
    expect(profileFor(grid.seats[0]!.name).tier).toBe(DRIVER_PROFILE_TIER.SIGNATURE);
  });

  it('is deterministic for the same seed', () => {
    expect(drawDebugIaGrid(FLEET, 99).seats).toEqual(drawDebugIaGrid(FLEET, 99).seats);
    expect(drawDebugIaGrid(FLEET, 99).seats).not.toEqual(drawDebugIaGrid(FLEET, 100).seats);
  });

  it('draws 2 expert / 2 medium / 2 bobo with unique cars', () => {
    const grid = drawSkillMixGrid(FLEET, 1, { experts: 2, mediums: 2, bobos: 2 });
    expect(grid.seats).toHaveLength(6);
    expect(grid.seats.filter(seat => seat.slot === 'expert')).toHaveLength(2);
    expect(grid.seats.filter(seat => seat.slot === 'medium')).toHaveLength(2);
    expect(grid.seats.filter(seat => seat.slot === 'bobo')).toHaveLength(2);
    expect(new Set(grid.seats.map(seat => seat.carId)).size).toBe(6);
    expect(grid.seats.every(seat => skillBandForName(seat.name) === seat.slot)).toBe(true);
  });

  it('picks the strongest experts and the weakest bobos', () => {
    const grid = drawSkillMixGrid(FLEET, 1, { experts: 2, mediums: 2, bobos: 2 });
    const names = new Set(grid.seats.map(seat => seat.name));
    expect(names.has('KLYFF')).toBe(true);
    expect(names.has('TECHNICIAN')).toBe(true);
    expect(names.has('BERSERKER')).toBe(true);
    expect(names.has('SEAMUS')).toBe(true);
  });
});
