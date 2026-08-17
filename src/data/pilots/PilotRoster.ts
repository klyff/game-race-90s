/**
 * Championship pilot names. 20 regulars locked at career start for every
 * track, plus 5 jokers that take the front of the field on world 10.
 */

export const REGULAR_PILOTS = [
  'ALINE',
  'ENZO',
  'FLUFE',
  'DAVE',
  'RAZOR',
  'NIKKI',
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
  'ZARA',
  'VINCE',
  'RUBY',
  'HEX',
] as const;

/** Last-planet heavies: Russian mafia, Mad Irish, Negão Brasil, Don, alien. */
export const JOKER_PILOTS = ['VIKTOR', 'SEAMUS', 'NEGAO', 'LUCA', 'ZOR9'] as const;

/** @deprecated Use JOKER_PILOTS. Kept so older tests and saves still compile. */
export const MYSTERIOUS_PILOTS = JOKER_PILOTS;

export const RIVALS_PER_SAVE = 20;
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

/** Deterministic shuffle of the 20 regulars. Seed from the slot clock so a reload is stable. */
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
 * Worlds 1-9 keep the locked 20. World 10 drops the five lowest-scoring
 * regulars and puts the five jokers at the front of the field so they race.
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
  return [...JOKER_PILOTS, ...kept].slice(0, RIVALS_PER_SAVE);
}
