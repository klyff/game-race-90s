/**
 * Phase 5: mismatched car/profile pairs.
 * IMPLEMENTATION COMPLETE. GAMEPLAY TUNING STILL REQUIRED — these assert
 * the personality/capability split, not that the initial weights are balanced.
 */

import { describe, expect, it } from 'vitest';
import { profileFor } from '../../../src/domain/ai/DriverRoster.ts';
import { TUNING_STILL_REQUIRED } from '../../../src/domain/ai/DriverProfile.ts';
import { evaluateUtilities, TACTICAL_INTENTION } from '../../../src/domain/ai/UtilityEvaluator.ts';
import { buildStatNormalizer, capabilitiesFromStats } from '../../../src/domain/ai/VehicleCapabilityModel.ts';
import type { RaceSituation } from '../../../src/domain/ai/SituationEvaluator.ts';
import type { VehicleStats } from '../../../src/domain/vehicle/VehicleStats.ts';

function stats(overrides: Partial<VehicleStats>): VehicleStats {
  return {
    mass: 1000,
    enginePower: 34,
    brakeForce: 46,
    maxSpeed: 78,
    grip: 30,
    steerRate: 2.5,
    steerSpeedFalloff: 0.45,
    armor: 0.4,
    ammoCapacity: 10,
    collisionRadius: 1.7,
    aimRadius: 3.5,
    ...overrides,
  };
}

const light = stats({ mass: 520, armor: 0.1, enginePower: 36, maxSpeed: 96, grip: 18, ammoCapacity: 4, aimRadius: 2.4 });
const heavy = stats({ mass: 1800, armor: 0.88, enginePower: 32, maxSpeed: 60, grip: 38, ammoCapacity: 10 });
const gun = stats({ mass: 900, armor: 0.3, enginePower: 34, maxSpeed: 80, ammoCapacity: 24, aimRadius: 5 });
const sloppy = stats({ mass: 1000, grip: 16, steerRate: 1.8, steerSpeedFalloff: 0.75 });
const roster = [light, heavy, gun, sloppy];

function sit(overrides: Partial<RaceSituation> = {}): RaceSituation {
  return {
    position: 4,
    fieldSize: 7,
    lapsCompleted: 0,
    lapsTotal: 3,
    progressToFinish: 0.15,
    integrity: 1,
    missiles: 3,
    oil: 2,
    mines: 2,
    canAim: true,
    spinning: false,
    offRoad: false,
    finished: false,
    ahead: { carId: 'car-2', gapAhead: 9, gapBehind: 0, lateralDelta: 0.3, closingSpeed: 5 },
    behind: null,
    ...overrides,
  };
}

function ramTerms(name: string, car: VehicleStats) {
  const result = evaluateUtilities(
    profileFor(name),
    capabilitiesFromStats(car, buildStatNormalizer(roster)),
    sit(),
    null,
  );
  return result.scores.find(score => score.intention === TACTICAL_INTENTION.RAM);
}

describe('mismatched profile / car pairs', () => {
  it('lists remaining knobs as tuning, not as finished balance', () => {
    expect(TUNING_STILL_REQUIRED.length).toBeGreaterThan(3);
  });

  it('ENFORCER-shaped NEGAO in a light car still wants RAM more than APEX-shaped ALINE', () => {
    const negao = ramTerms('NEGAO', light);
    const aline = ramTerms('ALINE', light);
    expect(negao?.terms.personality).toBeGreaterThan(aline?.terms.personality ?? 0);
    expect(negao?.terms.vehicleCapability).toBeLessThan(0.4);
  });

  it('SLIPSTREAMER-shaped KIRA does not suddenly become a rammer in a heavy car', () => {
    const kiraHeavy = ramTerms('KIRA', heavy);
    const negaoHeavy = ramTerms('NEGAO', heavy);
    expect(kiraHeavy?.terms.personality).toBeLessThan(0.25);
    expect(negaoHeavy?.terms.personality).toBeGreaterThan(0.9);
    expect(kiraHeavy?.terms.vehicleCapability).toBe(negaoHeavy?.terms.vehicleCapability);
    expect(negaoHeavy?.terms.final).toBeGreaterThan(kiraHeavy?.terms.final ?? 0);
  });

  it('GUNSLINGER-shaped JETT values weapons even in a low-ammo car; capability drops', () => {
    const lowAmmo = stats({ ...light, ammoCapacity: 2, aimRadius: 2 });
    const result = evaluateUtilities(
      profileFor('JETT'),
      capabilitiesFromStats(lowAmmo, buildStatNormalizer(roster)),
      sit({ missiles: 1, canAim: true }),
      null,
    );
    const weapon = result.scores.find(score => score.intention === TACTICAL_INTENTION.USE_WEAPON);
    expect(weapon?.terms.personality).toBeGreaterThan(0.7);
    expect(weapon?.terms.vehicleCapability).toBeLessThan(0.55);
  });

  it('KLYFF keeps ceiling vehiclePhysics on a poor-handling car', () => {
    expect(profileFor('KLYFF').vehiclePhysics).toBe(1);
    expect(profileFor('KLYFF').localSteering).toBe(1);
    const sloppyCaps = capabilitiesFromStats(sloppy, buildStatNormalizer(roster));
    expect(sloppyCaps.corneringCapability).toBeLessThan(0.5);
  });

  it('SEAMUS + armored heavy still has high ram desire and now better capability', () => {
    const seamus = ramTerms('SEAMUS', heavy);
    expect(seamus?.terms.personality).toBeGreaterThan(0.9);
    expect(seamus?.terms.vehicleCapability).toBeGreaterThan(0.55);
  });
});
