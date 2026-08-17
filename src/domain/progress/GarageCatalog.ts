/**
 * Shop prices, unlock waves and NPC roster tiers. Pure: no storage, no Phaser.
 *
 * Starters are $50k. Later waves grow ~40% per world. Everything is buyable
 * once planet 8 is unlocked. Sell price is 80% of list.
 */

export const STARTER_PRICE = 50_000;
export const WORLD_ONE_EXTRA_PRICE = 70_000;
export const PRICE_GROWTH = 0.4;
export const SELL_FRACTION = 0.8;

export const STARTER_CAR_IDS = ['car-1', 'car-2'] as const;
export const WORLD_ONE_LOCKED_CAR_IDS = ['car-3', 'car-16'] as const;

/** First podium is spent unlocking the two world-1 extras, not a later wave. */
const CLEARS_FOR_WORLD_ONE_EXTRAS = 1;

export const CAR_TIER = {
  WEAK: 'weak',
  MEDIUM: 'medium',
  HEAVY: 'heavy',
} as const;
export type CarTier = (typeof CAR_TIER)[keyof typeof CAR_TIER];

export interface CatalogEntry {
  readonly carId: string;
  readonly price: number;
  readonly unlockPlanet: number;
  readonly tier: CarTier;
}

function roundPrice(value: number): number {
  return Math.max(0, Math.round(value / 1000) * 1000);
}

function wavePrice(unlockPlanet: number): number {
  if (unlockPlanet <= 1) {
    return WORLD_ONE_EXTRA_PRICE;
  }
  return roundPrice(WORLD_ONE_EXTRA_PRICE * (1 + PRICE_GROWTH) ** (unlockPlanet - 1));
}

/** Shop order: starters, world-1 extras, then one wave per later planet. */
export const GARAGE_CATALOG: readonly CatalogEntry[] = [
  { carId: 'car-1', price: STARTER_PRICE, unlockPlanet: 1, tier: CAR_TIER.WEAK },
  { carId: 'car-2', price: STARTER_PRICE, unlockPlanet: 1, tier: CAR_TIER.WEAK },
  { carId: 'car-3', price: WORLD_ONE_EXTRA_PRICE, unlockPlanet: 1, tier: CAR_TIER.WEAK },
  { carId: 'car-16', price: WORLD_ONE_EXTRA_PRICE, unlockPlanet: 1, tier: CAR_TIER.WEAK },
  { carId: 'car-5', price: wavePrice(2), unlockPlanet: 2, tier: CAR_TIER.WEAK },
  { carId: 'car-13', price: wavePrice(2), unlockPlanet: 2, tier: CAR_TIER.WEAK },
  { carId: 'car-19', price: wavePrice(2), unlockPlanet: 2, tier: CAR_TIER.WEAK },
  { carId: 'car-4', price: wavePrice(3), unlockPlanet: 3, tier: CAR_TIER.MEDIUM },
  { carId: 'car-17', price: wavePrice(3), unlockPlanet: 3, tier: CAR_TIER.MEDIUM },
  { carId: 'car-8-strong', price: wavePrice(3), unlockPlanet: 3, tier: CAR_TIER.MEDIUM },
  { carId: 'car-12-strong', price: wavePrice(4), unlockPlanet: 4, tier: CAR_TIER.MEDIUM },
  { carId: 'car-11', price: wavePrice(4), unlockPlanet: 4, tier: CAR_TIER.MEDIUM },
  { carId: 'car-15', price: wavePrice(4), unlockPlanet: 4, tier: CAR_TIER.MEDIUM },
  { carId: 'car-18', price: wavePrice(5), unlockPlanet: 5, tier: CAR_TIER.HEAVY },
  { carId: 'car-10', price: wavePrice(5), unlockPlanet: 5, tier: CAR_TIER.HEAVY },
  { carId: 'car-14', price: wavePrice(6), unlockPlanet: 6, tier: CAR_TIER.HEAVY },
  { carId: 'car-6-tank', price: wavePrice(6), unlockPlanet: 6, tier: CAR_TIER.HEAVY },
  { carId: 'delorean', price: wavePrice(7), unlockPlanet: 7, tier: CAR_TIER.HEAVY },
  { carId: 'car-9-turbo', price: wavePrice(7), unlockPlanet: 7, tier: CAR_TIER.HEAVY },
  { carId: 'car-7-turbo', price: wavePrice(8), unlockPlanet: 8, tier: CAR_TIER.HEAVY },
  { carId: 'car-20', price: wavePrice(8), unlockPlanet: 8, tier: CAR_TIER.HEAVY },
];

export function catalogEntry(carId: string): CatalogEntry | undefined {
  return GARAGE_CATALOG.find(entry => entry.carId === carId);
}

export function listPrice(carId: string): number {
  return catalogEntry(carId)?.price ?? 0;
}

export function sellPrice(carId: string): number {
  return Math.round(listPrice(carId) * SELL_FRACTION);
}

export function isStarterCar(carId: string): boolean {
  return (STARTER_CAR_IDS as readonly string[]).includes(carId);
}

/**
 * A shop car is unlocked when its wave's planet is open, or after enough
 * podium clears. The first clear opens the two world-1 extras; each clear
 * after that unlocks one later catalog car ahead of its planet wave.
 */
export function isCarUnlocked(
  carId: string,
  highestUnlockedPlanet: number,
  clearedTrackCount: number,
): boolean {
  const entry = catalogEntry(carId);
  if (entry === undefined) {
    return false;
  }
  if (isStarterCar(carId)) {
    return true;
  }
  // Swamp Rat / Dirt Devil stay locked until the first world-1 podium.
  if ((WORLD_ONE_LOCKED_CAR_IDS as readonly string[]).includes(carId)) {
    return clearedTrackCount >= 1 || highestUnlockedPlanet > 1;
  }
  if (entry.unlockPlanet <= highestUnlockedPlanet) {
    return true;
  }
  const extras = GARAGE_CATALOG.filter(
    item => !isStarterCar(item.carId) && !(WORLD_ONE_LOCKED_CAR_IDS as readonly string[]).includes(item.carId),
  );
  const index = extras.findIndex(item => item.carId === carId);
  if (index < 0) {
    return false;
  }
  return index < clearedTrackCount - CLEARS_FOR_WORLD_ONE_EXTRAS;
}

/**
 * Cars the garage carousel may show. An empty garage is starters only —
 * locked teasers would tell a new player to finish a race they cannot start.
 */
export function shopCarIds(
  ownedCarIds: readonly string[],
  highestUnlockedPlanet: number,
  clearedTrackCount: number,
): readonly string[] {
  if (ownedCarIds.length === 0) {
    return [...STARTER_CAR_IDS];
  }
  return GARAGE_CATALOG.filter(entry => {
    const id = entry.carId;
    return (
      ownedCarIds.includes(id) ||
      isCarUnlocked(id, highestUnlockedPlanet, clearedTrackCount) ||
      isStarterCar(id) ||
      (WORLD_ONE_LOCKED_CAR_IDS as readonly string[]).includes(id)
    );
  }).map(entry => entry.carId);
}

/** Why a shop car is still locked, or null when it can be bought. */
export function carUnlockHint(
  carId: string,
  highestUnlockedPlanet: number,
  clearedTrackCount: number,
): string | null {
  if (isCarUnlocked(carId, highestUnlockedPlanet, clearedTrackCount)) {
    return null;
  }
  if ((WORLD_ONE_LOCKED_CAR_IDS as readonly string[]).includes(carId)) {
    return 'FINISH TOP 3 TO UNLOCK';
  }
  const entry = catalogEntry(carId);
  if (entry !== undefined && entry.unlockPlanet > highestUnlockedPlanet) {
    return `UNLOCKS IN WORLD ${entry.unlockPlanet}`;
  }
  return 'WIN MORE RACES TO UNLOCK';
}

/** Cars NPCs may drive on this planet. */
export function npcRosterForPlanet(planetIndex: number): readonly string[] {
  const planet = Number.isFinite(planetIndex) ? Math.max(1, Math.floor(planetIndex)) : 1;
  return GARAGE_CATALOG.filter(entry => {
    if (planet <= 2) {
      return isStarterCar(entry.carId) || (WORLD_ONE_LOCKED_CAR_IDS as readonly string[]).includes(entry.carId);
    }
    if (planet <= 4) {
      return entry.tier === CAR_TIER.WEAK || entry.tier === CAR_TIER.MEDIUM;
    }
    if (planet <= 6) {
      return entry.unlockPlanet <= planet;
    }
    return true;
  }).map(entry => entry.carId);
}

