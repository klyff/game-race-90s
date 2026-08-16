import { describe, it, expect } from 'vitest';
import { COAST_BRAKE, COAST_STOP_SPEED, coastInput, isNearlyStopped } from '../../src/domain/race/Coast.ts';

describe('Coast', () => {
  it('brakes a rolling finisher and plants a stopped one', () => {
    expect(coastInput(20).brake).toBe(COAST_BRAKE);
    expect(coastInput(20).throttle).toBe(0);
    expect(coastInput(0).brake).toBe(1);
  });

  it('treats anything under the stop speed as parked', () => {
    expect(isNearlyStopped(COAST_STOP_SPEED - 0.01)).toBe(true);
    expect(isNearlyStopped(COAST_STOP_SPEED + 1)).toBe(false);
    expect(isNearlyStopped(Number.NaN)).toBe(true);
  });
});
