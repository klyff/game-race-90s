import { IMPACT_DAMAGE_THRESHOLD } from '../../domain/vehicle/CarIntegrity.ts';

/**
 * How many metal scraps a hit throws, and which of the roster pieces fly.
 * The folder is `public/assets/debris/scrap-01.png` … `scrap-45.png`.
 * Count comes from the impact delta; which pieces are a seeded shuffle.
 */

export const SCRAP_ROSTER_SIZE = 45;

/** Phaser texture key for roster slot `index` (0-based). */
export function scrapTextureKey(index: number): string {
  return `debris-scrap-${String(index + 1).padStart(2, '0')}`;
}

/** Filename inside `public/assets/debris/` for roster slot `index` (0-based). */
export function scrapFileName(index: number): string {
  return `scrap-${String(index + 1).padStart(2, '0')}.png`;
}

/** Optional Boot load list: missing files fall back to geometric scraps. */
export const SCRAP_SPRITES = Array.from({ length: SCRAP_ROSTER_SIZE }, (_, index) => ({
  key: scrapTextureKey(index),
  file: scrapFileName(index),
}));

export const SCRAP_LIGHT_COUNT = 5;
export const SCRAP_MEDIUM_COUNT = 12;
export const SCRAP_HARD_COUNT = 15;

/** Closing speed that steps a hit from a light spray into a medium burst. */
export const SCRAP_MEDIUM_SPEED = 18;

/** Closing speed that steps a hit from medium into a hard burst. */
export const SCRAP_HARD_SPEED = 40;

/**
 * How many scraps this hit throws.
 *
 * Light / medium / hard come from the impact delta. A wreck empties the
 * roster. Scrapes below the damage threshold throw nothing.
 */
export function scrapCountForHit(impactSpeed: number, exploded: boolean): number {
  if (exploded) {
    return SCRAP_ROSTER_SIZE;
  }
  if (!Number.isFinite(impactSpeed) || impactSpeed <= IMPACT_DAMAGE_THRESHOLD) {
    return 0;
  }
  if (impactSpeed >= SCRAP_HARD_SPEED) {
    return SCRAP_HARD_COUNT;
  }
  if (impactSpeed >= SCRAP_MEDIUM_SPEED) {
    return SCRAP_MEDIUM_COUNT;
  }
  return SCRAP_LIGHT_COUNT;
}

/** Mix the impact delta into a shuffle seed so two hits rarely match. */
export function scrapRosterSeed(delta: number, burstId: number): number {
  if (!Number.isFinite(delta)) {
    return burstId >>> 0;
  }
  return (Math.abs(Math.floor(delta * 997)) ^ (burstId * 83492791)) >>> 0;
}

/**
 * Shuffle the roster and take `count` unique pieces. `seed` keeps a given
 * hit reproducible in tests; the race mixes impact speed with a burst id.
 */
export function scrapRosterPick(count: number, seed: number): readonly number[] {
  const take = Math.max(0, Math.min(SCRAP_ROSTER_SIZE, Math.floor(count)));
  if (take === 0) {
    return [];
  }
  const indices = Array.from({ length: SCRAP_ROSTER_SIZE }, (_, index) => index);
  let state = seed >>> 0;
  if (state === 0) {
    state = 1;
  }
  for (let i = indices.length - 1; i > 0; i -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    const swap = indices[i]!;
    indices[i] = indices[j]!;
    indices[j] = swap;
  }
  return indices.slice(0, take);
}
