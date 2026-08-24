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

export const SPINNER_CAR_INDEX: readonly SpinnerCarIdentity[] = [GRAY_MUSCLE, BLUE_COMBAT, RED_OH_RED];

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
