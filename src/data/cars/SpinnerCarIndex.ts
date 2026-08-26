import { CAR_PERK, WORLD_ADVANTAGE } from '../../domain/constants.ts';
import type { CarPerkId, WorldAdvantage } from '../../domain/constants.ts';
import type { VehicleStats } from '../../domain/vehicle/VehicleStats.ts';
import { CLOCK_DIRECTION, spinnerInventoryParts, type ClockDirection } from './CarManifest.ts';

export const SPINNER_TIER = {
  WEAK: 'weak',
  MEDIUM: 'medium',
  HEAVY: 'heavy',
} as const;
export type SpinnerTier = (typeof SPINNER_TIER)[keyof typeof SPINNER_TIER];

/**
 * Authored identity for isometric-car-spinner exports.
 * Folder `public/assets/cars/<n>-<slug>/` is the source of truth for art;
 * `id` here is the slug only. The numbered folder is assigned at export.
 *
 * Clock: 32 frames, index 0 = 6h, +11.25° counter-clockwise.
 * Hero (loja / garagem / demais telas) is always frame 07 → `car_hero.png`.
 * Handling follows arcade consult (fun > realism, high grip, no Marauder-78 clone).
 */
export interface SpinnerCarIdentity {
  readonly id: string;
  readonly displayName: string;
  readonly callName: string;
  readonly archetype: string;
  readonly perk: CarPerkId;
  readonly homePlanetId: string;
  readonly worldAdvantage: WorldAdvantage;
  readonly tier: SpinnerTier;
  readonly unlockPlanet: number;
  readonly price: number;
  readonly clock: ClockDirection;
  readonly frameCount: 32;
  readonly heroFrame: 7;
  readonly stats: VehicleStats;
}

function spinnerCar(
  partial: Omit<SpinnerCarIdentity, 'clock' | 'frameCount' | 'heroFrame'>,
): SpinnerCarIdentity {
  return {
    ...partial,
    clock: CLOCK_DIRECTION.COUNTER_CLOCKWISE,
    frameCount: 32,
    heroFrame: 7,
  };
}

/**
 * Gray Muscle War Car — heavy combat coupe, roof turret.
 * Arcade: high mass / armor, modest top speed, planted grip (COM down).
 */
const GRAY_MUSCLE = spinnerCar({
  id: 'muscle-car-gray-number9',
  displayName: 'Gray Muscle',
  callName: 'Gray Muscle',
  archetype: 'Charcoal war coupe — roof turret, black hood stripe',
  perk: CAR_PERK.ARSENAL,
  homePlanetId: 'thunder-basin',
  worldAdvantage: WORLD_ADVANTAGE.SECONDARY,
  tier: SPINNER_TIER.HEAVY,
  unlockPlanet: 2,
  price: 98_000,
  stats: {
    mass: 1120,
    enginePower: 28,
    brakeForce: 48,
    maxSpeed: 61,
    grip: 29,
    steerRate: 2.25,
    steerSpeedFalloff: 0.47,
    armor: 0.52,
    ammoCapacity: 16,
    collisionRadius: 1.76,
    aimRadius: 3.85,
  },
});

/**
 * Blue Combat Sport — wide-body sports coupe, hood gun.
 * Arcade: lighter, quicker steer, still under the old 78 u/s Marauder ceiling.
 */
const BLUE_COMBAT = spinnerCar({
  id: 'sportivo-blue-combat',
  displayName: 'Blue Combat Sport',
  callName: 'Blue Combat',
  archetype: 'Blue sports coupe — hood gun, chunky combat kit',
  perk: CAR_PERK.TURBO,
  homePlanetId: 'chrome-verge',
  worldAdvantage: WORLD_ADVANTAGE.SECONDARY,
  tier: SPINNER_TIER.MEDIUM,
  unlockPlanet: 1,
  price: 50_000,
  stats: {
    mass: 920,
    enginePower: 31,
    brakeForce: 43,
    maxSpeed: 68,
    grip: 27,
    steerRate: 2.75,
    steerSpeedFalloff: 0.5,
    armor: 0.33,
    ammoCapacity: 10,
    collisionRadius: 1.64,
    aimRadius: 3.35,
  },
});

/**
 * Red Oh Red — pixel sport, roof cannon, dual white stripes.
 * Arcade medium for Thunder Basin: planted vs Blue Combat, still ~60 u/s
 * teaching speed (not the old 78 Marauder). Roof gun → arsenal, not turbo.
 */
const RED_OH_RED = spinnerCar({
  id: 'red-oh-red',
  displayName: 'Red Oh Red',
  callName: 'Red Oh Red',
  archetype: 'Red pixel sport — roof cannon, dual white stripes',
  perk: CAR_PERK.ARSENAL,
  homePlanetId: 'thunder-basin',
  worldAdvantage: WORLD_ADVANTAGE.SECONDARY,
  tier: SPINNER_TIER.MEDIUM,
  unlockPlanet: 1,
  price: 62_000,
  stats: {
    mass: 980,
    enginePower: 29,
    brakeForce: 44,
    maxSpeed: 63,
    grip: 28,
    steerRate: 2.5,
    steerSpeedFalloff: 0.49,
    armor: 0.38,
    ammoCapacity: 12,
    collisionRadius: 1.68,
    aimRadius: 3.5,
  },
});

/**
 * All Pink Fury — candy-pink convertible, hood laser. Medium, shop ~$87k.
 * Arcade consult: keep the 64 u/s punch, plant the tyres so it stops
 * ice-skating mid-corner (high grip, low steer falloff). Open cabin stays
 * glass — lowest armor on the live roster. Hood laser → arsenal.
 */
const ALL_PINK_FURY = spinnerCar({
  id: 'all-pink-fury',
  displayName: 'All Pink Fury',
  callName: 'Pink Fury',
  archetype: 'Candy-pink convertible coupe — hood laser, open cabin',
  perk: CAR_PERK.ARSENAL,
  homePlanetId: 'chrome-verge',
  worldAdvantage: WORLD_ADVANTAGE.SECONDARY,
  tier: SPINNER_TIER.MEDIUM,
  unlockPlanet: 1,
  price: 87_000,
  stats: {
    mass: 950,
    enginePower: 30,
    brakeForce: 46,
    maxSpeed: 64,
    grip: 34,
    steerRate: 2.6,
    steerSpeedFalloff: 0.36,
    armor: 0.28,
    ammoCapacity: 13,
    collisionRadius: 1.66,
    aimRadius: 3.45,
  },
});

/**
 * Fast Greenhish Machine — Red Oh Red silhouette, green paint, black stripes.
 * World 2 step-up: same roof-cannon arsenal, a little more speed / grip / steer
 * than Red Oh Red, still under Blue Combat 68 and far from the old Marauder 78.
 * Arcade consult: fun > realism, planted COM (lighter + higher grip), no ice-skate.
 */
const FAST_GREENHISH_MACHINE = spinnerCar({
  id: 'fast-greenhish-machine',
  displayName: 'Fast Greenhish Machine',
  callName: 'Greenhish Machine',
  archetype: 'Green pixel sport — roof cannon, dual black stripes (Red Oh Red recolor)',
  perk: CAR_PERK.ARSENAL,
  homePlanetId: 'thunder-basin',
  worldAdvantage: WORLD_ADVANTAGE.SECONDARY,
  tier: SPINNER_TIER.MEDIUM,
  unlockPlanet: 2,
  price: 320_000,
  stats: {
    mass: 960,
    enginePower: 31,
    brakeForce: 46,
    maxSpeed: 66,
    grip: 30,
    steerRate: 2.65,
    steerSpeedFalloff: 0.46,
    armor: 0.4,
    ammoCapacity: 13,
    collisionRadius: 1.68,
    aimRadius: 3.5,
  },
});

/**
 * SUV Black Noir — compact Renegade, mid-roof MG. Medium++.
 * Arcade consult: planted COM, high grip, heavier than the coupes.
 * Teaching speed ~62 u/s — under Blue Combat 68, not the old Marauder 78.
 * Roof turret → arsenal.
 */
const SUV_BLACK_NOIR = spinnerCar({
  id: 'suv-black-noir',
  displayName: 'SUV Black Noir',
  callName: 'Black Noir',
  archetype: 'Short black Renegade SUV — mid-roof machine gun, red tow hooks',
  perk: CAR_PERK.ARSENAL,
  homePlanetId: 'thunder-basin',
  worldAdvantage: WORLD_ADVANTAGE.SECONDARY,
  tier: SPINNER_TIER.MEDIUM,
  unlockPlanet: 1,
  price: 200_000,
  stats: {
    mass: 1080,
    enginePower: 28,
    brakeForce: 46,
    maxSpeed: 62,
    grip: 30,
    steerRate: 2.35,
    steerSpeedFalloff: 0.46,
    armor: 0.44,
    ammoCapacity: 14,
    collisionRadius: 1.8,
    aimRadius: 3.7,
  },
});

/**
 * Purple Crazymania — Greenhish silhouette, purple paint, no center stripe.
 * World 2 shop flagship: more speed and a lot more grip / steer than Greenhish
 * (wide-arch + deep-dish feel), still under Blue Combat 68 and far from Marauder 78.
 * Arcade consult: fun > realism, high grip, planted COM, keep steer at speed for drift.
 */
const PURPLE_CRAZYMANIA = spinnerCar({
  id: 'purple-crazymania',
  displayName: 'Purple Crazymania',
  callName: 'Crazymania',
  archetype: 'Purple pixel sport — roof cannon, wide arches, no center stripe',
  perk: CAR_PERK.ARSENAL,
  homePlanetId: 'thunder-basin',
  worldAdvantage: WORLD_ADVANTAGE.SECONDARY,
  tier: SPINNER_TIER.MEDIUM,
  unlockPlanet: 2,
  price: 500_000,
  stats: {
    mass: 930,
    enginePower: 33,
    brakeForce: 48,
    maxSpeed: 67,
    grip: 34,
    steerRate: 2.85,
    steerSpeedFalloff: 0.4,
    armor: 0.42,
    ammoCapacity: 14,
    collisionRadius: 1.72,
    aimRadius: 3.55,
  },
});

export const SPINNER_CAR_INDEX: readonly SpinnerCarIdentity[] = [
  GRAY_MUSCLE,
  BLUE_COMBAT,
  RED_OH_RED,
  ALL_PINK_FURY,
  SUV_BLACK_NOIR,
  FAST_GREENHISH_MACHINE,
  PURPLE_CRAZYMANIA,
];

export function spinnerCarIds(): readonly string[] {
  return SPINNER_CAR_INDEX.map(car => car.id);
}

export function spinnerCarRow(id: string): SpinnerCarIdentity | undefined {
  const slug = spinnerInventoryParts(id)?.slug ?? id;
  return SPINNER_CAR_INDEX.find(car => car.id === id || car.id === slug);
}

export function isSpinnerCarIndexed(id: string): boolean {
  return spinnerCarRow(id) !== undefined;
}
