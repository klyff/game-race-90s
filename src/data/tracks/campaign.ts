/**
 * Campaign structure and unlock rules, kept pure so they can be unit-tested and
 * reused by both the select screens and the results routing.
 *
 * Owner rules (RNRR style):
 *  - A top-3 finish CLEARS a track and unlocks the next track in its planet.
 *  - Winning (1st) a planet's LAST track unlocks the next planet.
 *  - Planet 1, track 1 is always available.
 *
 * `clearedTrackIds` are tracks finished in the top 3; `wonTrackIds` are tracks
 * finished 1st (a strict subset). Both come from the persisted save.
 */

import {
  PLANETS,
  TRACKS_PER_PLANET,
  planetTrackId,
  planetTrackName,
  type PlanetDefinition,
} from './planets.ts';

/** One track slot in the campaign, with its display name and 1-based number. */
export interface CampaignTrack {
  readonly planet: PlanetDefinition;
  /** 1-based track number within the planet. */
  readonly n: number;
  readonly id: string;
  readonly name: string;
}

/** The three track slots of a planet, in order. */
export function planetTracks(planet: PlanetDefinition): readonly CampaignTrack[] {
  const tracks: CampaignTrack[] = [];
  for (let n = 1; n <= TRACKS_PER_PLANET; n += 1) {
    tracks.push({
      planet,
      n,
      id: planetTrackId(planet, n),
      name: planetTrackName(planet, n),
    });
  }
  return tracks;
}

/** Every track in the campaign, planet by planet, in play order. */
export function campaignTracks(): readonly CampaignTrack[] {
  return PLANETS.flatMap(planet => planetTracks(planet));
}

/** A planet opens once the PREVIOUS planet's last track has been won. */
export function isPlanetUnlocked(
  planet: PlanetDefinition,
  wonTrackIds: readonly string[],
  unlockAll = false,
): boolean {
  if (unlockAll) {
    return true;
  }
  if (planet.index <= 1) {
    return true;
  }
  const previous = PLANETS.find(candidate => candidate.index === planet.index - 1);
  if (previous === undefined) {
    return true;
  }
  const lastTrackId = planetTrackId(previous, TRACKS_PER_PLANET);
  return wonTrackIds.includes(lastTrackId);
}

/** A track opens if its planet is unlocked and the previous track was cleared (top-3). */
export function isTrackUnlocked(
  planet: PlanetDefinition,
  n: number,
  clearedTrackIds: readonly string[],
  wonTrackIds: readonly string[],
  unlockAll = false,
): boolean {
  if (unlockAll) {
    return true;
  }
  if (!isPlanetUnlocked(planet, wonTrackIds)) {
    return false;
  }
  if (n <= 1) {
    return true;
  }
  const previousTrackId = planetTrackId(planet, n - 1);
  return clearedTrackIds.includes(previousTrackId);
}

/**
 * The next track to race after finishing `trackId`, in campaign order, or `null`
 * when the campaign is complete. Advancing across a planet boundary only makes
 * sense once that boundary is unlocked, but the caller (the results screen) has
 * already established the finish that unlocks it, so this returns the raw next
 * slot and lets the select screen enforce locks.
 */
/** Planet index (1-based) and track number (1-based) for a campaign track id. */
export function campaignSlotForTrackId(
  trackId: string,
): { readonly planetIndex: number; readonly trackN: number } | null {
  for (const track of campaignTracks()) {
    if (track.id === trackId) {
      return { planetIndex: track.planet.index, trackN: track.n };
    }
  }
  return null;
}

export function nextCampaignTrack(trackId: string): CampaignTrack | null {
  const all = campaignTracks();
  const index = all.findIndex(track => track.id === trackId);
  if (index < 0 || index + 1 >= all.length) {
    return null;
  }
  return all[index + 1] ?? null;
}
