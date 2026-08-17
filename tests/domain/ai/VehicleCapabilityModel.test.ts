import { describe, expect, it } from 'vitest';
import {
  buildStatNormalizer,
  capabilitiesFromStats,
} from '../../../src/domain/ai/VehicleCapabilityModel.ts';
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

describe('vehicle capability model', () => {
  it('maps roster min to 0 and max to 1', () => {
    const light = stats({ mass: 500, maxSpeed: 60 });
    const heavy = stats({ mass: 1500, maxSpeed: 100 });
    const normalizer = buildStatNormalizer([light, heavy]);
    expect(normalizer.normalize('mass', 500)).toBe(0);
    expect(normalizer.normalize('mass', 1500)).toBe(1);
    expect(normalizer.normalize('mass', 1000)).toBeCloseTo(0.5);
  });

  it('returns 0.5 when every roster value is equal', () => {
    const a = stats({ mass: 900 });
    const b = stats({ mass: 900 });
    const normalizer = buildStatNormalizer([a, b]);
    expect(normalizer.normalize('mass', 900)).toBe(0.5);
  });

  it('inverts steerSpeedFalloff so lower falloff is better', () => {
    const twitchy = stats({ steerSpeedFalloff: 0.2 });
    const numb = stats({ steerSpeedFalloff: 0.8 });
    const normalizer = buildStatNormalizer([twitchy, numb]);
    expect(normalizer.normalize('steerSpeedFalloff', 0.2, true)).toBe(1);
    expect(normalizer.normalize('steerSpeedFalloff', 0.8, true)).toBe(0);
  });

  it('never puts raw mass into a capability above 1', () => {
    const light = stats({ mass: 500, armor: 0.1, enginePower: 20, collisionRadius: 1, maxSpeed: 50 });
    const heavy = stats({ mass: 2000, armor: 0.9, enginePower: 50, collisionRadius: 2.4, maxSpeed: 90 });
    const normalizer = buildStatNormalizer([light, heavy]);
    const caps = capabilitiesFromStats(heavy, normalizer, { contactMass: 8000 });
    expect(caps.rammingCapability).toBeLessThanOrEqual(1);
    expect(caps.rammingCapability).toBeGreaterThan(0.5);
  });
});
