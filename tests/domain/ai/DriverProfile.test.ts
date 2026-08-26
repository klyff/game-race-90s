import { describe, expect, it } from 'vitest';
import { ALL_PROFILES, catalogSize, profileFor } from '../../../src/domain/ai/DriverRoster.ts';
import {
  DRIVER_PROFILE_TIER,
  DRIVER_WEIGHT_IDS,
  MEDIUM_PROFILES,
  SIGNATURE_PROFILES,
} from '../../../src/domain/ai/DriverProfile.ts';
import { deriveProfile } from '../../../src/domain/ai/deriveProfile.ts';
import { driverSkill } from '../../../src/domain/race/WatchField.ts';

describe('driver profiles', () => {
  it('ships exactly 30 catalog rows', () => {
    expect(catalogSize()).toBe(30);
    expect(ALL_PROFILES).toHaveLength(30);
    expect(SIGNATURE_PROFILES).toHaveLength(10);
    expect(MEDIUM_PROFILES).toHaveLength(10);
  });

  it('resolves named pilots to stable profiles', () => {
    expect(profileFor('ALINE').id).toBe('aline');
    expect(profileFor('FLUFE').id).toBe('emma');
    expect(profileFor('EMMA').id).toBe('emma');
    expect(profileFor('CAROL').id).toBe('nikki');
    expect(profileFor('CAROL').displayName).toBe('CAROL');
    expect(profileFor('CAROL').tier).toBe(DRIVER_PROFILE_TIER.SIGNATURE);
    expect(profileFor('NIKKI').id).toBe('nikki');
    expect(profileFor('NEGAO').tier).toBe(DRIVER_PROFILE_TIER.SIGNATURE);
    expect(profileFor('KLYFF').vehiclePhysics).toBe(1);
    expect(profileFor('ALINE')).toEqual(profileFor('aline'));
    expect(profileFor('TECHNICIAN').id).toBe('technician');
    expect(profileFor('APEX').tier).toBe(DRIVER_PROFILE_TIER.MEDIUM);
  });

  it('derives leftover regulars from a medium without hashing every dimension from scratch', () => {
    const cruz = profileFor('CRUZ');
    expect(cruz.tier).toBe(DRIVER_PROFILE_TIER.DERIVED);
    expect(cruz.parentId).toBe('guardian');
    expect(profileFor('CRUZ')).toEqual(profileFor('CRUZ'));
  });

  it('keeps derived vehiclePhysics inside the parent band', () => {
    const parent = MEDIUM_PROFILES.find(profile => profile.id === 'enforcer');
    expect(parent).toBeDefined();
    if (parent === undefined) {
      return;
    }
    const derived = deriveProfile(parent, 'VINCE');
    expect(Math.abs(derived.vehiclePhysics - parent.vehiclePhysics)).toBeLessThanOrEqual(0.08 * 0.35 + 1e-9);
    expect(derived.ram).toBeGreaterThan(0.8);
  });

  it('keeps the elite skill ladder: Klyff 100, Aline 90, Enzo and Carol 80', () => {
    const klyff = driverSkill(profileFor('KLYFF'));
    expect(klyff).toBeCloseTo(3, 5);
    expect(driverSkill(profileFor('ALINE')) / klyff).toBeCloseTo(0.9, 5);
    expect(driverSkill(profileFor('ENZO')) / klyff).toBeCloseTo(0.8, 5);
    expect(driverSkill(profileFor('CAROL')) / klyff).toBeCloseTo(0.8, 5);
    expect(profileFor('KLYFF').vehiclePhysics).toBe(1);
    expect(profileFor('ALINE').vehiclePhysics).toBeCloseTo(0.9, 5);
    expect(profileFor('ENZO').vehiclePhysics).toBeCloseTo(0.8, 5);
    expect(profileFor('CAROL').vehiclePhysics).toBeCloseTo(0.8, 5);
  });

  it('never special-cases a name: every weight is 0..1', () => {
    for (const profile of [profileFor('NEGAO'), profileFor('HEX'), profileFor('UNKNOWN')]) {
      for (const id of DRIVER_WEIGHT_IDS) {
        expect(profile[id]).toBeGreaterThanOrEqual(0);
        expect(profile[id]).toBeLessThanOrEqual(1);
      }
    }
  });
});
