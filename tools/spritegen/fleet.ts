import { CAR_PERK, WORLD_ADVANTAGE } from '../../src/domain/constants.ts';
import type { CarPerkId, WorldAdvantage } from '../../src/domain/constants.ts';
import { carStatRow } from '../../src/data/cars/CarStatMatrix.ts';
import type { VehicleStats } from '../../src/domain/vehicle/VehicleStats.ts';

/**
 * One imported fleet car. Art comes from `fleet-src/{source}`; stats/perk/world
 * for numbered cars come from `CarStatMatrix` (folder `N_hero`). Delorean has
 * no matrix number and keeps its own template.
 */
export interface FleetCarDef {
  readonly id: string;
  /** Filename inside `tools/spritegen/fleet-src/`. */
  readonly source: string;
  readonly displayName: string;
  readonly archetype: string;
  readonly perk: CarPerkId;
  readonly homePlanetId: string;
  readonly worldAdvantage: WorldAdvantage;
  readonly stats: VehicleStats;
}

function matrixFields(
  n: number,
): Pick<FleetCarDef, 'perk' | 'homePlanetId' | 'worldAdvantage' | 'stats'> {
  const row = carStatRow(n);
  return {
    perk: row.perk,
    homePlanetId: row.homePlanetId,
    worldAdvantage: row.worldAdvantage,
    stats: row.stats,
  };
}

const STATS_DELOREAN: VehicleStats = {
  mass: 900,
  enginePower: 42,
  brakeForce: 44,
  maxSpeed: 92,
  grip: 24,
  steerRate: 2.8,
  steerSpeedFalloff: 0.5,
  armor: 0.18,
  ammoCapacity: 8,
  collisionRadius: 1.75,
  aimRadius: 3,
};

/** Official 20-car roster, car-select order. */
export const FLEET_CARS: readonly FleetCarDef[] = [
  {
    id: 'car-1',
    source: 'Car_1.png',
    displayName: 'Marauder',
    archetype: 'Balanced muscle — Thunder Basin titular',
    ...matrixFields(1),
  },
  {
    id: 'car-2',
    source: 'Car_2.png',
    displayName: 'Dust Fang',
    archetype: 'Light muscle — Thunder Basin reserva',
    ...matrixFields(2),
  },
  {
    id: 'car-5',
    source: 'Car_5.png',
    displayName: 'Sand Viper',
    archetype: 'Dirt muscle — Thunder Basin extra',
    ...matrixFields(5),
  },
  {
    id: 'delorean',
    source: 'Car_Delorean.png',
    displayName: 'Delorean',
    archetype: 'Steel wedge — Chrome Verge titular',
    perk: CAR_PERK.SLIPSTREAM,
    homePlanetId: 'chrome-verge',
    worldAdvantage: WORLD_ADVANTAGE.PRIMARY,
    stats: STATS_DELOREAN,
  },
  {
    id: 'car-9-turbo',
    source: 'Car_9_turbo.png',
    displayName: 'Nitro Viper',
    archetype: 'Turbo reserva — Chrome Verge',
    ...matrixFields(9),
  },
  {
    id: 'car-3',
    source: 'Car_3.png',
    displayName: 'Swamp Rat',
    archetype: 'Marsh-runner — Bogmire Deep titular',
    ...matrixFields(3),
  },
  {
    id: 'car-13',
    source: 'Car_13.png',
    displayName: 'Bog Howler',
    archetype: 'Marsh reserva — Bogmire Deep',
    ...matrixFields(13),
  },
  {
    id: 'car-4',
    source: 'Car_4.png',
    displayName: 'Frostbite',
    archetype: 'Ice-crawler — Cryo Hollow titular',
    ...matrixFields(4),
  },
  {
    id: 'car-17',
    source: 'Car_17.png',
    displayName: 'Icebreaker',
    archetype: 'Ice reserva — Cryo Hollow',
    ...matrixFields(17),
  },
  {
    id: 'car-8-strong',
    source: 'Car_8_strong.png',
    displayName: 'Iron Fist',
    archetype: 'Immovable bruiser — Ferro Rust titular',
    ...matrixFields(8),
  },
  {
    id: 'car-12-strong',
    source: 'Car_12_strong.png',
    displayName: 'Wrecker',
    archetype: 'Bulldozer reserva — Ferro Rust',
    ...matrixFields(12),
  },
  {
    id: 'car-6-tank',
    source: 'Car_6_tank.png',
    displayName: 'Magma Rex',
    archetype: 'War tank — Vulkanis titular',
    ...matrixFields(6),
  },
  {
    id: 'car-18',
    source: 'Car_18.png',
    displayName: 'Slag Hammer',
    archetype: 'Heavy reserva — Vulkanis',
    ...matrixFields(18),
  },
  {
    id: 'car-11',
    source: 'Car_11.png',
    displayName: 'Neon Ronin',
    archetype: 'Street-tuner — Neon Kasbah titular',
    ...matrixFields(11),
  },
  {
    id: 'car-15',
    source: 'Car_15.png',
    displayName: 'Volt Sting',
    archetype: 'Arsenal reserva — Neon Kasbah',
    ...matrixFields(15),
  },
  {
    id: 'car-7-turbo',
    source: 'Car_7_turbo.png',
    displayName: 'Afterburn',
    archetype: 'Turbo — Ash Reach titular',
    ...matrixFields(7),
  },
  {
    id: 'car-20',
    source: 'Car_20.png',
    displayName: 'Ash Comet',
    archetype: 'Slipstream reserva — Ash Reach',
    ...matrixFields(20),
  },
  {
    id: 'car-10',
    source: 'Car_10.png',
    displayName: 'Battle Trak',
    archetype: 'Weapons platform — Voidport titular',
    ...matrixFields(10),
  },
  {
    id: 'car-14',
    source: 'Car_14.png',
    displayName: 'Void Cannon',
    archetype: 'Arsenal reserva — Voidport',
    ...matrixFields(14),
  },
  {
    id: 'car-16',
    source: 'Car_16.png',
    displayName: 'Dirt Devil',
    archetype: 'Dirt buggy — Verdant Fault titular',
    ...matrixFields(16),
  },
  {
    id: 'car-19',
    source: 'Car_19.png',
    displayName: 'Vine Whip',
    archetype: 'Dirt reserva — Verdant Fault',
    ...matrixFields(19),
  },
];
