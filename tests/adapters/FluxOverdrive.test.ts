import { describe, expect, it } from 'vitest';
import {
  FLUX_OVERDRIVE_MPH,
  FLUX_OVERDRIVE_WORLD_SPEED,
  isFluxOverdriveActive,
  isFluxOverdriveCar,
} from '../../src/adapters/render/FluxOverdrive.ts';
import { formatMph, MPH_PER_WORLD_UNIT } from '../../src/adapters/render/HudFormat.ts';

describe('FluxOverdrive', () => {
  it('only the DeLorean flagship owns the overdrive band', () => {
    expect(isFluxOverdriveCar('10-delorean-steel-flux')).toBe(true);
    expect(isFluxOverdriveCar('10-delorean-steel-flux#0')).toBe(true);
    expect(isFluxOverdriveCar('2-sportivo-blue-combat')).toBe(false);
    expect(isFluxOverdriveCar('9-muscle-orange-bomber-combat')).toBe(false);
  });

  it('bridges 160 MPH on the dial to world speed via the HUD scale', () => {
    expect(FLUX_OVERDRIVE_MPH).toBe(140);
    expect(FLUX_OVERDRIVE_WORLD_SPEED).toBeCloseTo(140 / MPH_PER_WORLD_UNIT, 10);
    expect(formatMph(FLUX_OVERDRIVE_WORLD_SPEED)).toBe(140);
  });

  it('activates at ≥140 MPH for the DeLorean and nowhere else', () => {
    const justUnder = 139.4 / MPH_PER_WORLD_UNIT; // dial reads 139
    expect(formatMph(justUnder)).toBe(139);
    expect(isFluxOverdriveActive('10-delorean-steel-flux', justUnder)).toBe(false);

    expect(isFluxOverdriveActive('10-delorean-steel-flux', FLUX_OVERDRIVE_WORLD_SPEED)).toBe(true);
    expect(isFluxOverdriveActive('10-delorean-steel-flux', 80)).toBe(true);

    expect(isFluxOverdriveActive('2-sportivo-blue-combat', 80)).toBe(false);
    expect(isFluxOverdriveActive('9-muscle-orange-bomber-combat', FLUX_OVERDRIVE_WORLD_SPEED)).toBe(
      false,
    );
  });

  it('rejects non-finite speed', () => {
    expect(isFluxOverdriveActive('10-delorean-steel-flux', Number.NaN)).toBe(false);
    expect(isFluxOverdriveActive('10-delorean-steel-flux', Number.POSITIVE_INFINITY)).toBe(false);
  });
});
