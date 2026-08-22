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
    expect(listPrice('car_21')).toBe(STARTER_PRICE);
    expect(listPrice('car-18')).toBe(WORLD_ONE_EXTRA_PRICE);
    expect(listPrice('car-19')).toBe(WORLD_ONE_EXTRA_PRICE);
  });

  it('sells at 80% of list', () => {
    expect(sellPrice('car-1')).toBe(40_000);
  });

  it('never treats the camo tank as a starter', () => {
    expect(isStarterCar('car-18')).toBe(false);
    expect(isCarUnlocked('car-18', 1, 0)).toBe(false);
  });

  it('unlocks world-1 extras after the first podium clear', () => {
    expect(isCarUnlocked('car-18', 1, 0)).toBe(false);
    expect(isCarUnlocked('car-18', 1, 1)).toBe(true);
    expect(carUnlockHint('car-19', 1, 0)).toBe('FINISH TOP 3 TO UNLOCK');
    expect(carUnlockHint('car-19', 1, 1)).toBeNull();
    expect(carUnlockHint('car-20', 1, 0)).toBe('UNLOCKS IN WORLD 2');
    expect(carUnlockHint('car-1', 1, 0)).toBeNull();
    expect(carUnlockHint('car_21', 1, 0)).toBeNull();
  });

  it('does not spend the first podium on a later-world car', () => {
    expect(isCarUnlocked('car-20', 1, 1)).toBe(false);
    expect(isCarUnlocked('car-20', 1, 2)).toBe(true);
  });

  it('lists every catalog car even when the garage is empty', () => {
    expect(shopCarIds([], 1, 0)).toEqual(GARAGE_CATALOG.map(entry => entry.carId));
    expect(shopCarIds(['car-1'], 1, 0)).toContain('car-18');
    expect(isCarUnlocked('car-18', 1, 0)).toBe(false);
    expect(isCarUnlocked('car-1', 1, 0)).toBe(true);
  });

  it('unlocks every catalog car once planet 8 is open', () => {
    for (const entry of GARAGE_CATALOG) {
      expect(isCarUnlocked(entry.carId, 8, 0)).toBe(true);
    }
  });

  it('grows later-world prices by about 40%', () => {
    expect(listPrice('car-20')).toBeGreaterThan(WORLD_ONE_EXTRA_PRICE);
    expect(listPrice('delorean')).toBeGreaterThan(listPrice('car-20'));
  });

  it('keeps worlds 1-2 on the weak/medium roster and withholds later heavies', () => {
    const early = npcRosterForPlanet(1);
    expect(early).toContain('car-1');
    expect(early).toContain('car_21');
    expect(early).not.toContain('delorean');
    expect(npcRosterForPlanet(4)).not.toContain('car-20');
    expect(npcRosterForPlanet(5)).toContain('car-20');
    expect(npcRosterForPlanet(5)).toContain('delorean');
  });
});
