/**
 * Debug-IA grid: 15 NPC-only racers by default. Four signatures (Klyff, Aline, two
 * last-world jokers by skill), then a lottery of medium + derived pilots,
 * each on a shuffled car.
 *
 * Skill-mix grids (`drawSkillMixGrid`) pick by control skill, not catalog tier:
 * expert / medium / bobo bands from vehiclePhysics + localSteering + prediction.
 */

import { JOKER_PILOTS } from '../../data/pilots/PilotRoster.ts';
import { DERIVED_SPECS, DRIVER_PROFILE_TIER, MEDIUM_PROFILES, SIGNATURE_PROFILES } from '../ai/DriverProfile.ts';
import { profileFor } from '../ai/DriverRoster.ts';
import { driverSkill } from './WatchField.ts';

export const DEBUG_IA_RACER_COUNT = 15;
export const DEBUG_IA_SIGNATURE_COUNT = 4;
export const DEBUG_IA_CAMERA_MAP_FRACTION = 1;

export const SKILL_BAND = {
  EXPERT: 'expert',
  MEDIUM: 'medium',
  BOBO: 'bobo',
} as const;

export type SkillBand = (typeof SKILL_BAND)[keyof typeof SKILL_BAND];

/** driverSkill = vehiclePhysics + localSteering + opponentPrediction (≈1.3…3.0). */
export const SKILL_BAND_EXPERT_MIN = 2.6;
export const SKILL_BAND_BOBO_MAX = 1.85;

export interface SkillMix {
  readonly experts: number;
  readonly mediums: number;
  readonly bobos: number;
}

const SIGNATURE_LOCK = ['KLYFF', 'ALINE'] as const;

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const a = pool[i];
    const b = pool[j];
    if (a === undefined || b === undefined) {
      continue;
    }
    pool[i] = b;
    pool[j] = a;
  }
  return pool;
}

/** Last-world jokers ranked by the same skill score watch-mode uses. */
export function lastWorldBestPilots(count: number = 2): readonly string[] {
  return [...JOKER_PILOTS]
    .map(name => ({ name, skill: driverSkill(profileFor(name)) }))
    .sort((left, right) => right.skill - left.skill || left.name.localeCompare(right.name))
    .slice(0, Math.max(0, count))
    .map(entry => entry.name);
}

export function debugIaSignaturePilots(): readonly string[] {
  return [...SIGNATURE_LOCK, ...lastWorldBestPilots(2)];
}

function lotteryPool(): readonly string[] {
  const locked = new Set(debugIaSignaturePilots());
  const medium = MEDIUM_PROFILES.map(profile => profile.displayName);
  const derived = DERIVED_SPECS.map(spec => spec.displayName);
  return [...medium, ...derived].filter(name => !locked.has(name));
}

export function skillBandForName(name: string): SkillBand {
  const skill = driverSkill(profileFor(name));
  if (skill >= SKILL_BAND_EXPERT_MIN) {
    return SKILL_BAND.EXPERT;
  }
  if (skill <= SKILL_BAND_BOBO_MAX) {
    return SKILL_BAND.BOBO;
  }
  return SKILL_BAND.MEDIUM;
}

export interface DebugIaSeat {
  readonly name: string;
  readonly carId: string;
  readonly tier: string;
  readonly slot: 'signature' | 'lottery' | SkillBand;
}

export interface DebugIaGrid {
  readonly seed: number;
  readonly seats: readonly DebugIaSeat[];
}

export function drawDebugIaGrid(
  carIds: readonly string[],
  seed: number,
  racerCount: number = DEBUG_IA_RACER_COUNT,
): DebugIaGrid {
  const rng = mulberry32(Number.isFinite(seed) && seed > 0 ? seed : 1);
  const signatures = debugIaSignaturePilots();
  const wanted = Math.max(signatures.length, Math.floor(racerCount));
  const lotteryCount = Math.max(0, wanted - signatures.length);
  const lottery = shuffle(lotteryPool(), rng).slice(0, lotteryCount);
  const names = [...signatures, ...lottery];
  const uniqueCars = [...new Set(carIds.filter(id => id.length > 0))];
  const cars = uniqueCars.length > 0 ? shuffle(uniqueCars, rng) : ['car-1'];

  const seats = names.map((name, index) => {
    const base = cars[index] ?? cars[index % cars.length] ?? 'car-1';
    const carId = `${base}#${index}`;
    const profile = profileFor(name);
    return {
      name,
      carId,
      tier: profile.tier ?? DRIVER_PROFILE_TIER.DERIVED,
      slot: index < signatures.length ? 'signature' : 'lottery',
    } as const;
  });

  return { seed, seats };
}

function catalogNames(): readonly string[] {
  return [
    ...SIGNATURE_PROFILES.map(profile => profile.displayName),
    ...MEDIUM_PROFILES.map(profile => profile.displayName),
  ];
}

function pickBand(
  names: readonly string[],
  band: SkillBand,
  count: number,
  preferLowSkill: boolean,
): string[] {
  const ranked = names
    .filter(name => skillBandForName(name) === band)
    .map(name => ({ name, skill: driverSkill(profileFor(name)) }))
    .sort((left, right) =>
      preferLowSkill
        ? left.skill - right.skill || left.name.localeCompare(right.name)
        : right.skill - left.skill || left.name.localeCompare(right.name),
    );
  if (ranked.length < count) {
    throw new Error(
      `skill mix needs ${count} ${band} pilots, catalog has ${ranked.length}`,
    );
  }
  return ranked.slice(0, count).map(entry => entry.name);
}

/**
 * Controlled skill test: N experts, N mediums, N bobos on shuffled cars.
 * Experts = highest skill in the expert band; bobos = lowest in the bobo band.
 * Seat order is shuffled so the smart ones do not all start at the front.
 */
export function drawSkillMixGrid(
  carIds: readonly string[],
  seed: number,
  mix: SkillMix,
): DebugIaGrid {
  const experts = Math.max(0, Math.floor(mix.experts));
  const mediums = Math.max(0, Math.floor(mix.mediums));
  const bobos = Math.max(0, Math.floor(mix.bobos));
  const total = experts + mediums + bobos;
  if (total < 1) {
    throw new Error('skill mix needs at least one racer');
  }

  const pool = catalogNames();
  const names = [
    ...pickBand(pool, SKILL_BAND.EXPERT, experts, false),
    ...pickBand(pool, SKILL_BAND.MEDIUM, mediums, false),
    ...pickBand(pool, SKILL_BAND.BOBO, bobos, true),
  ];

  const rng = mulberry32(Number.isFinite(seed) && seed > 0 ? seed : 1);
  const shuffledNames = shuffle(names, rng);
  const uniqueCars = [...new Set(carIds.filter(id => id.length > 0))];
  const cars = uniqueCars.length > 0 ? shuffle(uniqueCars, rng) : ['car-1'];

  const seats = shuffledNames.map((name, index) => {
    const base = cars[index] ?? cars[index % cars.length] ?? 'car-1';
    const carId = `${base}#${index}`;
    const profile = profileFor(name);
    return {
      name,
      carId,
      tier: profile.tier ?? DRIVER_PROFILE_TIER.DERIVED,
      slot: skillBandForName(name),
    } as const;
  });

  return { seed, seats };
}
