/**
 * DeLorean Flux overdrive presentation gate.
 *
 * At ≥160 MPH on the dial the car swaps rubber skids for fire trails and
 * throws lightning. Threshold uses the same MPH scale as the HUD so the
 * player sees the FX kick in when the needle crosses 160 — never earlier.
 *
 * Pure: no Phaser. Simulation stays unaware of MPH (HudFormat contract).
 */

import { isPlayerOnlyCarId } from '../../data/cars/FleetStatus.ts';
import { formatMph, MPH_PER_WORLD_UNIT } from './HudFormat.ts';

/** Dial MPH at which Flux overdrive VFX begin. */
export const FLUX_OVERDRIVE_MPH = 140;

/**
 * World-speed floor that maps to {@link FLUX_OVERDRIVE_MPH} before rounding.
 * Kept for tests that assert the physics↔dial bridge without calling formatMph.
 */
export const FLUX_OVERDRIVE_WORLD_SPEED = FLUX_OVERDRIVE_MPH / MPH_PER_WORLD_UNIT;

/** True for cars that own the Flux overdrive band (live DeLorean flagship). */
export function isFluxOverdriveCar(carId: string): boolean {
  return isPlayerOnlyCarId(carId);
}

/**
 * True when this car should paint fire trails + lightning instead of rubber.
 * Uses the HUD MPH reading so dial and FX stay in lockstep.
 */
export function isFluxOverdriveActive(carId: string, forwardSpeed: number): boolean {
  if (!isFluxOverdriveCar(carId)) {
    return false;
  }
  if (!Number.isFinite(forwardSpeed)) {
    return false;
  }
  return formatMph(forwardSpeed) >= FLUX_OVERDRIVE_MPH;
}
