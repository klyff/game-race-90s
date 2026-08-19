import type { PickedRaceTrap, TrackTrapCatalog, TrapSlot } from './TrapCatalog.ts';
import { TRAP_KIND } from './TrapCatalog.ts';
import { crateSpawnCount, drumSpawnCount, TRAP_COUNT_SCALE } from './TrapRules.ts';

function hash32(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Same planet + same track always yields the same trap layout. */
export function trapSeed(planetSeed: number, trackId: string): number {
  const base = Number.isFinite(planetSeed) ? planetSeed >>> 0 : 1;
  return (base ^ hash32(trackId)) >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const next = items.slice();
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const a = next[i]!;
    next[i] = next[j]!;
    next[j] = a;
  }
  return next;
}

function crateStackHeight(random: () => number): number {
  const roll = random();
  if (roll < 0.08 * TRAP_COUNT_SCALE) {
    return 3;
  }
  if (roll < 0.22 * TRAP_COUNT_SCALE) {
    return 2;
  }
  return 1;
}

function take(
  slots: readonly TrapSlot[],
  count: number,
  kind: PickedRaceTrap['kind'],
  random: () => number,
): PickedRaceTrap[] {
  const picked = shuffle(slots, random).slice(0, Math.max(0, count));
  return picked.map(slot => ({
    kind,
    distance: slot.distance,
    lateral: slot.lateral,
    // Drums do not stack — a triple is a tower once the barrel grew.
    stackHeight: kind === TRAP_KIND.GASOLINE ? 1 : crateStackHeight(random),
  }));
}

/**
 * Subset of the catalog that actually appears this race.
 * World 1: up to 6 crates and 3 drums. Later worlds grow; drums stay half the unscaled pool, then +60%.
 */
export function pickRaceTraps(
  catalog: TrackTrapCatalog,
  worldIndex: number,
  seed: number,
): readonly PickedRaceTrap[] {
  const world = Number.isFinite(worldIndex) && worldIndex >= 1 ? Math.floor(worldIndex) : 1;
  const random = mulberry32(Number.isFinite(seed) ? seed : 1);
  const drums = take(catalog.drums, drumSpawnCount(world), TRAP_KIND.GASOLINE, random);
  const crates = take(catalog.crates, crateSpawnCount(world), TRAP_KIND.CRATE, random);
  return [...drums, ...crates];
}
