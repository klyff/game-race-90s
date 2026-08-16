import type { CarPerkProfile } from '../vehicle/CarPerk.ts';
import type { VehicleStats } from '../vehicle/VehicleStats.ts';
import {
  MINE_START_COUNT,
  MISSILE_START_COUNT,
  OIL_START_COUNT,
} from './WeaponConstants.ts';

/**
 * What one car is carrying right now.
 *
 * Missiles refill to `ammoCapacity` (Arsenal raises that ceiling via
 * `reloadMultiplier`). Oil and mines refill to their start counts.
 */
export interface WeaponInventory {
  readonly missiles: number;
  readonly oil: number;
  readonly mines: number;
}

/** Missiles a car may hold at most, given its authored capacity and perk. */
export function missileCapacity(stats: VehicleStats, perk: CarPerkProfile): number {
  const authored = Number.isFinite(stats.ammoCapacity) ? Math.max(0, stats.ammoCapacity) : 0;
  const boost = Number.isFinite(perk.reloadMultiplier) ? Math.max(1, perk.reloadMultiplier) : 1;
  // Arsenal raises the ceiling; every other perk leaves the authored capacity alone
  // (reloadMultiplier defaults to 1 on the neutral profile).
  return Math.round(authored * boost);
}

/** Fresh loadout on the grid: 3 missiles for everyone, oil and mines at their starts. */
export function createWeaponInventory(): WeaponInventory {
  return {
    missiles: MISSILE_START_COUNT,
    oil: OIL_START_COUNT,
    mines: MINE_START_COUNT,
  };
}

/**
 * Finish-line refill. Missiles go up to the car's (possibly Arsenal-boosted)
 * capacity; oil and mines return to their start counts. Never reduces a stock
 * that is already somehow above the ceiling.
 */
export function refillWeaponInventory(
  current: WeaponInventory,
  stats: VehicleStats,
  perk: CarPerkProfile,
): WeaponInventory {
  return {
    missiles: Math.max(current.missiles, missileCapacity(stats, perk)),
    oil: Math.max(current.oil, OIL_START_COUNT),
    mines: Math.max(current.mines, MINE_START_COUNT),
  };
}

export function consumeMissile(current: WeaponInventory): WeaponInventory | null {
  if (current.missiles <= 0) {
    return null;
  }
  return { ...current, missiles: current.missiles - 1 };
}

export function consumeOil(current: WeaponInventory): WeaponInventory | null {
  if (current.oil <= 0) {
    return null;
  }
  return { ...current, oil: current.oil - 1 };
}

export function consumeMine(current: WeaponInventory): WeaponInventory | null {
  if (current.mines <= 0) {
    return null;
  }
  return { ...current, mines: current.mines - 1 };
}

/**
 * NPC fire cooldown, seconds. Arsenal's reloadMultiplier shortens it so the
 * perk is a felt rate boost rather than a silent flag (the reminder the old
 * inert test was pinning until T-046).
 */
export function npcWeaponCooldownSeconds(baseSeconds: number, perk: CarPerkProfile): number {
  const boost = Number.isFinite(perk.reloadMultiplier) ? Math.max(1, perk.reloadMultiplier) : 1;
  return baseSeconds / boost;
}
