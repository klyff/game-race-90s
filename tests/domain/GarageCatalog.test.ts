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
  it('lists spinner cars by unlock wave then price', () => {
    expect(GARAGE_CATALOG.map(entry => entry.carId)).toEqual([
      '2-sportivo-blue-combat',
      '3-red-oh-red',
      '1-muscle-car-gray-number9',
      '5-all-pink-fury',
      '10-delorean-steel-flux',
      '6-suv-black-noir',
      '7-fast-greenhish-machine',
      '8-purple-crazymania',
      '9-muscle-orange-bomber-combat',
    ]);
    expect(shopCarIds()).toEqual(GARAGE_CATALOG.map(entry => entry.carId));
    expect(shopCarIds()).not.toContain('car_21');
    expect(shopCarIds()).not.toContain('delorean');
    expect(shopCarIds()).not.toContain('car-18');
    expect(shopCarIds()).not.toContain('4-wasteland-pickup-sand-mg');
    expect(shopCarIds()).not.toContain('5-raider-sedan-cream-cannon');
    expect(shopCarIds()).not.toContain('6-war-muscle-red-bomber');
    expect(shopCarIds()).not.toContain('7-scav-wagon-olive-cannon');
    expect(shopCarIds()).not.toContain('4-pickup-army-green-wasteland');
  });

  it('publishes the shop price board', () => {
    expect(listPrice('2-sportivo-blue-combat')).toBe(STARTER_PRICE);
    expect(listPrice('3-red-oh-red')).toBe(99_000);
    expect(listPrice('1-muscle-car-gray-number9')).toBe(129_000);
    expect(listPrice('5-all-pink-fury')).toBe(173_000);
    expect(listPrice('10-delorean-steel-flux')).toBe(3_000_000);
    expect(listPrice('6-suv-black-noir')).toBe(250_000);
    expect(listPrice('7-fast-greenhish-machine')).toBe(260_000);
    expect(listPrice('8-purple-crazymania')).toBe(320_000);
    expect(listPrice('9-muscle-orange-bomber-combat')).toBe(570_000);
    expect(listPrice('car-18')).toBe(0);
    expect(listPrice('car_21')).toBe(0);
  });

  it('sells at 80% of list', () => {
    expect(sellPrice('2-sportivo-blue-combat')).toBe(40_000);
    expect(sellPrice('1-muscle-car-gray-number9')).toBe(103_200);
    expect(sellPrice('10-delorean-steel-flux')).toBe(2_400_000);
  });

  it('treats Blue Combat as the only starter', () => {
    expect(isStarterCar('2-sportivo-blue-combat')).toBe(true);
    expect(isCarUnlocked('2-sportivo-blue-combat', 1, 0)).toBe(true);
    expect(isStarterCar('3-red-oh-red')).toBe(false);
    expect(isCarUnlocked('3-red-oh-red', 1, 0)).toBe(true);
    expect(isCarUnlocked('1-muscle-car-gray-number9', 1, 0)).toBe(true);
    expect(isCarUnlocked('5-all-pink-fury', 1, 0)).toBe(true);
    expect(isCarUnlocked('10-delorean-steel-flux', 1, 0)).toBe(true);
    expect(isCarUnlocked('6-suv-black-noir', 1, 0)).toBe(false);
    expect(isCarUnlocked('7-fast-greenhish-machine', 1, 0)).toBe(false);
    expect(isStarterCar('1-muscle-car-gray-number9')).toBe(false);
    expect(isStarterCar('car-18')).toBe(false);
  });

  it('locks Black Noir, Greenhish and Purple together until world 2; Gray Muscle is world 1', () => {
    expect(isCarUnlocked('1-muscle-car-gray-number9', 1, 0)).toBe(true);
    expect(carUnlockHint('1-muscle-car-gray-number9', 1, 0)).toBeNull();
    expect(isCarUnlocked('6-suv-black-noir', 1, 0)).toBe(false);
    expect(carUnlockHint('6-suv-black-noir', 1, 0)).toBe('UNLOCKS IN WORLD 2');
    expect(isCarUnlocked('7-fast-greenhish-machine', 1, 0)).toBe(false);
    expect(carUnlockHint('7-fast-greenhish-machine', 1, 0)).toBe('UNLOCKS IN WORLD 2');
    expect(isCarUnlocked('8-purple-crazymania', 1, 0)).toBe(false);
    expect(carUnlockHint('8-purple-crazymania', 1, 0)).toBe('UNLOCKS IN WORLD 2');
    expect(isCarUnlocked('6-suv-black-noir', 2, 0)).toBe(true);
    expect(isCarUnlocked('7-fast-greenhish-machine', 2, 0)).toBe(true);
    expect(isCarUnlocked('8-purple-crazymania', 2, 0)).toBe(true);
    expect(carUnlockHint('6-suv-black-noir', 2, 0)).toBeNull();
    expect(carUnlockHint('7-fast-greenhish-machine', 2, 0)).toBeNull();
    expect(carUnlockHint('8-purple-crazymania', 2, 0)).toBeNull();
  });

  it('locks Orange Bomber until world 3', () => {
    expect(isCarUnlocked('9-muscle-orange-bomber-combat', 2, 0)).toBe(false);
    expect(carUnlockHint('9-muscle-orange-bomber-combat', 2, 0)).toBe('UNLOCKS IN WORLD 3');
    expect(isCarUnlocked('9-muscle-orange-bomber-combat', 3, 0)).toBe(true);
    expect(carUnlockHint('9-muscle-orange-bomber-combat', 3, 0)).toBeNull();
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

  it('keeps world 1 NPCs off the DeLorean; never fields the player-only flagship', () => {
    const early = npcRosterForPlanet(1);
    expect(early).toEqual([
      '2-sportivo-blue-combat',
      '3-red-oh-red',
      '1-muscle-car-gray-number9',
      '5-all-pink-fury',
    ]);
    expect(early).not.toContain('10-delorean-steel-flux');
    expect(npcRosterForPlanet(2)).toEqual([
      '2-sportivo-blue-combat',
      '3-red-oh-red',
      '1-muscle-car-gray-number9',
      '5-all-pink-fury',
      '6-suv-black-noir',
      '7-fast-greenhish-machine',
      '8-purple-crazymania',
    ]);
    expect(npcRosterForPlanet(3)).toEqual([
      '2-sportivo-blue-combat',
      '3-red-oh-red',
      '1-muscle-car-gray-number9',
      '5-all-pink-fury',
      '6-suv-black-noir',
      '7-fast-greenhish-machine',
      '8-purple-crazymania',
      '9-muscle-orange-bomber-combat',
    ]);
    expect(npcRosterForPlanet(8)).not.toContain('10-delorean-steel-flux');
    expect(npcRosterForPlanet(8)).not.toContain('delorean');
    expect(npcRosterForPlanet(8)).not.toContain('car-20');
  });
});
