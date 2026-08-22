/**
 * Shop prices, unlock waves and NPC roster tiers. Pure: no storage, no Phaser.
 *
 * Starters are $50k. Later waves grow ~40% per world. Everything in this
 * catalog is buyable once planet 8 is unlocked. Sell price is 80% of list.
 * The garage carousel lists every car; unlock only gates the buy button.
 */

export const STARTER_PRICE = 50_000;
export const WORLD_ONE_EXTRA_PRICE = 70_000;
export const PRICE_GROWTH = 0.4;
export const SELL_FRACTION = 0.8;

export const STARTER_CAR_IDS = ['car-1', 'car_21'] as const;
export const WORLD_ONE_LOCKED_CAR_IDS = ['car-18', 'car-19'] as const;

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

/** Shop order: the six available cars (1, 18–21, Delorean). Parked `x_*` stay out. */
export const GARAGE_CATALOG: readonly CatalogEntry[] = [
  { carId: 'car-1', price: STARTER_PRICE, unlockPlanet: 1, tier: CAR_TIER.WEAK },
  { carId: 'car_21', price: STARTER_PRICE, unlockPlanet: 1, tier: CAR_TIER.WEAK },
  { carId: 'car-18', price: WORLD_ONE_EXTRA_PRICE, unlockPlanet: 1, tier: CAR_TIER.MEDIUM },
  { carId: 'car-19', price: WORLD_ONE_EXTRA_PRICE, unlockPlanet: 1, tier: CAR_TIER.MEDIUM },
  { carId: 'car-20', price: wavePrice(2), unlockPlanet: 2, tier: CAR_TIER.HEAVY },
  { carId: 'delorean', price: wavePrice(3), unlockPlanet: 3, tier: CAR_TIER.HEAVY },
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
  // World-1 extras (CAMO STAR / Cyber Pink) stay locked until the first podium.
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
 * Cars the garage carousel may show. Always the full catalog — locked cars
 * stay in the list so the player can see what the next worlds unlock.
 */
export function shopCarIds(
  _ownedCarIds: readonly string[] = [],
  _highestUnlockedPlanet = 1,
  _clearedTrackCount = 0,
): readonly string[] {
  return GARAGE_CATALOG.map(entry => entry.carId);
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
  if (entry === undefined) {
    return 'LOCKED';
  }
  if (entry.unlockPlanet > highestUnlockedPlanet) {
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

