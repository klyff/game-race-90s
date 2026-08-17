/**
 * Driver skill as control limits — never as VehicleStats mutations.
 *
 * High vehiclePhysics: later brakes, more corner speed, closer to real grip.
 * Low vehiclePhysics: earlier brakes, unused grip.
 * localSteering is path-tracking precision, not horsepower.
 */

import type { PaceDriverOptions } from '../vehicle/PaceDriver.ts';
import { clamp01, lerp } from './math.ts';

export interface SkillControlLimits {
  readonly usableGripFraction: number;
  readonly usableBrakeFraction: number;
  readonly usableSteeringFraction: number;
  readonly trackingPrecision: number;
}

export function skillControlLimits(
  vehiclePhysics: number,
  localSteering: number,
): SkillControlLimits {
  const physics = clamp01(vehiclePhysics);
  const steering = clamp01(localSteering);
  return {
    usableGripFraction: lerp(0.75, 0.98, physics),
    usableBrakeFraction: lerp(0.72, 0.98, physics),
    usableSteeringFraction: lerp(0.75, 0.99, physics),
    trackingPrecision: lerp(0.7, 1, steering),
  };
}

/**
 * Map skill onto the existing PaceDriver knobs.
 * Smaller fullLockBearing = sharper tracking. Longer corner look-ahead = earlier brake.
 */
export function applySkillToDriveOptions(
  base: PaceDriverOptions,
  vehiclePhysics: number,
  localSteering: number,
): PaceDriverOptions {
  const limits = skillControlLimits(vehiclePhysics, localSteering);
  const grip = Math.min(0.99, limits.usableGripFraction);
  return {
    ...base,
    cornerSafetyFactor: grip,
    cornerLookAheadMinimum: base.cornerLookAheadMinimum * lerp(1.28, 0.78, limits.usableBrakeFraction),
    fullLockBearing: base.fullLockBearing * lerp(1.22, 0.86, limits.usableSteeringFraction * limits.trackingPrecision),
    lookAheadScaleFactor: base.lookAheadScaleFactor * lerp(1.12, 0.92, limits.trackingPrecision),
    lookAheadBase: base.lookAheadBase * lerp(1.1, 0.95, limits.trackingPrecision),
  };
}
