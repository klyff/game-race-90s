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
 * Sand Hauler — wasteland pickup, roof twin MG. Level-1 NPC "dumb truck":
 * heavy, slow, planted. Thunder Basin teaching band.
 */
const SAND_HAULER = spinnerCar({
  id: 'wasteland-pickup-sand-mg',
  displayName: 'Sand Hauler',
  callName: 'Sand Hauler',
  archetype: 'Sand pickup — yellow stripes, roof twin machine gun',
  perk: CAR_PERK.ARSENAL,
  homePlanetId: 'thunder-basin',
  worldAdvantage: WORLD_ADVANTAGE.SECONDARY,
  tier: SPINNER_TIER.WEAK,
  unlockPlanet: 1,
  price: 48_000,
  stats: {
    mass: 1180,
    enginePower: 24,
    brakeForce: 46,
    maxSpeed: 56,
    grip: 30,
    steerRate: 2.15,
    steerSpeedFalloff: 0.42,
    armor: 0.44,
    ammoCapacity: 14,
    collisionRadius: 1.82,
    aimRadius: 3.6,
  },
});

/**
 * Hood Howitzer — cream raider sedan, center-hood cannon.
 */
const HOOD_HOWITZER = spinnerCar({
  id: 'raider-sedan-cream-cannon',
  displayName: 'Hood Howitzer',
  callName: 'Howitzer',
  archetype: 'Cream sedan — black stripes, hood-center cannon',
  perk: CAR_PERK.ARSENAL,
  homePlanetId: 'thunder-basin',
  worldAdvantage: WORLD_ADVANTAGE.SECONDARY,
  tier: SPINNER_TIER.MEDIUM,
  unlockPlanet: 1,
  price: 52_000,
  stats: {
    mass: 960,
    enginePower: 27,
    brakeForce: 44,
    maxSpeed: 60,
    grip: 28,
    steerRate: 2.45,
    steerSpeedFalloff: 0.46,
    armor: 0.36,
    ammoCapacity: 10,
    collisionRadius: 1.7,
    aimRadius: 3.45,
  },
});

/**
 * Red Bomber — war-red muscle, rear bomb rack.
 */
const RED_BOMBER = spinnerCar({
  id: 'war-muscle-red-bomber',
  displayName: 'Red Bomber',
  callName: 'Bomber',
  archetype: 'War-red muscle — white side stripes, rear bomb launcher',
  perk: CAR_PERK.ARSENAL,
  homePlanetId: 'thunder-basin',
  worldAdvantage: WORLD_ADVANTAGE.SECONDARY,
  tier: SPINNER_TIER.MEDIUM,
  unlockPlanet: 1,
  price: 55_000,
  stats: {
    mass: 1040,
    enginePower: 28,
    brakeForce: 45,
    maxSpeed: 62,
    grip: 27,
    steerRate: 2.35,
    steerSpeedFalloff: 0.48,
    armor: 0.4,
    ammoCapacity: 8,
    collisionRadius: 1.72,
    aimRadius: 3.4,
  },
});

/**
 * Olive Scav — army wagon, roof ring cannon. Slow convoy hauler.
 */
const OLIVE_SCAV = spinnerCar({
  id: 'scav-wagon-olive-cannon',
  displayName: 'Olive Scav',
  callName: 'Scav',
  archetype: 'Olive wagon — orange hazard bars, roof ring cannon',
  perk: CAR_PERK.TRENCH_GRIP,
  homePlanetId: 'thunder-basin',
  worldAdvantage: WORLD_ADVANTAGE.SECONDARY,
  tier: SPINNER_TIER.WEAK,
  unlockPlanet: 1,
  price: 46_000,
  stats: {
    mass: 1100,
    enginePower: 25,
    brakeForce: 47,
    maxSpeed: 58,
    grip: 31,
    steerRate: 2.2,
    steerSpeedFalloff: 0.4,
    armor: 0.42,
    ammoCapacity: 10,
    collisionRadius: 1.86,
    aimRadius: 3.55,
  },
});

export const SPINNER_CAR_INDEX: readonly SpinnerCarIdentity[] = [
  GRAY_MUSCLE,
  BLUE_COMBAT,
  RED_OH_RED,
  SAND_HAULER,
  HOOD_HOWITZER,
  RED_BOMBER,
  OLIVE_SCAV,
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
