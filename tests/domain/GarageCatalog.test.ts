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
} from '../../src/domain/progress/GarageCatalog.ts';

describe('GarageCatalog', () => {
  it('lists only spinner cars', () => {
    expect(GARAGE_CATALOG.map(entry => entry.carId)).toEqual([
      '2-sportivo-blue-combat',
      '1-muscle-car-gray-number9',
    ]);
    expect(shopCarIds()).toEqual([
      '2-sportivo-blue-combat',
      '1-muscle-car-gray-number9',
    ]);
    expect(shopCarIds()).not.toContain('car_21');
    expect(shopCarIds()).not.toContain('delorean');
    expect(shopCarIds()).not.toContain('car-18');
  });

  it('prices the starter at $50k and Gray Muscle at $98k', () => {
    expect(listPrice('2-sportivo-blue-combat')).toBe(STARTER_PRICE);
    expect(listPrice('1-muscle-car-gray-number9')).toBe(98_000);
    expect(listPrice('car-18')).toBe(0);
    expect(listPrice('car_21')).toBe(0);
  });

  it('sells at 80% of list', () => {
    expect(sellPrice('2-sportivo-blue-combat')).toBe(40_000);
  });

  it('treats Blue Combat as the only starter', () => {
    expect(isStarterCar('2-sportivo-blue-combat')).toBe(true);
    expect(isCarUnlocked('2-sportivo-blue-combat', 1, 0)).toBe(true);
    expect(isStarterCar('1-muscle-car-gray-number9')).toBe(false);
    expect(isStarterCar('car-18')).toBe(false);
  });

  it('locks Gray Muscle until world 2 or a podium clear', () => {
    expect(isCarUnlocked('1-muscle-car-gray-number9', 1, 0)).toBe(false);
    expect(carUnlockHint('1-muscle-car-gray-number9', 1, 0)).toBe('UNLOCKS IN WORLD 2');
    expect(isCarUnlocked('1-muscle-car-gray-number9', 1, 1)).toBe(true);
    expect(isCarUnlocked('1-muscle-car-gray-number9', 2, 0)).toBe(true);
    expect(carUnlockHint('1-muscle-car-gray-number9', 2, 0)).toBeNull();
  });

  it('treats obsolete matrix ids as retired', () => {
    expect(isCarUnlocked('car-18', 8, 99)).toBe(false);
    expect(isCarUnlocked('delorean', 8, 99)).toBe(false);
    expect(carUnlockHint('car-1', 1, 0)).toBe('RETIRED');
    expect(carUnlockHint('delorean', 8, 0)).toBe('RETIRED');
  });

  it('unlocks every catalog car once planet 8 is open', () => {
    for (const entry of GARAGE_CATALOG) {
      expect(isCarUnlocked(entry.carId, 8, 0)).toBe(true);
    }
  });

  it('keeps world 1 NPCs on Blue Combat and adds Gray Muscle on world 2', () => {
    const early = npcRosterForPlanet(1);
    expect(early).toEqual(['2-sportivo-blue-combat']);
    expect(npcRosterForPlanet(2)).toEqual([
      '2-sportivo-blue-combat',
      '1-muscle-car-gray-number9',
    ]);
    expect(npcRosterForPlanet(8)).not.toContain('delorean');
    expect(npcRosterForPlanet(8)).not.toContain('car-20');
  });
});
