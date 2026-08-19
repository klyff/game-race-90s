/**
 * Session-only watch: jump straight into a ten-car AI race on a planet-II
 * circuit so the owner can sit and look at how the medium-tier drivers race.
 *
 * Launch with `?watch=1` (also `?watch=true`). Optional `?track=thunder-basin-2`.
 */

import { TRACKS } from '../../data/tracks/registry.ts';
import { campaignTrackFromSearch } from './CampaignSearch.ts';
import { watchPlanetTwoTracks } from '../../domain/race/WatchField.ts';

let sessionOn = false;

export function isWatchModeOn(): boolean {
  return sessionOn;
}

export function enableWatchMode(): void {
  sessionOn = true;
}

/** Test hook. */
export function resetWatchMode(): void {
  sessionOn = false;
}

export function watchModeFromSearch(search: string): boolean {
  const raw = typeof search === 'string' ? search : '';
  const query = raw.startsWith('?') ? raw.slice(1) : raw;
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(query);
  } catch {
    return false;
  }
  const value = params.get('watch');
  if (value === null) {
    return false;
  }
  const normalised = value.trim().toLowerCase();
  return normalised === '' || normalised === '1' || normalised === 'true' || normalised === 'all';
}

export function watchTrackFromSearch(search: string): string | undefined {
  const fromCampaign = campaignTrackFromSearch(search);
  if (fromCampaign !== undefined) {
    return fromCampaign;
  }
  const raw = typeof search === 'string' ? search : '';
  const query = raw.startsWith('?') ? raw.slice(1) : raw;
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(query);
  } catch {
    return undefined;
  }
  const track = params.get('track')?.trim();
  if (track === undefined || track.length === 0) {
    return undefined;
  }
  return TRACKS.some(entry => entry.id === track) || watchPlanetTwoTracks().includes(track)
    ? track
    : undefined;
}

export function enableWatchModeFromSearch(search: string): boolean {
  if (!watchModeFromSearch(search)) {
    return false;
  }
  enableWatchMode();
  return true;
}
