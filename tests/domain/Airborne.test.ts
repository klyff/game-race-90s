import { describe, expect, it } from 'vitest';

import { integrateAirborne } from '../../src/domain/vehicle/Airborne.ts';
import { createVehicleState } from '../../src/domain/vehicle/Vehicle.ts';
import { RAMP_GRAVITY } from '../../src/domain/track/RampZone.ts';
import { SIMULATION_STEP_SECONDS } from '../../src/domain/constants.ts';

describe('integrateAirborne', () => {
  it('reaches the analytic peak height of a vertical launch', () => {
    const launch = 12;
    const analyticPeak = (launch * launch) / (2 * RAMP_GRAVITY);
    let state = { ...createVehicleState({ x: 0, y: 0 }, 0), verticalVelocity: launch };
    let peak = 0;
    for (let i = 0; i < 120; i += 1) {
      state = integrateAirborne(state, SIMULATION_STEP_SECONDS);
      peak = Math.max(peak, state.height);
    }
    expect(peak).toBeGreaterThan(analyticPeak * 0.92);
    expect(peak).toBeLessThan(analyticPeak * 1.08);
  });

  it('lands near the analytic airtime and clamps to the ground', () => {
    const launch = 12;
    const analyticAirtime = (2 * launch) / RAMP_GRAVITY;
    let state = { ...createVehicleState({ x: 0, y: 0 }, 0), verticalVelocity: launch };
    let elapsed = 0;
    while (elapsed < analyticAirtime + 0.2) {
      state = integrateAirborne(state, SIMULATION_STEP_SECONDS);
      elapsed += SIMULATION_STEP_SECONDS;
      if (state.height === 0 && state.verticalVelocity === 0 && elapsed > 0.05) {
        break;
      }
    }
    expect(elapsed).toBeGreaterThan(analyticAirtime * 0.85);
    expect(elapsed).toBeLessThan(analyticAirtime * 1.2);
    expect(state.height).toBe(0);
    expect(state.verticalVelocity).toBe(0);
  });

  it('is a no-op when grounded and not launching', () => {
    const grounded = createVehicleState({ x: 3, y: 4 }, 0.2);
    expect(integrateAirborne(grounded, SIMULATION_STEP_SECONDS)).toBe(grounded);
  });
});
