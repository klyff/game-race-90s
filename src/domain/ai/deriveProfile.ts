/**
 * Small deterministic jitter from a medium parent. Flavor, not a skill bonus.
 * Signatures must never pass through here.
 */

import {
  DRIVER_PROFILE_TIER,
  DRIVER_WEIGHT_IDS,
  clampWeights,
  type DriverProfile,
  type DriverWeightId,
} from './DriverProfile.ts';
import { clamp, hashUnit } from './math.ts';

const DEFAULT_JITTER = 0.08;
const SKILL_JITTER_SCALE = 0.35;

const WEIGHT_SALTS: Record<DriverWeightId, number> = {
  attack: 0x0ffe,
  defend: 0xdef1,
  overtake: 0x0e17,
  ram: 0x1a11,
  weapon: 0x11ea,
  block: 0xb10c,
  opponentPrediction: 0x51ee,
  opponentMemory: 0x11e1,
  localSteering: 0x57ee,
  vehiclePhysics: 0x5b11,
};

/**
 * Copy a medium (or any parent) and nudge each desire weight by ±jitter.
 * `vehiclePhysics` / `localSteering` stay in the parent's band — derivation
 * is not a hidden horsepower or skill upgrade.
 */
export function deriveProfile(
  parent: DriverProfile,
  seed: string,
  jitter: number = DEFAULT_JITTER,
): DriverProfile {
  const span = Math.max(0, jitter);
  const next: Record<DriverWeightId, number> = { ...parent };
  for (const id of DRIVER_WEIGHT_IDS) {
    const unit = hashUnit(`${seed}:${id}`, WEIGHT_SALTS[id]);
    const scale = id === 'vehiclePhysics' || id === 'localSteering' ? SKILL_JITTER_SCALE : 1;
    next[id] = parent[id] + (unit * 2 - 1) * span * scale;
  }
  const weights = clampWeights(next);
  const skillFloor = parent.vehiclePhysics - span * SKILL_JITTER_SCALE;
  const skillCeil = parent.vehiclePhysics + span * SKILL_JITTER_SCALE;
  const steerFloor = parent.localSteering - span * SKILL_JITTER_SCALE;
  const steerCeil = parent.localSteering + span * SKILL_JITTER_SCALE;
  return {
    ...parent,
    ...weights,
    vehiclePhysics: clamp(weights.vehiclePhysics, skillFloor, skillCeil),
    localSteering: clamp(weights.localSteering, steerFloor, steerCeil),
    id: seed.toLowerCase(),
    displayName: seed.toUpperCase(),
    tier: DRIVER_PROFILE_TIER.DERIVED,
    parentId: parent.id,
  };
}
