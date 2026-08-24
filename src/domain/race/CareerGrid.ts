/**
 * Career grid size. Always odd so the player sits in a pack, never a pair.
 * Watch / debug-IA keep their own denser fields.
 *
 * Early worlds mix medium-dumb + bobo + a few medium-smart. Experts stay
 * off Thunder Basin so the pack is not all A-game pilots.
 */
import { REGULAR_PILOTS } from '../../data/pilots/PilotRoster.ts';
import { profileFor } from '../ai/DriverRoster.ts';
import { driverSkill } from './WatchField.ts';
import { SKILL_BAND, SKILL_BAND_BOBO_MAX, SKILL_BAND_EXPERT_MIN, type SkillBand } from './DebugIaField.ts';

export const CAREER_RACER_COUNT = 13;
export const CAREER_NPC_COUNT = CAREER_RACER_COUNT - 1;

/** Medium-smart sits under expert, above the old "all mediums were 2.6+". */
export const SKILL_BAND_MEDIUM_SMART_MIN = 2.2;

export type CareerSkillLane = SkillBand | 'mediumSmart' | 'mediumDumb';

export interface CareerNpcMix {
  readonly experts: number;
  readonly mediumSmart: number;
  readonly mediumDumb: number;
  readonly bobos: number;
}

export function careerNpcMix(planetIndex: number): CareerNpcMix {
  const planet = Number.isFinite(planetIndex) ? Math.max(1, Math.floor(planetIndex)) : 1;
  if (planet <= 2) {
    return { experts: 0, mediumSmart: 4, mediumDumb: 4, bobos: 4 };
  }
  if (planet <= 5) {
    return { experts: 1, mediumSmart: 4, mediumDumb: 4, bobos: 3 };
  }
  if (planet <= 9) {
    return { experts: 2, mediumSmart: 5, mediumDumb: 3, bobos: 2 };
  }
  return { experts: 3, mediumSmart: 5, mediumDumb: 3, bobos: 1 };
}

export function careerSkillLane(name: string): CareerSkillLane {
  const skill = driverSkill(profileFor(name));
  if (skill >= SKILL_BAND_EXPERT_MIN) {
    return SKILL_BAND.EXPERT;
  }
  if (skill <= SKILL_BAND_BOBO_MAX) {
    return SKILL_BAND.BOBO;
  }
  if (skill >= SKILL_BAND_MEDIUM_SMART_MIN) {
    return 'mediumSmart';
  }
  return 'mediumDumb';
}

/**
 * Pick `count` NPC pilot names with distinct AI profiles when the pool allows.
 * Career rivals are preferred; without a save, falls back to the regular roster.
 * Without a planet, keeps the old first-unique-profile order (tests).
 */
export function npcPilotNames(rivals: readonly string[], count: number): string[] {
  return pickDistinctProfiles(rivals, count);
}

/** Planet-aware mix: medium-dumb / bobo early, experts later. */
export function npcPilotNamesForPlanet(
  rivals: readonly string[],
  count: number,
  planetIndex: number,
): string[] {
  const wanted = Math.max(0, Math.floor(count));
  if (wanted === 0) {
    return [];
  }
  const pool = rivals.length > 0 ? [...rivals] : [...REGULAR_PILOTS];
  const mix = careerNpcMix(planetIndex);
  const picked: string[] = [];
  const usedProfiles = new Set<string>();

  const take = (lane: CareerSkillLane, need: number): void => {
    for (const name of pool) {
      if (picked.length >= wanted || need <= 0) {
        return;
      }
      if (careerSkillLane(name) !== lane) {
        continue;
      }
      const profileId = profileFor(name).id;
      if (usedProfiles.has(profileId) || picked.includes(name)) {
        continue;
      }
      usedProfiles.add(profileId);
      picked.push(name);
      need -= 1;
    }
  };

  take(SKILL_BAND.BOBO, mix.bobos);
  take('mediumDumb', mix.mediumDumb);
  take('mediumSmart', mix.mediumSmart);
  take(SKILL_BAND.EXPERT, mix.experts);

  for (const name of pickDistinctProfiles(pool, wanted)) {
    if (picked.length >= wanted) {
      break;
    }
    if (!picked.includes(name)) {
      usedProfiles.add(profileFor(name).id);
      picked.push(name);
    }
  }

  for (let index = picked.length; index < wanted; index += 1) {
    picked.push(`RIV${index + 1}`);
  }
  return picked.slice(0, wanted);
}

function pickDistinctProfiles(rivals: readonly string[], count: number): string[] {
  const wanted = Math.max(0, Math.floor(count));
  if (wanted === 0) {
    return [];
  }

  const pool = rivals.length > 0 ? [...rivals] : [...REGULAR_PILOTS];
  const picked: string[] = [];
  const usedProfiles = new Set<string>();

  for (const name of pool) {
    if (picked.length >= wanted) {
      break;
    }
    const profileId = profileFor(name).id;
    if (!usedProfiles.has(profileId)) {
      usedProfiles.add(profileId);
      picked.push(name);
    }
  }

  for (const name of pool) {
    if (picked.length >= wanted) {
      break;
    }
    if (!picked.includes(name)) {
      picked.push(name);
    }
  }

  for (let index = picked.length; index < wanted; index += 1) {
    picked.push(`RIV${index + 1}`);
  }

  return picked.slice(0, wanted);
}
