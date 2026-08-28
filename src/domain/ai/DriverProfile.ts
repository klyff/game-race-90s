/**
 * Data-driven driver personality. A profile is desire, not horsepower.
 *
 * `vehiclePhysics` and `localSteering` never mutate VehicleStats. They only
 * change how close the driver is willing/able to operate to the car's limits.
 *
 * Thirty rows: 10 signatures, 10 medium templates (derivation reserve), 10 derived.
 * Elite ladder (driverSkill = phys + steer + pred, max 3): KLYFF 3.0, ALINE 2.7
 * (90%), ENZO and CAROL 2.4 (80%). vehiclePhysics never mutates VehicleStats.
 * GAMEPLAY TUNING STILL REQUIRED — these weights are a readable starting point.
 */

import { clamp01 } from './math.ts';

export const DRIVER_PROFILE_TIER = {
  SIGNATURE: 'signature',
  MEDIUM: 'medium',
  DERIVED: 'derived',
} as const;

export type DriverProfileTier = (typeof DRIVER_PROFILE_TIER)[keyof typeof DRIVER_PROFILE_TIER];

export const DRIVER_WEIGHT_IDS = [
  'attack',
  'defend',
  'overtake',
  'ram',
  'weapon',
  'block',
  'opponentPrediction',
  'opponentMemory',
  'localSteering',
  'vehiclePhysics',
] as const;

export type DriverWeightId = (typeof DRIVER_WEIGHT_IDS)[number];

export type DriverWeights = { readonly [K in DriverWeightId]: number };

export interface DriverProfile extends DriverWeights {
  readonly id: string;
  readonly displayName: string;
  readonly tier: DriverProfileTier;
  /** Medium parent when this row was derived. Signatures and mediums omit it. */
  readonly parentId?: string;
  /** Optional V2 traits — omitted rows use `decisionTraits()` defaults. */
  readonly riskTolerance?: number;
  readonly raceFocus?: number;
  readonly patience?: number;
  readonly commitment?: number;
}

export function clampWeights(weights: DriverWeights): DriverWeights {
  return {
    attack: clamp01(weights.attack),
    defend: clamp01(weights.defend),
    overtake: clamp01(weights.overtake),
    ram: clamp01(weights.ram),
    weapon: clamp01(weights.weapon),
    block: clamp01(weights.block),
    opponentPrediction: clamp01(weights.opponentPrediction),
    opponentMemory: clamp01(weights.opponentMemory),
    localSteering: clamp01(weights.localSteering),
    vehiclePhysics: clamp01(weights.vehiclePhysics),
  };
}

function row(
  id: string,
  displayName: string,
  tier: DriverProfileTier,
  weights: DriverWeights,
  parentId?: string,
): DriverProfile {
  return { id, displayName, tier, parentId, ...clampWeights(weights) };
}

/** Hand-authored signatures. Do not derive these. Uniqueness is the table. */
export const SIGNATURE_PROFILES: readonly DriverProfile[] = [
  row('klyff', 'KLYFF', DRIVER_PROFILE_TIER.SIGNATURE, {
    attack: 0.55,
    defend: 0.75,
    overtake: 0.85,
    ram: 0.15,
    weapon: 0.5,
    block: 0.5,
    opponentPrediction: 1,
    opponentMemory: 0.45,
    localSteering: 1,
    vehiclePhysics: 1,
  }),
  row('aline', 'ALINE', DRIVER_PROFILE_TIER.SIGNATURE, {
    attack: 0.6,
    defend: 0.55,
    overtake: 0.95,
    ram: 0.1,
    weapon: 0.45,
    block: 0.45,
    opponentPrediction: 0.9,
    opponentMemory: 0.4,
    localSteering: 0.9,
    vehiclePhysics: 0.9,
  }),
  row('enzo', 'ENZO', DRIVER_PROFILE_TIER.SIGNATURE, {
    attack: 0.85,
    defend: 0.42,
    overtake: 0.9,
    ram: 0.25,
    weapon: 0.4,
    block: 0.36,
    opponentPrediction: 0.8,
    opponentMemory: 0.5,
    localSteering: 0.8,
    vehiclePhysics: 0.8,
  }),
  row('carol', 'CAROL', DRIVER_PROFILE_TIER.SIGNATURE, {
    attack: 0.72,
    defend: 0.48,
    overtake: 0.82,
    ram: 0.38,
    weapon: 0.52,
    block: 0.42,
    opponentPrediction: 0.8,
    opponentMemory: 0.55,
    localSteering: 0.8,
    vehiclePhysics: 0.8,
  }),
  row('emma', 'EMMA', DRIVER_PROFILE_TIER.SIGNATURE, {
    attack: 0.8,
    defend: 0.2,
    overtake: 0.7,
    ram: 0.35,
    weapon: 0.95,
    block: 0.25,
    opponentPrediction: 0.55,
    opponentMemory: 0.5,
    localSteering: 0.5,
    vehiclePhysics: 0.48,
  }),
  row('viktor', 'VIKTOR', DRIVER_PROFILE_TIER.SIGNATURE, {
    attack: 0.7,
    defend: 0.95,
    overtake: 0.4,
    ram: 0.55,
    weapon: 0.5,
    block: 0.95,
    opponentPrediction: 0.75,
    opponentMemory: 0.8,
    localSteering: 0.7,
    vehiclePhysics: 0.78,
  }),
  row('seamus', 'SEAMUS', DRIVER_PROFILE_TIER.SIGNATURE, {
    attack: 1,
    defend: 0.2,
    overtake: 0.6,
    ram: 1,
    weapon: 0.9,
    block: 0.6,
    opponentPrediction: 0.4,
    opponentMemory: 0.95,
    localSteering: 0.45,
    vehiclePhysics: 0.45,
  }),
  row('negao', 'NEGAO', DRIVER_PROFILE_TIER.SIGNATURE, {
    attack: 0.9,
    defend: 0.7,
    overtake: 0.45,
    ram: 0.98,
    weapon: 0.55,
    block: 0.85,
    opponentPrediction: 0.55,
    opponentMemory: 0.75,
    localSteering: 0.5,
    vehiclePhysics: 0.75,
  }),
  row('luca', 'LUCA', DRIVER_PROFILE_TIER.SIGNATURE, {
    attack: 0.55,
    defend: 0.9,
    overtake: 0.5,
    ram: 0.35,
    weapon: 0.55,
    block: 0.8,
    opponentPrediction: 0.9,
    opponentMemory: 0.9,
    localSteering: 0.85,
    vehiclePhysics: 0.88,
  }),
  row('zor9', 'ZOR9', DRIVER_PROFILE_TIER.SIGNATURE, {
    attack: 0.7,
    defend: 0.5,
    overtake: 0.65,
    ram: 0.15,
    weapon: 0.9,
    block: 0.4,
    opponentPrediction: 1,
    opponentMemory: 0.6,
    localSteering: 0.8,
    vehiclePhysics: 0.85,
  }),
];

/**
 * Medium reserve — the original ten archetypes. May sit unused on the live grid.
 * Derived pilots copy one of these, then take a small seeded jitter.
 */
export const MEDIUM_PROFILES: readonly DriverProfile[] = [
  row('apex', 'APEX', DRIVER_PROFILE_TIER.MEDIUM, {
    attack: 0.6,
    defend: 0.55,
    overtake: 0.85,
    ram: 0.1,
    weapon: 0.45,
    block: 0.45,
    opponentPrediction: 0.75,
    opponentMemory: 0.4,
    localSteering: 0.8,
    vehiclePhysics: 0.78,
  }),
  row('predator', 'PREDATOR', DRIVER_PROFILE_TIER.MEDIUM, {
    attack: 0.9,
    defend: 0.45,
    overtake: 0.8,
    ram: 0.55,
    weapon: 0.85,
    block: 0.55,
    opponentPrediction: 0.9,
    opponentMemory: 0.75,
    localSteering: 0.8,
    vehiclePhysics: 0.8,
  }),
  row('enforcer', 'ENFORCER', DRIVER_PROFILE_TIER.MEDIUM, {
    attack: 0.9,
    defend: 0.7,
    overtake: 0.45,
    ram: 0.98,
    weapon: 0.55,
    block: 0.85,
    opponentPrediction: 0.55,
    opponentMemory: 0.75,
    localSteering: 0.5,
    vehiclePhysics: 0.75,
  }),
  row('gunslinger', 'GUNSLINGER', DRIVER_PROFILE_TIER.MEDIUM, {
    attack: 0.85,
    defend: 0.4,
    overtake: 0.55,
    ram: 0.2,
    weapon: 1,
    block: 0.35,
    opponentPrediction: 0.95,
    opponentMemory: 0.75,
    localSteering: 0.65,
    vehiclePhysics: 0.7,
  }),
  row('guardian', 'GUARDIAN', DRIVER_PROFILE_TIER.MEDIUM, {
    attack: 0.35,
    defend: 0.98,
    overtake: 0.6,
    ram: 0.3,
    weapon: 0.4,
    block: 0.95,
    opponentPrediction: 0.8,
    opponentMemory: 0.65,
    localSteering: 0.85,
    vehiclePhysics: 0.85,
  }),
  row('opportunist', 'OPPORTUNIST', DRIVER_PROFILE_TIER.MEDIUM, {
    attack: 0.65,
    defend: 0.6,
    overtake: 0.75,
    ram: 0.35,
    weapon: 0.7,
    block: 0.6,
    opponentPrediction: 0.72,
    opponentMemory: 0.55,
    localSteering: 0.7,
    vehiclePhysics: 0.68,
  }),
  row('berserker', 'BERSERKER', DRIVER_PROFILE_TIER.MEDIUM, {
    attack: 1,
    defend: 0.2,
    overtake: 0.6,
    ram: 1,
    weapon: 0.9,
    block: 0.6,
    opponentPrediction: 0.4,
    opponentMemory: 0.95,
    localSteering: 0.45,
    vehiclePhysics: 0.45,
  }),
  row('technician', 'TECHNICIAN', DRIVER_PROFILE_TIER.MEDIUM, {
    attack: 0.55,
    defend: 0.75,
    overtake: 0.8,
    ram: 0.2,
    weapon: 0.6,
    block: 0.65,
    opponentPrediction: 1,
    opponentMemory: 0.8,
    localSteering: 1,
    vehiclePhysics: 1,
  }),
  row('slipstreamer', 'SLIPSTREAMER', DRIVER_PROFILE_TIER.MEDIUM, {
    attack: 0.45,
    defend: 0.45,
    overtake: 0.9,
    ram: 0.1,
    weapon: 0.35,
    block: 0.35,
    opponentPrediction: 0.72,
    opponentMemory: 0.35,
    localSteering: 0.78,
    vehiclePhysics: 0.72,
  }),
  row('nemesis', 'NEMESIS', DRIVER_PROFILE_TIER.MEDIUM, {
    attack: 0.9,
    defend: 0.55,
    overtake: 0.65,
    ram: 0.8,
    weapon: 0.8,
    block: 0.65,
    opponentPrediction: 0.9,
    opponentMemory: 1,
    localSteering: 0.75,
    vehiclePhysics: 0.75,
  }),
];

export const DERIVED_SPECS = [
  { id: 'dave', displayName: 'DAVE', parentId: 'apex' },
  { id: 'razor', displayName: 'RAZOR', parentId: 'predator' },
  { id: 'diego', displayName: 'DIEGO', parentId: 'guardian' },
  { id: 'luna', displayName: 'LUNA', parentId: 'technician' },
  { id: 'blaze', displayName: 'BLAZE', parentId: 'opportunist' },
  { id: 'kira', displayName: 'KIRA', parentId: 'slipstreamer' },
  { id: 'snake', displayName: 'SNAKE', parentId: 'nemesis' },
  { id: 'rio', displayName: 'RIO', parentId: 'enforcer' },
  { id: 'jett', displayName: 'JETT', parentId: 'gunslinger' },
  { id: 'nova', displayName: 'NOVA', parentId: 'opportunist' },
] as const;

export function mediumById(id: string): DriverProfile | undefined {
  return MEDIUM_PROFILES.find(profile => profile.id === id);
}

export function signatureById(id: string): DriverProfile | undefined {
  return SIGNATURE_PROFILES.find(profile => profile.id === id);
}

/**
 * Remaining knobs that are IMPLEMENTATION COMPLETE as structure but
 * GAMEPLAY TUNING STILL REQUIRED. Do not treat the authored numbers as balanced.
 */
export const TUNING_STILL_REQUIRED = [
  'signature and medium desire weights',
  'utility opportunity / tactical / risk coefficients',
  'hysteresis threshold and commitment frames',
  'trajectory candidate spacing and intention reweights',
  'prediction horizon and memory decay',
  'vehiclePhysics usable-fraction floors',
] as const;
