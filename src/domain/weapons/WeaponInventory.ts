import type { CarPerkProfile } from '../vehicle/CarPerk.ts';
import type { VehicleStats } from '../vehicle/VehicleStats.ts';
import {
  LAP_ITEM_BONUS,
  MINE_START_COUNT,
  MISSILE_START_COUNT,
  OIL_START_COUNT,
} from './WeaponConstants.ts';

/**
 * What one car is carrying right now.
 *
 * A lap crossing adds `LAP_ITEM_BONUS` to missiles, oil, and mines. Starting
 * stock is still the authored start counts (Arsenal only doubles missiles).
 */
export interface WeaponInventory {
  readonly missiles: number;
  readonly oil: number;
  readonly mines: number;
}

function stockMultiplier(perk: CarPerkProfile | undefined): number {
  const raw = perk?.missileStockMultiplier;
  return Number.isFinite(raw) ? Math.max(1, raw as number) : 1;
}

/** Missiles a car may hold at most, given its authored capacity and perk. */
export function missileCapacity(stats: VehicleStats, perk: CarPerkProfile): number {
  const authored = Number.isFinite(stats.ammoCapacity) ? Math.max(0, stats.ammoCapacity) : 0;
  const boost = Number.isFinite(perk.reloadMultiplier) ? Math.max(1, perk.reloadMultiplier) : 1;
  // Arsenal raises the ceiling; the war tank then doubles whatever that is.
  return Math.round(authored * boost * stockMultiplier(perk));
}

/** Starting missiles for a perk: everyone gets 3, the war tank gets 6. */
export function missileStartCount(perk?: CarPerkProfile): number {
  return Math.round(MISSILE_START_COUNT * stockMultiplier(perk));
}

/** Fresh loadout on the grid: 3 missiles for everyone, oil and mines at their starts. */
export function createWeaponInventory(perk?: CarPerkProfile): WeaponInventory {
  return {
    missiles: missileStartCount(perk),
    oil: OIL_START_COUNT,
    mines: MINE_START_COUNT,
  };
}

/**
 * Finish-line bonus. Every item gets the same +10 — missiles, oil, mines.
 * Never reduces a stock. `stats` / `perk` stay on the signature so callers
 * that already pass them keep compiling.
 */
export function refillWeaponInventory(
  current: WeaponInventory,
  _stats?: VehicleStats,
  _perk?: CarPerkProfile,
): WeaponInventory {
  return {
    missiles: current.missiles + LAP_ITEM_BONUS,
    oil: current.oil + LAP_ITEM_BONUS,
    mines: current.mines + LAP_ITEM_BONUS,
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
