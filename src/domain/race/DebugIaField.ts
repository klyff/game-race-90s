/**
 * Debug-IA grid: 14 NPC-only racers. Four signatures (Klyff, Aline, two
 * last-world jokers by skill), then a lottery of medium + derived pilots,
 * each on a shuffled car.
 */

import { JOKER_PILOTS } from '../../data/pilots/PilotRoster.ts';
import { DERIVED_SPECS, DRIVER_PROFILE_TIER, MEDIUM_PROFILES } from '../ai/DriverProfile.ts';
import { profileFor } from '../ai/DriverRoster.ts';
import { driverSkill } from './WatchField.ts';

export const DEBUG_IA_RACER_COUNT = 14;
export const DEBUG_IA_SIGNATURE_COUNT = 4;
export const DEBUG_IA_CAMERA_MAP_FRACTION = 0.45;

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

export interface DebugIaSeat {
  readonly name: string;
  readonly carId: string;
  readonly tier: string;
  readonly slot: 'signature' | 'lottery';
}

export interface DebugIaGrid {
  readonly seed: number;
  readonly seats: readonly DebugIaSeat[];
}

export function drawDebugIaGrid(carIds: readonly string[], seed: number): DebugIaGrid {
  const rng = mulberry32(Number.isFinite(seed) && seed > 0 ? seed : 1);
  const signatures = debugIaSignaturePilots();
  const lotteryCount = Math.max(0, DEBUG_IA_RACER_COUNT - signatures.length);
  const lottery = shuffle(lotteryPool(), rng).slice(0, lotteryCount);
  const names = [...signatures, ...lottery];
  const uniqueCars = [...new Set(carIds.filter(id => id.length > 0))];
  const cars = uniqueCars.length > 0 ? shuffle(uniqueCars, rng) : ['car-1'];

  const seats = names.map((name, index) => {
    const carId = cars[index] ?? cars[index % cars.length] ?? 'car-1';
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
