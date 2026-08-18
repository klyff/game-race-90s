/**
 * Race name → DriverProfile. Named pilots stay named.
 * FLUFE is Emma. KLYFF is available if the player types it.
 */

import {
  DERIVED_SPECS,
  DRIVER_PROFILE_TIER,
  MEDIUM_PROFILES,
  SIGNATURE_PROFILES,
  mediumById,
  type DriverProfile,
} from './DriverProfile.ts';
import { deriveProfile } from './deriveProfile.ts';

const DERIVED_PROFILES: readonly DriverProfile[] = DERIVED_SPECS.map(spec => {
  const parent = mediumById(spec.parentId);
  if (parent === undefined) {
    throw new Error(`derived spec ${spec.id} points at missing medium ${spec.parentId}`);
  }
  const derived = deriveProfile(parent, spec.displayName);
  return {
    ...derived,
    id: spec.id,
    displayName: spec.displayName,
    tier: DRIVER_PROFILE_TIER.DERIVED,
    parentId: spec.parentId,
  };
});

/** All 30 catalog rows. */
export const ALL_PROFILES: readonly DriverProfile[] = [
  ...SIGNATURE_PROFILES,
  ...MEDIUM_PROFILES,
  ...DERIVED_PROFILES,
];

/** Explicit race-name → catalog id. */
const NAME_TO_PROFILE_ID: Readonly<Record<string, string>> = {
  KLYFF: 'klyff',
  ALINE: 'aline',
  ENZO: 'enzo',
  FLUFE: 'emma',
  EMMA: 'emma',
  VIKTOR: 'viktor',
  SEAMUS: 'seamus',
  NEGAO: 'negao',
  LUCA: 'luca',
  ZOR9: 'zor9',
  DAVE: 'dave',
  RAZOR: 'razor',
  NIKKI: 'nikki',
  DIEGO: 'diego',
  LUNA: 'luna',
  BLAZE: 'blaze',
  KIRA: 'kira',
  SNAKE: 'snake',
  RIO: 'rio',
  JETT: 'jett',
  NOVA: 'nova',
  APEX: 'apex',
  PREDATOR: 'predator',
  ENFORCER: 'enforcer',
  GUNSLINGER: 'gunslinger',
  GUARDIAN: 'guardian',
  OPPORTUNIST: 'opportunist',
  BERSERKER: 'berserker',
  TECHNICIAN: 'technician',
  SLIPSTREAMER: 'slipstreamer',
  NEMESIS: 'nemesis',
};

/**
 * Regulars without their own catalog row resolve through a medium parent.
 * This is the reserve working: 30 rows in the file, every named pilot still resolves.
 */
const ASSIGNED_MEDIUM: Readonly<Record<string, string>> = {
  CRUZ: 'guardian',
  ASH: 'opportunist',
  ZARA: 'predator',
  VINCE: 'enforcer',
  RUBY: 'slipstreamer',
  HEX: 'technician',
};

const BY_ID: Readonly<Record<string, DriverProfile>> = Object.fromEntries(
  ALL_PROFILES.map(profile => [profile.id, profile]),
);

export function profileById(id: string): DriverProfile | undefined {
  return BY_ID[id];
}

/**
 * Resolve a race name to a profile. Same name → same profile forever.
 * Unknown names derive from opportunist so a missing row cannot crash a race.
 */
export function profileFor(name: string): DriverProfile {
  const key = name.trim().toUpperCase();
  const explicitId = NAME_TO_PROFILE_ID[key];
  if (explicitId !== undefined) {
    const found = BY_ID[explicitId];
    if (found !== undefined) {
      return found;
    }
  }
  const mediumId = ASSIGNED_MEDIUM[key] ?? 'opportunist';
  const parent = mediumById(mediumId) ?? MEDIUM_PROFILES[0];
  if (parent === undefined) {
    return SIGNATURE_PROFILES[0] as DriverProfile;
  }
  return deriveProfile(parent, key);
}

export function catalogSize(): number {
  return ALL_PROFILES.length;
}
