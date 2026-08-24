/**
 * Shop prices, unlock waves and NPC roster tiers. Pure: no storage, no Phaser.
 *
 * Live catalog is spinner-only (32 CCW). Starter is $50k. Sell price is 80%
 * of list. The garage carousel lists every catalog car; unlock only gates buy.
 */

import { isSpinnerCarId } from '../../data/cars/CarManifest.ts';
import { isOutOfServiceCarId, isRetiredCarId, isUnavailableCarId } from '../../data/cars/FleetStatus.ts';

export const STARTER_PRICE = 50_000;
export const SELL_FRACTION = 0.8;

export const STARTER_CAR_IDS = ['2-sportivo-blue-combat'] as const;

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

/** Shop order. Matrix / Delorean are obsolete and not listed. */
export const GARAGE_CATALOG: readonly CatalogEntry[] = [
  { carId: '2-sportivo-blue-combat', price: STARTER_PRICE, unlockPlanet: 1, tier: CAR_TIER.MEDIUM },
  { carId: '3-red-oh-red', price: 62_000, unlockPlanet: 1, tier: CAR_TIER.MEDIUM },
  { carId: '1-muscle-car-gray-number9', price: 98_000, unlockPlanet: 2, tier: CAR_TIER.HEAVY },
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
 * podium clears to pull the next catalog car ahead of its planet wave.
 */
export function isCarUnlocked(
  carId: string,
  highestUnlockedPlanet: number,
  clearedTrackCount: number,
): boolean {
  if (isOutOfServiceCarId(carId)) {
    return false;
  }
  const entry = catalogEntry(carId);
  if (entry === undefined) {
    return false;
  }
  if (isStarterCar(carId)) {
    return true;
  }
  if (entry.unlockPlanet <= highestUnlockedPlanet) {
    return true;
  }
  const extras = GARAGE_CATALOG.filter(
    item =>
      !isStarterCar(item.carId) &&
      !isOutOfServiceCarId(item.carId) &&
      item.unlockPlanet > highestUnlockedPlanet,
  );
  const index = extras.findIndex(item => item.carId === carId);
  if (index < 0) {
    return false;
  }
  return index < clearedTrackCount;
}

/**
 * Cars the garage carousel may show. Always the full live catalog — locked
 * cars stay in the list so the player can see what the next worlds unlock.
 */
export function shopCarIds(
  _ownedCarIds: readonly string[] = [],
  _highestUnlockedPlanet = 1,
  _clearedTrackCount = 0,
): readonly string[] {
  return GARAGE_CATALOG.filter(entry => !isRetiredCarId(entry.carId)).map(entry => entry.carId);
}

/** Why a shop car is still locked, or null when it can be bought. */
export function carUnlockHint(
  carId: string,
  highestUnlockedPlanet: number,
  clearedTrackCount: number,
): string | null {
  if (isRetiredCarId(carId)) {
    return 'RETIRED';
  }
  if (isUnavailableCarId(carId)) {
    return 'UNAVAILABLE';
  }
  if (isCarUnlocked(carId, highestUnlockedPlanet, clearedTrackCount)) {
    return null;
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

/** Cars NPCs may drive on this planet. Spinner-only. */
export function npcRosterForPlanet(planetIndex: number): readonly string[] {
  const planet = Number.isFinite(planetIndex) ? Math.max(1, Math.floor(planetIndex)) : 1;
  return GARAGE_CATALOG.filter(entry => {
    if (!isSpinnerCarId(entry.carId) || isOutOfServiceCarId(entry.carId)) {
      return false;
    }
    return entry.unlockPlanet <= planet;
  }).map(entry => entry.carId);
}
