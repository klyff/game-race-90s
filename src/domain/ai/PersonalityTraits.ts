/**
 * Extra decision traits. Old catalog rows omit them; defaults keep identity.
 * These never change VehicleStats.
 */

import type { DriverProfile } from './DriverProfile.ts';
import { clamp01 } from './math.ts';

export interface DriverDecisionTraits {
  readonly riskTolerance: number;
  readonly raceFocus: number;
  readonly patience: number;
  readonly commitment: number;
}

export function decisionTraits(profile: DriverProfile): DriverDecisionTraits {
  return {
    riskTolerance: profile.riskTolerance ?? clamp01(0.32 + profile.ram * 0.35 + profile.attack * 0.2),
    raceFocus: profile.raceFocus ?? clamp01(0.58 + profile.defend * 0.22 - profile.ram * 0.18),
    patience: profile.patience ?? clamp01(0.42 + profile.defend * 0.28 - profile.overtake * 0.12),
    commitment: profile.commitment ?? clamp01(0.4 + profile.vehiclePhysics * 0.35 + profile.localSteering * 0.1),
  };
}

/** Bounded personality multiplier: 0.5 .. 1.5 */
export function personalityBias(weight: number): number {
  return 0.5 + clamp01(weight);
}
