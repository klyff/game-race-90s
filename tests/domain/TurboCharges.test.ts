import { describe, expect, it } from 'vitest';
import {
  consumeTurbo,
  createTurboCharges,
  refillTurboCharges,
  TURBO_DURATION_SECONDS,
  TURBO_SPEED_BONUS,
  TURBO_START_COUNT,
} from '../../src/domain/vehicle/TurboCharges.ts';

describe('TurboCharges', () => {
  it('starts with 4 charges and refills to 4', () => {
    expect(createTurboCharges()).toBe(TURBO_START_COUNT);
    expect(consumeTurbo(1)).toBe(0);
    expect(consumeTurbo(0)).toBeNull();
    expect(refillTurboCharges(1)).toBe(4);
  });

  it('is +35% for 2 seconds', () => {
    expect(TURBO_SPEED_BONUS).toBe(0.35);
    expect(TURBO_DURATION_SECONDS).toBe(2);
  });
});
