import { describe, expect, it } from 'vitest';
import { applySkillToDriveOptions, skillControlLimits } from '../../../src/domain/ai/skillLimits.ts';
import { PACE_DRIVER_DEFAULTS } from '../../../src/domain/vehicle/PaceDriver.ts';

describe('skill limits', () => {
  it('does not invent horsepower — only control fractions', () => {
    const low = skillControlLimits(0, 0);
    const high = skillControlLimits(1, 1);
    expect(low.usableGripFraction).toBeCloseTo(0.75);
    expect(high.usableGripFraction).toBeCloseTo(0.98);
    expect(high.usableGripFraction).toBeLessThan(1);
  });

  it('high vehiclePhysics brakes later than low skill on the same options', () => {
    const timid = applySkillToDriveOptions(PACE_DRIVER_DEFAULTS, 0.2, 0.2);
    const ace = applySkillToDriveOptions(PACE_DRIVER_DEFAULTS, 1, 1);
    expect(ace.cornerLookAheadMinimum).toBeLessThan(timid.cornerLookAheadMinimum);
    expect(ace.cornerSafetyFactor).toBeGreaterThan(timid.cornerSafetyFactor);
    expect(ace.cornerSafetyFactor).toBeLessThanOrEqual(0.99);
  });
});
