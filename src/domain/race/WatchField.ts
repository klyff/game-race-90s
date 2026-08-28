/**
 * Watch-mode grid: ten championship faces on the HUD (the selectable
 * regulars, plus last-world jokers from planet 10), leftover cars parked
 * as the reserve pack.
 *
 * Planet-II tracks alternate the two packs so the leftover cars still race
 * on the next circuit instead of sitting unused.
 */

import { isSpinnerCarId } from '../../data/cars/CarManifest.ts';
import { isNpcAllowedCarId } from '../../data/cars/FleetStatus.ts';
import { JOKER_PILOTS, REGULAR_PILOTS } from '../../data/pilots/PilotRoster.ts';
import type { DriverProfile } from '../ai/DriverProfile.ts';
import { PLANETS, TRACKS_PER_PLANET, planetTrackId } from '../../data/tracks/planets.ts';

export const WATCH_RACER_COUNT = 10;
/** Splash `P`: 15 AI cars, same grid size as debug-IA. */
export const WATCH_ATTRACT_RACER_COUNT = 15;

export function driverSkill(profile: DriverProfile): number {
  return profile.vehiclePhysics + profile.localSteering + profile.opponentPrediction;
}

/**
 * HUD / grid names. Worlds 1–9: first ten selectable regulars (KLYFF first).
 * World 10: the five jokers, then regulars, so the last-planet cast actually races.
 */
export function watchPilots(planetIndex: number = 1): readonly string[] {
  const late = Number.isFinite(planetIndex) && planetIndex >= 10;
  const pool = late ? [...JOKER_PILOTS, ...REGULAR_PILOTS] : [...REGULAR_PILOTS];
  return pool.slice(0, WATCH_RACER_COUNT);
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
 * Watch grid is spinner-only (32 CCW). Repeat the live models when fewer
 * than ten strips exist — never fall back to obsolete matrix ids.
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

function repeatToCount(ids: readonly string[], count: number): readonly string[] {
  if (ids.length === 0 || count <= 0) {
    return [];
  }
  if (ids.length >= count) {
    return ids.slice(0, count);
  }
  const filled: string[] = [];
  for (let index = 0; index < count; index += 1) {
    filled.push(ids[index % ids.length] ?? ids[0]!);
  }
  return filled;
}

export function watchCarIds(carIds: readonly string[]): readonly string[] {
  const spinner = carIds.filter(id => isSpinnerCarId(id) && isNpcAllowedCarId(id));
  if (spinner.length >= WATCH_RACER_COUNT) {
    return spinner;
  }
  return repeatToCount(spinner, WATCH_RACER_COUNT);
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
