/**
 * Career grid size. Always odd so the player sits in a pack, never a pair.
 * Watch / debug-IA keep their own denser fields.
 */
import { REGULAR_PILOTS } from '../../data/pilots/PilotRoster.ts';
import { profileFor } from '../ai/DriverRoster.ts';

export const CAREER_RACER_COUNT = 13;
export const CAREER_NPC_COUNT = CAREER_RACER_COUNT - 1;

/**
 * Pick `count` NPC pilot names with distinct AI profiles when the pool allows.
 * Career rivals are preferred; without a save, falls back to the regular roster.
 */
export function npcPilotNames(rivals: readonly string[], count: number): string[] {
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
