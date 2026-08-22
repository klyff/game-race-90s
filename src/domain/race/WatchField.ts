/**
 * Watch-mode grid: ten medium-tier (level 2) drivers, skill-sorted,
 * and the leftover cars parked as the reserve pack.
 *
 * Planet-II tracks alternate the two packs so the leftover cars still race
 * on the next circuit instead of sitting unused.
 */

import { isNewFleetCarId, isNogoLabCarId } from '../../data/cars/CarManifest.ts';
import { MEDIUM_PROFILES, type DriverProfile } from '../ai/DriverProfile.ts';
import { PLANETS, TRACKS_PER_PLANET, planetTrackId } from '../../data/tracks/planets.ts';

export const WATCH_RACER_COUNT = 10;
/** Splash `P`: 15 AI cars, same grid size as debug-IA. */
export const WATCH_ATTRACT_RACER_COUNT = 15;

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

/** First planet, all three circuits — splash Watch (`P`). */
export function watchAttractTracks(): readonly string[] {
  const planet = PLANETS[0];
  if (planet === undefined) {
    return [];
  }
  const tracks: string[] = [];
  for (let n = 1; n <= TRACKS_PER_PLANET; n += 1) {
    tracks.push(planetTrackId(planet, n));
  }
  return tracks;
}

/**
 * Prefer the clock-fleet (`car_2`…) once enough strips are installed.
 * Career still uses the hyphen roster; watch is the place to look at new art.
 */
export interface WatchSeatPin {
  readonly carId: string;
  readonly pilot: string;
}

/** Put the pinned car and pilot in seat 0 so watch can chase that pairing. */
export function applyWatchPin(
  field: readonly string[],
  pilots: readonly string[],
  pin: WatchSeatPin | undefined,
): { readonly field: readonly string[]; readonly pilots: readonly string[] } {
  if (pin === undefined || pin.carId.length === 0 || pin.pilot.length === 0) {
    return { field, pilots };
  }
  return {
    field: [pin.carId, ...field.filter(id => id !== pin.carId)],
    pilots: [pin.pilot, ...pilots.filter(name => name !== pin.pilot)],
  };
}

export function watchCarIds(carIds: readonly string[]): readonly string[] {
  const playable = carIds.filter(id => !isNogoLabCarId(id));
  const neu = playable.filter(isNewFleetCarId);
  return neu.length >= WATCH_RACER_COUNT ? neu : playable;
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

export function nextWatchTrack(
  currentId: string,
  step: number,
  pool: readonly string[] = watchPlanetTwoTracks(),
): string {
  const tracks = pool.length > 0 ? pool : watchPlanetTwoTracks();
  const index = tracks.indexOf(currentId);
  const from = index >= 0 ? index : 0;
  const next = (from + step + tracks.length * 8) % tracks.length;
  return tracks[next] ?? tracks[0] ?? currentId;
}
