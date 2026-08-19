/**
 * Pool sizes, crate smack, and gasoline blast falloff.
 * World 1 starts small; each later planet grows the pool and the spawn count.
 */

import { CAR_LENGTH_PER_COLLISION_RADIUS } from '../weapons/WeaponConstants.ts';

/** Wooden crate diameter as a fraction of car length. Smaller than a car, bigger than a mine. */
export const CRATE_SIZE_OF_CAR = 0.56;

/** Speed kept after hitting a crate (lose 30%). */
export const CRATE_SPEED_KEEP = 0.7;

/** Integrity lost on a crate hit. Not reduced by armor. */
export const CRATE_ENERGY_LOSS = 0.07;

/** How long wood chips stay on the asphalt, seconds. */
export const CRATE_WOOD_LIFE_SECONDS = 4;

export const CRATE_WOOD_CHIP_COUNT = 6;

/** Extra density on the authored pool and spawn caps. */
export const TRAP_COUNT_SCALE = 1.6;

/** World-1 crate candidate count, before `TRAP_COUNT_SCALE`. Each later world adds 2. */
export const CRATE_BASE_SLOTS = 10;

/** World-1 crate spawn cap, before scale. Each later world adds 1. */
export const CRATE_BASE_SPAWN = 4;

/** World-1 drum candidate count, before scale. Each later world adds 2. */
export const DRUM_BASE_SLOTS = 5;

function scaledCount(base: number): number {
  return Math.max(1, Math.round(base * TRAP_COUNT_SCALE));
}

/** Extra blast beyond the drum itself: two car lengths. */
export const DRUM_BLAST_CAR_LENGTHS = 2;

/** Distance band width as a fraction of blast radius. */
export const DRUM_BLAST_BAND = 0.1;

/** Integrity lost per band beyond the first. */
export const DRUM_BLAST_FALLOFF = 0.13;

export function crateSlotCount(worldIndex: number): number {
  return scaledCount(CRATE_BASE_SLOTS + Math.max(0, worldIndex - 1) * 2);
}

export function crateSpawnCount(worldIndex: number): number {
  const slots = crateSlotCount(worldIndex);
  return Math.min(slots, scaledCount(CRATE_BASE_SPAWN + Math.max(0, worldIndex - 1)));
}

export function drumSlotCount(worldIndex: number): number {
  return scaledCount(DRUM_BASE_SLOTS + Math.max(0, worldIndex - 1) * 2);
}

/** Half the unscaled pool, then +60% — world 1 is 3 of 8. */
export function drumSpawnCount(worldIndex: number): number {
  const unscaledSlots = DRUM_BASE_SLOTS + Math.max(0, worldIndex - 1) * 2;
  return scaledCount(Math.floor(unscaledSlots / 2));
}

export function carLengthFromRadius(collisionRadius: number): number {
  const radius = Number.isFinite(collisionRadius) && collisionRadius > 0 ? collisionRadius : 1.7;
  return CAR_LENGTH_PER_COLLISION_RADIUS * radius;
}

/** Circle: drum size plus two cars. */
export function drumBlastRadius(drumRadius: number, collisionRadius: number): number {
  const drum = Number.isFinite(drumRadius) && drumRadius > 0 ? drumRadius : 0.1;
  return drum + DRUM_BLAST_CAR_LENGTHS * carLengthFromRadius(collisionRadius);
}

/**
 * Splash fraction of energy, 0..1. Contact (the car that touched the drum)
 * is forced to 1.0 by the caller — this is distance-only.
 */
export function drumBlastDamage(distance: number, blastRadius: number): number {
  const reach = Number.isFinite(blastRadius) && blastRadius > 0 ? blastRadius : 0;
  if (reach <= 0) {
    return 0;
  }
  const away = Number.isFinite(distance) && distance > 0 ? distance : 0;
  if (away >= reach) {
    return 0;
  }
  const band = Math.floor(away / reach / DRUM_BLAST_BAND);
  return Math.max(0, 1 - band * DRUM_BLAST_FALLOFF);
}

export function crateHitSpeed(velocity: { readonly x: number; readonly y: number }): {
  readonly x: number;
  readonly y: number;
} {
  return { x: velocity.x * CRATE_SPEED_KEEP, y: velocity.y * CRATE_SPEED_KEEP };
}
