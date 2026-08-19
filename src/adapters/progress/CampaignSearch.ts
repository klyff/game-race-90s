/**
 * URL helpers for jumping into a campaign track without typing the slug.
 *
 * `?world=3&pista=2` → Bogmire Deep II (`bogmire-deep-2`).
 * Aliases: planet/mundo, circuit/tracknum/pista.
 */

import { TRACKS } from '../../data/tracks/registry.ts';
import { campaignTrackId } from '../../data/tracks/campaign.ts';

function paramsFrom(search: string): URLSearchParams {
  const raw = typeof search === 'string' ? search : '';
  const query = raw.startsWith('?') ? raw.slice(1) : raw;
  try {
    return new URLSearchParams(query);
  } catch {
    return new URLSearchParams();
  }
}

function readPositiveInt(raw: string | null): number | undefined {
  if (raw === null) {
    return undefined;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return undefined;
  }
  return Math.floor(parsed);
}

export function campaignTrackFromSearch(search: string): string | undefined {
  const params = paramsFrom(search);
  const world =
    readPositiveInt(params.get('world')) ??
    readPositiveInt(params.get('planet')) ??
    readPositiveInt(params.get('mundo'));
  const circuit =
    readPositiveInt(params.get('pista')) ??
    readPositiveInt(params.get('circuit')) ??
    readPositiveInt(params.get('tracknum'));
  if (world === undefined || circuit === undefined) {
    return undefined;
  }
  const trackId = campaignTrackId(world, circuit);
  if (trackId === undefined) {
    return undefined;
  }
  return TRACKS.some(entry => entry.id === trackId) ? trackId : undefined;
}
