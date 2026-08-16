/**
 * Championship pilot names. 25 regulars + 5 mysterious reserved for world 10.
 * A save draws 9 regulars once and keeps them until the last planet.
 */

export const REGULAR_PILOTS = [
  'RAZOR',
  'NIKKI',
  'VEX',
  'DIEGO',
  'LUNA',
  'BLAZE',
  'KIRA',
  'SNAKE',
  'RIO',
  'JETT',
  'NOVA',
  'CRUZ',
  'ASH',
  'REMY',
  'ZARA',
  'VINCE',
  'PIXIE',
  'GAGE',
  'STORM',
  'LEX',
  'DAX',
  'RUBY',
  'COLE',
  'FAYE',
  'HEX',
] as const;

export const MYSTERIOUS_PILOTS = ['WRAITH', 'SPECTER', 'NYX', 'OMEN', 'PHANTOM'] as const;

export const RIVALS_PER_SAVE = 9;
export const MYSTERIOUS_SWAP_COUNT = 5;
export const CHAMPIONSHIP_SIZE = 10;

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic draw of 9 regulars. Seed from the slot clock so a reload is stable. */
export function drawRivalNames(seed: number): string[] {
  const rng = mulberry32(Number.isFinite(seed) ? seed : 1);
  const pool = [...REGULAR_PILOTS];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const a = pool[i];
    const b = pool[j];
    if (a === undefined || b === undefined) {
      continue;
    }
    pool[i] = b;
    pool[j] = a;
  }
  return pool.slice(0, RIVALS_PER_SAVE);
}

/**
 * World 10: the five lowest-scoring rivals are replaced by the mysterious five.
 * `scores` is aligned with `rivals`. Ties keep roster order (stable).
 */
export function rivalsForPlanet(
  rivals: readonly string[],
  scores: readonly number[],
  planetIndex: number,
): string[] {
  if (planetIndex < 10) {
    return [...rivals];
  }
  const ranked = rivals.map((name, index) => ({
    name,
    score: scores[index] ?? 0,
    index,
  }));
  ranked.sort((a, b) => a.score - b.score || a.index - b.index);
  const drop = new Set(ranked.slice(0, MYSTERIOUS_SWAP_COUNT).map(entry => entry.name));
  const kept = rivals.filter(name => !drop.has(name));
  return [...kept, ...MYSTERIOUS_PILOTS].slice(0, RIVALS_PER_SAVE);
}
