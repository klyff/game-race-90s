import { describe, expect, it } from 'vitest';
import { profileFor } from '../../../src/domain/ai/DriverRoster.ts';
import { combineUtility, evaluateUtilities, TACTICAL_INTENTION } from '../../../src/domain/ai/UtilityEvaluator.ts';
import { isFinalLap, lastLapPackRole, raceTacticalValue } from '../../../src/domain/ai/SituationEvaluator.ts';
import { buildStatNormalizer, capabilitiesFromStats } from '../../../src/domain/ai/VehicleCapabilityModel.ts';
import type { VehicleCapabilities } from '../../../src/domain/ai/VehicleCapabilityModel.ts';
import type { RaceSituation } from '../../../src/domain/ai/SituationEvaluator.ts';
import type { VehicleStats } from '../../../src/domain/vehicle/VehicleStats.ts';
import { emptyMemory, recordRamReceived } from '../../../src/domain/ai/OpponentMemory.ts';

function stats(overrides: Partial<VehicleStats> = {}): VehicleStats {
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

function situation(overrides: Partial<RaceSituation> = {}): RaceSituation {
  return {
    position: 3,
    fieldSize: 7,
    lapsCompleted: 0,
    lapsTotal: 3,
    progressToFinish: 0.2,
    integrity: 1,
    missiles: 3,
    oil: 2,
    mines: 2,
    canAim: false,
    spinning: false,
    offRoad: false,
    finished: false,
    ahead: {
      carId: 'car-2',
      gapAhead: 10,
      gapBehind: 0,
      lateralDelta: 0.4,
      closingSpeed: 6,
    },
    behind: null,
    ...overrides,
  };
}

function capsFor(roster: readonly VehicleStats[], car: VehicleStats): VehicleCapabilities {
  return capabilitiesFromStats(car, buildStatNormalizer(roster));
}

describe('utility evaluator', () => {
  it('uses the product formula, not personality + raw mass', () => {
    const terms = combineUtility(0.98, 0.91, 0.2, 0.74, 0, 0.13);
    expect(terms.final).toBeCloseTo(0.98 * 0.91 * 0.2 * 0.74 - 0.13, 5);
    expect(terms.final).toBeLessThan(0.2);
  });

  it('same car, different personalities pick different winners', () => {
    const roster = [stats({ mass: 1000 }), stats({ mass: 1400 })];
    const car = stats({ mass: 1200, armor: 0.6 });
    const capabilities = capsFor(roster, car);
    const pack = situation({ canAim: true, missiles: 4 });
    const aline = evaluateUtilities(profileFor('ALINE'), capabilities, pack, null);
    const negao = evaluateUtilities(profileFor('NEGAO'), capabilities, pack, null);
    const emma = evaluateUtilities(profileFor('FLUFE'), capabilities, { ...pack, canAim: true }, null);
    const alineRam = aline.scores.find(score => score.intention === TACTICAL_INTENTION.RAM);
    const negaoRam = negao.scores.find(score => score.intention === TACTICAL_INTENTION.RAM);
    const alineWeapon = aline.scores.find(score => score.intention === TACTICAL_INTENTION.USE_WEAPON);
    const emmaWeapon = emma.scores.find(score => score.intention === TACTICAL_INTENTION.USE_WEAPON);
    expect(negaoRam?.terms.personality).toBeGreaterThan(alineRam?.terms.personality ?? 0);
    expect(negaoRam?.terms.final).toBeGreaterThan(alineRam?.terms.final ?? 0);
    expect(emmaWeapon?.terms.personality).toBeGreaterThan(alineWeapon?.terms.personality ?? 0);
    expect(aline.attackMethod !== negao.attackMethod || alineRam?.terms.final !== negaoRam?.terms.final).toBe(true);
  });

  it('same personality, different cars change capability terms', () => {
    const light = stats({ mass: 500, armor: 0.1, enginePower: 20, collisionRadius: 1.2, maxSpeed: 95 });
    const heavy = stats({ mass: 1800, armor: 0.85, enginePower: 40, collisionRadius: 2.2, maxSpeed: 62 });
    const roster = [light, heavy];
    const profile = profileFor('NEGAO');
    const lightU = evaluateUtilities(profile, capsFor(roster, light), situation(), null);
    const heavyU = evaluateUtilities(profile, capsFor(roster, heavy), situation(), null);
    const lightRam = lightU.scores.find(score => score.intention === TACTICAL_INTENTION.RAM);
    const heavyRam = heavyU.scores.find(score => score.intention === TACTICAL_INTENTION.RAM);
    expect(lightRam?.terms.personality).toBe(heavyRam?.terms.personality);
    expect(heavyRam?.terms.vehicleCapability).toBeGreaterThan(lightRam?.terms.vehicleCapability ?? 0);
  });

  it('NEGAO in a light car still wants RAM but utility can reject it', () => {
    const light = stats({ mass: 500, armor: 0.08, enginePower: 22, collisionRadius: 1.1, maxSpeed: 96 });
    const heavy = stats({ mass: 1900, armor: 0.9, enginePower: 38, collisionRadius: 2.3, maxSpeed: 60 });
    const roster = [light, heavy];
    const result = evaluateUtilities(profileFor('NEGAO'), capsFor(roster, light), situation({ canAim: true, missiles: 4 }), null);
    const ram = result.scores.find(score => score.intention === TACTICAL_INTENTION.RAM);
    expect(ram?.terms.personality).toBeGreaterThan(0.9);
    expect(ram?.terms.vehicleCapability).toBeLessThan(0.35);
    expect(ram?.terms.final).toBeLessThan(
      result.scores.find(score => score.intention === TACTICAL_INTENTION.USE_WEAPON)?.terms.final ?? 1,
    );
  });

  it('memory raises attack utility after being rammed', () => {
    const roster = [stats(), stats({ mass: 1400 })];
    const capabilities = capsFor(roster, stats({ mass: 1200 }));
    const before = evaluateUtilities(profileFor('SEAMUS'), capabilities, situation(), null);
    const after = evaluateUtilities(
      profileFor('SEAMUS'),
      capabilities,
      situation(),
      recordRamReceived(emptyMemory('car-2'), 1),
    );
    const beforeRam = before.scores.find(score => score.intention === TACTICAL_INTENTION.RAM);
    const afterRam = after.scores.find(score => score.intention === TACTICAL_INTENTION.RAM);
    expect(afterRam?.terms.memory).toBeGreaterThan(beforeRam?.terms.memory ?? 0);
    expect(afterRam?.terms.final).toBeGreaterThan(beforeRam?.terms.final ?? 0);
  });

  it('does not offer RECOVER as a competing tactic even when damaged', () => {
    const roster = [stats(), stats({ mass: 1400 })];
    const capabilities = capsFor(roster, stats({ mass: 1200 }));
    const damaged = situation({ integrity: 0.3, canAim: true, missiles: 4 });
    const klyff = evaluateUtilities(profileFor('KLYFF'), capabilities, damaged, null);
    const berserker = evaluateUtilities(profileFor('BERSERKER'), capabilities, damaged, null);
    expect(klyff.scores.some(score => score.intention === TACTICAL_INTENTION.RECOVER)).toBe(false);
    expect(klyff.selected).not.toBe(TACTICAL_INTENTION.RECOVER);
    expect(berserker.selected).not.toBe(TACTICAL_INTENTION.RECOVER);
  });

  it('last lap heats the podium fight instead of protecting the lead', () => {
    const roster = [stats(), stats({ mass: 1400 })];
    const capabilities = capsFor(roster, stats());
    const early = evaluateUtilities(profileFor('ALINE'), capabilities, situation(), null);
    const late = evaluateUtilities(
      profileFor('ALINE'),
      capabilities,
      situation({ position: 1, lapsCompleted: 2, lapsTotal: 3, progressToFinish: 0.95 }),
      recordRamReceived(emptyMemory('car-2'), 1),
    );
    const earlyRam = early.scores.find(score => score.intention === TACTICAL_INTENTION.RAM);
    const earlyRace = early.scores.find(score => score.intention === TACTICAL_INTENTION.RACE);
    const lateRam = late.scores.find(score => score.intention === TACTICAL_INTENTION.RAM);
    const lateRace = late.scores.find(score => score.intention === TACTICAL_INTENTION.RACE);
    expect(lateRam?.terms.tacticalValue).toBeGreaterThan(earlyRam?.terms.tacticalValue ?? 0);
    expect(lateRam?.terms.tacticalValue).toBeGreaterThan(lateRace?.terms.tacticalValue ?? 0);
    expect(earlyRace).toBeDefined();
  });

  it('last-lap backmarkers do not get the podium fight heat', () => {
    const roster = [stats(), stats({ mass: 1400 })];
    const capabilities = capsFor(roster, stats());
    const p1 = evaluateUtilities(
      profileFor('ALINE'),
      capabilities,
      situation({ position: 1, lapsCompleted: 2, lapsTotal: 3 }),
      null,
    );
    const p4 = evaluateUtilities(
      profileFor('ALINE'),
      capabilities,
      situation({ position: 4, lapsCompleted: 2, lapsTotal: 3 }),
      null,
    );
    const p1Ram = p1.scores.find(score => score.intention === TACTICAL_INTENTION.RAM);
    const p4Ram = p4.scores.find(score => score.intention === TACTICAL_INTENTION.RAM);
    expect(p1Ram?.terms.tacticalValue).toBeGreaterThan(p4Ram?.terms.tacticalValue ?? 1);
  });

  it('treats lapsCompleted == lapsTotal - 1 as the last racing lap', () => {
    expect(isFinalLap(2, 3)).toBe(true);
    expect(isFinalLap(0, 1)).toBe(true);
    expect(isFinalLap(1, 3)).toBe(false);
    expect(isFinalLap(3, 3)).toBe(false);
    expect(lastLapPackRole(2, 3, 1)).toBe('podium');
    expect(lastLapPackRole(2, 3, 3)).toBe('podium');
    expect(lastLapPackRole(2, 3, 4)).toBe('backmarker');
    expect(lastLapPackRole(1, 3, 1)).toBeNull();
    const podium = situation({ position: 1, lapsCompleted: 2, lapsTotal: 3 });
    expect(raceTacticalValue(podium, true)).toBeGreaterThan(raceTacticalValue(podium, false));
  });
});
