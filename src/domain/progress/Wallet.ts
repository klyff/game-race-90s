/**
 * Player purse and race prize table. Pure: no storage, no Phaser.
 *
 * Owner rules:
 *  - Podium (top 3) pays. 1st is the purse; 2nd is 50% of 1st; 3rd is 50% of 2nd.
 *  - The 1st-place purse grows with every planet and every track inside a planet.
 *  - A weapon the player lands on someone else pays a small bounty.
 */

/** Cash a brand-new slot starts with. Must buy a $50k starter. */
export const STARTING_CASH = 70_000;

/** 1st-place purse on planet 1, track 1. Owner example: $100,000. */
export const BASE_FIRST_PRIZE = 100_000;

/** Each later planet adds this fraction of the base (planet 2 = +50%, planet 3 = +100%). */
export const PLANET_PRIZE_GROWTH = 0.5;

/** Each later track on the same planet adds this fraction of the planet purse. */
export const TRACK_PRIZE_GROWTH = 0.25;

/** 2nd place is half of 1st; 3rd is half of 2nd. */
export const PODIUM_HALVING = 0.5;

/** Bounty when the player's missile hits a rival, on planet 1. */
export const MISSILE_HIT_BOUNTY = 10_000;

/** Bounty when the player's oil slick hits a rival, on planet 1. */
export const OIL_HIT_BOUNTY = 4_000;

/** Bounty when the player's mine hits a rival, on planet 1. */
export const MINE_HIT_BOUNTY = 8_000;

/** Hit bounties grow this much per planet after the first. */
export const HIT_BOUNTY_PLANET_GROWTH = 0.25;

export interface PrizeTable {
  readonly first: number;
  readonly second: number;
  readonly third: number;
}

export interface WeaponHits {
  readonly missiles: number;
  readonly oil: number;
  readonly mines: number;
}

export const EMPTY_WEAPON_HITS: WeaponHits = { missiles: 0, oil: 0, mines: 0 };

function safeIndex(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value < 1) {
    return fallback;
  }
  return Math.floor(value);
}

function roundPurse(value: number): number {
  return Math.max(0, Math.round(value));
}

/**
 * 1st-place purse for a campaign slot. Planet 1 track 1 is `BASE_FIRST_PRIZE`;
 * later planets and later tracks on the same planet raise it.
 */
export function firstPlacePrize(planetIndex: number, trackN: number): number {
  const planet = safeIndex(planetIndex, 1);
  const track = safeIndex(trackN, 1);
  const planetScale = 1 + (planet - 1) * PLANET_PRIZE_GROWTH;
  const trackScale = 1 + (track - 1) * TRACK_PRIZE_GROWTH;
  return roundPurse(BASE_FIRST_PRIZE * planetScale * trackScale);
}

/** 1st / 2nd / 3rd purses. Positions off the podium pay 0. */
export function prizeTable(planetIndex: number, trackN: number): PrizeTable {
  const first = firstPlacePrize(planetIndex, trackN);
  const second = roundPurse(first * PODIUM_HALVING);
  const third = roundPurse(second * PODIUM_HALVING);
  return { first, second, third };
}

/** What the player is paid for finishing in `position` (1-based). Off the podium: 0. */
export function podiumPrize(position: number, planetIndex: number, trackN: number): number {
  const table = prizeTable(planetIndex, trackN);
  if (position === 1) {
    return table.first;
  }
  if (position === 2) {
    return table.second;
  }
  if (position === 3) {
    return table.third;
  }
  return 0;
}

function hitScale(planetIndex: number): number {
  const planet = safeIndex(planetIndex, 1);
  return 1 + (planet - 1) * HIT_BOUNTY_PLANET_GROWTH;
}

export function missileHitBounty(planetIndex: number): number {
  return roundPurse(MISSILE_HIT_BOUNTY * hitScale(planetIndex));
}

export function oilHitBounty(planetIndex: number): number {
  return roundPurse(OIL_HIT_BOUNTY * hitScale(planetIndex));
}

export function mineHitBounty(planetIndex: number): number {
  return roundPurse(MINE_HIT_BOUNTY * hitScale(planetIndex));
}

/** Cash earned this race from the player's weapon hits. */
export function weaponHitEarnings(hits: WeaponHits, planetIndex: number): number {
  const missiles = Number.isFinite(hits.missiles) ? Math.max(0, hits.missiles) : 0;
  const oil = Number.isFinite(hits.oil) ? Math.max(0, hits.oil) : 0;
  const mines = Number.isFinite(hits.mines) ? Math.max(0, hits.mines) : 0;
  return (
    missiles * missileHitBounty(planetIndex) +
    oil * oilHitBounty(planetIndex) +
    mines * mineHitBounty(planetIndex)
  );
}

/** Arcade cash: `$100,000`. */
export function formatCash(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return `$${safe.toLocaleString('en-US')}`;
}
