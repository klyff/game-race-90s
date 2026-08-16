import { RAMP_GRAVITY } from '../track/RampZone.ts';
import type { VehicleState } from './Vehicle.ts';

/**
 * Advances a car's height and vertical velocity by `dt` seconds under
 * constant gravity, clamping to the ground on landing. Deliberately
 * separate from `stepVehicle`: gravity runs every step regardless of
 * ground physics, and landing is just this clamp — there is no distinct
 * "landing" event to detect, `isAirborne` simply goes false on the next
 * step once `height` returns to 0.
 *
 * A cheap no-op when already grounded and not launching, so a car that
 * never sees a ramp pays nothing extra per step.
 */
export function integrateAirborne(state: VehicleState, dt: number): VehicleState {
  if (state.height <= 0 && state.verticalVelocity <= 0) {
    return state;
  }

  const verticalVelocity = state.verticalVelocity - RAMP_GRAVITY * dt;
  const height = Math.max(0, state.height + verticalVelocity * dt);

  return {
    ...state,
    height,
    verticalVelocity: height > 0 ? verticalVelocity : 0,
  };
}
