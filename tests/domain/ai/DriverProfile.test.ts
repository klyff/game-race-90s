import { describe, expect, it } from 'vitest';
import { ALL_PROFILES, catalogSize, profileFor } from '../../../src/domain/ai/DriverRoster.ts';
import {
  DRIVER_PROFILE_TIER,
  DRIVER_WEIGHT_IDS,
  MEDIUM_PROFILES,
  SIGNATURE_PROFILES,
} from '../../../src/domain/ai/DriverProfile.ts';
import { deriveProfile } from '../../../src/domain/ai/deriveProfile.ts';

describe('driver profiles', () => {
  it('ships exactly 30 catalog rows', () => {
    expect(catalogSize()).toBe(30);
    expect(ALL_PROFILES).toHaveLength(30);
    expect(SIGNATURE_PROFILES).toHaveLength(9);
    expect(MEDIUM_PROFILES).toHaveLength(10);
  });

  it('resolves named pilots to stable profiles', () => {
    expect(profileFor('ALINE').id).toBe('aline');
    expect(profileFor('FLUFE').id).toBe('emma');
    expect(profileFor('EMMA').id).toBe('emma');
    expect(profileFor('NEGAO').tier).toBe(DRIVER_PROFILE_TIER.SIGNATURE);
    expect(profileFor('KLYFF').vehiclePhysics).toBe(1);
    expect(profileFor('ALINE')).toEqual(profileFor('aline'));
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

  it('never special-cases a name: every weight is 0..1', () => {
    for (const profile of [profileFor('NEGAO'), profileFor('HEX'), profileFor('UNKNOWN')]) {
      for (const id of DRIVER_WEIGHT_IDS) {
        expect(profile[id]).toBeGreaterThanOrEqual(0);
        expect(profile[id]).toBeLessThanOrEqual(1);
      }
    }
  });
});
