import { describe, expect, it } from 'vitest';
import {
  GARAGE_CATALOG,
  carUnlockHint,
  isCarUnlocked,
  isStarterCar,
  listPrice,
  npcRosterForPlanet,
  sellPrice,
  shopCarIds,
  STARTER_PRICE,
  WORLD_ONE_EXTRA_PRICE,
} from '../../src/domain/progress/GarageCatalog.ts';

describe('GarageCatalog', () => {
  it('prices starters at $50k and world-1 extras at $70k', () => {
    expect(listPrice('car-1')).toBe(STARTER_PRICE);
    expect(listPrice('car-2')).toBe(STARTER_PRICE);
    expect(listPrice('car-3')).toBe(WORLD_ONE_EXTRA_PRICE);
    expect(listPrice('car-16')).toBe(WORLD_ONE_EXTRA_PRICE);
  });

  it('sells at 80% of list', () => {
    expect(sellPrice('car-1')).toBe(40_000);
  });

  it('never treats the tank as a starter', () => {
    expect(isStarterCar('car-6-tank')).toBe(false);
    expect(isCarUnlocked('car-6-tank', 1, 0)).toBe(false);
  });

  it('unlocks world-1 extras after the first podium clear', () => {
    expect(isCarUnlocked('car-3', 1, 0)).toBe(false);
    expect(isCarUnlocked('car-3', 1, 1)).toBe(true);
    expect(carUnlockHint('car-16', 1, 0)).toBe('FINISH TOP 3 TO UNLOCK');
    expect(carUnlockHint('car-16', 1, 1)).toBeNull();
    expect(carUnlockHint('car-6-tank', 1, 0)).toBe('UNLOCKS IN WORLD 6');
    expect(carUnlockHint('car-1', 1, 0)).toBeNull();
    expect(carUnlockHint('car_21', 1, 0)).toBe('LOCKED');
  });

  it('does not spend the first podium on a later-world car', () => {
    expect(isCarUnlocked('car-5', 1, 1)).toBe(false);
    expect(isCarUnlocked('car-5', 1, 2)).toBe(true);
  });

  it('lists every catalog car even when the garage is empty', () => {
    expect(shopCarIds([], 1, 0)).toEqual(GARAGE_CATALOG.map(entry => entry.carId));
    expect(shopCarIds(['car-1'], 1, 0)).toContain('car-6-tank');
    expect(isCarUnlocked('car-3', 1, 0)).toBe(false);
    expect(isCarUnlocked('car-1', 1, 0)).toBe(true);
  });

  it('unlocks every catalog car once planet 8 is open', () => {
    for (const entry of GARAGE_CATALOG) {
      expect(isCarUnlocked(entry.carId, 8, 0)).toBe(true);
    }
  });

  it('grows later-world prices by about 40%', () => {
    expect(listPrice('car-13')).toBeGreaterThan(WORLD_ONE_EXTRA_PRICE);
    expect(listPrice('car-7-turbo')).toBeGreaterThan(listPrice('delorean'));
  });

  it('keeps worlds 1-2 on the weak roster and withholds the tank', () => {
    const early = npcRosterForPlanet(1);
    expect(early).toContain('car-1');
    expect(early).not.toContain('car-6-tank');
    expect(npcRosterForPlanet(5)).not.toContain('car-6-tank');
    expect(npcRosterForPlanet(6)).toContain('car-6-tank');
  });
});
