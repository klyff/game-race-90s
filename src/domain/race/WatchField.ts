/**
 * Watch-mode grid: ten medium-tier (level 2) drivers, skill-sorted,
 * and the leftover cars parked as the reserve pack.
 *
 * Planet-II tracks alternate the two packs so the leftover cars still race
 * on the next circuit instead of sitting unused.
 */

import { MEDIUM_PROFILES, type DriverProfile } from '../ai/DriverProfile.ts';
import { PLANETS, planetTrackId } from '../../data/tracks/planets.ts';

export const WATCH_RACER_COUNT = 10;

export function driverSkill(profile: DriverProfile): number {
  return profile.vehiclePhysics + profile.localSteering + profile.opponentPrediction;
}

/** All ten medium archetypes, smartest first. */
export function watchPilots(): readonly string[] {
  return [...MEDIUM_PROFILES]
    .sort((left, right) => driverSkill(right) - driverSkill(left) || left.id.localeCompare(right.id))
    .map(profile => profile.displayName);
}

/** Track II of every planet, campaign order. */
export function watchPlanetTwoTracks(): readonly string[] {
  return PLANETS.map(planet => planetTrackId(planet, 2));
}

export function watchFieldPacks(carIds: readonly string[]): {
  readonly packA: readonly string[];
  readonly packB: readonly string[];
} {
  const unique: string[] = [];
  for (const id of carIds) {
    if (!unique.includes(id)) {
      unique.push(id);
    }
  }
  return {
    packA: unique.slice(0, WATCH_RACER_COUNT),
    packB: unique.slice(WATCH_RACER_COUNT, WATCH_RACER_COUNT * 2),
  };
}

export function splitWatchRoster(
  carIds: readonly string[],
  planetTwoIndex: number,
): { readonly field: readonly string[]; readonly reserve: readonly string[] } {
  const { packA, packB } = watchFieldPacks(carIds);
  const useA = planetTwoIndex % 2 === 0;
  return useA
    ? { field: packA, reserve: packB }
    : { field: packB.length > 0 ? packB : packA, reserve: packB.length > 0 ? packA : [] };
}

export function nextWatchTrack(currentId: string, step: number): string {
  const tracks = watchPlanetTwoTracks();
  const index = tracks.indexOf(currentId);
  const from = index >= 0 ? index : 0;
  const next = (from + step + tracks.length * 8) % tracks.length;
  return tracks[next] ?? tracks[0] ?? currentId;
}
