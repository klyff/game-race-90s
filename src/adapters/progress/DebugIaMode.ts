/**
 * Session-only debug IA: jump into a 14-NPC race with the new agent brains.
 *
 * Launch with `?debugia=1`. Optional `?track=thunder-basin-2`.
 */

import { TRACKS } from '../../data/tracks/registry.ts';

let sessionOn = false;
let sessionSeed = 1;

export function isDebugIaModeOn(): boolean {
  return sessionOn;
}

export function debugIaSeed(): number {
  return sessionSeed;
}

export function enableDebugIaMode(seed: number = Date.now()): void {
  sessionOn = true;
  sessionSeed = Number.isFinite(seed) && seed > 0 ? Math.floor(seed) : Date.now();
}

/** Test hook. */
export function resetDebugIaMode(): void {
  sessionOn = false;
  sessionSeed = 1;
}

function paramsFrom(search: string): URLSearchParams {
  const raw = typeof search === 'string' ? search : '';
  const query = raw.startsWith('?') ? raw.slice(1) : raw;
  try {
    return new URLSearchParams(query);
  } catch {
    return new URLSearchParams();
  }
}

export function debugIaModeFromSearch(search: string): boolean {
  const value = paramsFrom(search).get('debugia');
  if (value === null) {
    return false;
  }
  const normalised = value.trim().toLowerCase();
  return normalised === '' || normalised === '1' || normalised === 'true' || normalised === 'all';
}

export function debugIaTrackFromSearch(search: string): string | undefined {
  const track = paramsFrom(search).get('track')?.trim();
  if (track === undefined || track.length === 0) {
    return undefined;
  }
  return TRACKS.some(entry => entry.id === track) ? track : undefined;
}

export function debugIaSeedFromSearch(search: string): number | undefined {
  const raw = paramsFrom(search).get('seed')?.trim();
  if (raw === undefined || raw.length === 0) {
    return undefined;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

export function enableDebugIaModeFromSearch(search: string): boolean {
  if (!debugIaModeFromSearch(search)) {
    return false;
  }
  enableDebugIaMode(debugIaSeedFromSearch(search) ?? Date.now());
  return true;
}
