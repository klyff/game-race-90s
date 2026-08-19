/**
 * Session-only debug IA: jump into a 15-NPC race with the new agent brains.
 *
 * Launch with `?debugia=1`. Optional `?track=bogmire-deep-2` or `?world=3&pista=2`.
 * Optional `?mix=2:2:2` draws a skill-band grid (experts:mediums:bobos).
 * Optional `?npcs=15` overrides the NPC count (default 15).
 */

import { TRACKS } from '../../data/tracks/registry.ts';
import { DEBUG_IA_RACER_COUNT } from '../../domain/race/DebugIaField.ts';
import type { SkillMix } from '../../domain/race/DebugIaField.ts';
import { campaignTrackFromSearch } from './CampaignSearch.ts';

let sessionOn = false;
let sessionSeed = 1;
let sessionMix: SkillMix | undefined;
let sessionNpcCount = DEBUG_IA_RACER_COUNT;

export function isDebugIaModeOn(): boolean {
  return sessionOn;
}

export function debugIaSeed(): number {
  return sessionSeed;
}

export function debugIaNpcCount(): number {
  return sessionNpcCount;
}

export function enableDebugIaMode(
  seed: number = Date.now(),
  mix?: SkillMix,
  npcCount: number = DEBUG_IA_RACER_COUNT,
): void {
  sessionOn = true;
  sessionSeed = Number.isFinite(seed) && seed > 0 ? Math.floor(seed) : Date.now();
  sessionMix = mix;
  sessionNpcCount = Number.isFinite(npcCount) && npcCount > 0 ? Math.floor(npcCount) : DEBUG_IA_RACER_COUNT;
}

export function debugIaMix(): SkillMix | undefined {
  return sessionMix;
}

/** Test hook. */
export function resetDebugIaMode(): void {
  sessionOn = false;
  sessionSeed = 1;
  sessionMix = undefined;
  sessionNpcCount = DEBUG_IA_RACER_COUNT;
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
  const fromCampaign = campaignTrackFromSearch(search);
  if (fromCampaign !== undefined) {
    return fromCampaign;
  }
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

export function debugIaNpcCountFromSearch(search: string): number | undefined {
  const raw = paramsFrom(search).get('npcs') ?? paramsFrom(search).get('npc');
  if (raw === null) {
    return undefined;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

export function debugIaMixFromSearch(search: string): SkillMix | undefined {
  const raw = paramsFrom(search).get('mix')?.trim();
  if (raw === undefined || raw.length === 0) {
    return undefined;
  }
  const parts = raw.split(/[,:]/).map(part => Number(part));
  if (parts.length !== 3 || parts.some(value => !Number.isFinite(value) || value < 0)) {
    return undefined;
  }
  const mix = {
    experts: Math.floor(parts[0] ?? 0),
    mediums: Math.floor(parts[1] ?? 0),
    bobos: Math.floor(parts[2] ?? 0),
  };
  if (mix.experts + mix.mediums + mix.bobos < 1) {
    return undefined;
  }
  return mix;
}

export function enableDebugIaModeFromSearch(search: string): boolean {
  if (!debugIaModeFromSearch(search)) {
    return false;
  }
  enableDebugIaMode(
    debugIaSeedFromSearch(search) ?? Date.now(),
    debugIaMixFromSearch(search),
    debugIaNpcCountFromSearch(search) ?? DEBUG_IA_RACER_COUNT,
  );
  return true;
}
