import { CAR_PERK, WORLD_ADVANTAGE } from '../../src/domain/constants.ts';
import type { CarPerkId, WorldAdvantage } from '../../src/domain/constants.ts';
import { matrixCarRow } from '../../src/data/cars/MatrixCarIndex.ts';
import { carStatRow } from '../../src/data/cars/CarStatMatrix.ts';
import type { VehicleStats } from '../../src/domain/vehicle/VehicleStats.ts';

/**
 * One imported fleet car. Art comes from `fleet-src/{source}`; stats/perk/world
 * for numbered cars come from `CarStatMatrix` (folder `N_hero`). Delorean is
 * special car 1 in `delorean_hero` and keeps its own template.
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
): Pick<FleetCarDef, 'displayName' | 'archetype' | 'perk' | 'homePlanetId' | 'worldAdvantage' | 'stats'> {
  const identity = matrixCarRow(n);
  const row = carStatRow(n);
  return {
    displayName: identity.displayName,
    archetype: identity.archetype,
    perk: row.perk,
    homePlanetId: row.homePlanetId,
    worldAdvantage: row.worldAdvantage,
    stats: row.stats,
  };
}

const STATS_DELOREAN: VehicleStats = {
  mass: 880,
  enginePower: 40,
  brakeForce: 50,
  maxSpeed: 88,
  grip: 36,
  steerRate: 3.05,
  steerSpeedFalloff: 0.36,
  armor: 0.32,
  ammoCapacity: 10,
  collisionRadius: 1.75,
  aimRadius: 3.2,
};

/** Official 20-car roster, car-select order. Names come from MatrixCarIndex. */
export const FLEET_CARS: readonly FleetCarDef[] = [
  { id: 'car-1', source: 'Car_1.png', ...matrixFields(1) },
  { id: 'car-2', source: 'Car_2.png', ...matrixFields(2) },
  { id: 'car-5', source: 'Car_5.png', ...matrixFields(5) },
  {
    id: 'delorean',
    source: 'Car_Delorean.png',
    displayName: 'Delorean',
    archetype: 'Special 1 — flux wedge, sticks on every world',
    perk: CAR_PERK.FLUX,
    homePlanetId: 'chrome-verge',
    worldAdvantage: WORLD_ADVANTAGE.PRIMARY,
    stats: STATS_DELOREAN,
  },
  { id: 'car-9-turbo', source: 'Car_9_turbo.png', ...matrixFields(9) },
  { id: 'car-3', source: 'Car_3.png', ...matrixFields(3) },
  { id: 'car-13', source: 'Car_13.png', ...matrixFields(13) },
  { id: 'car-4', source: 'Car_4.png', ...matrixFields(4) },
  { id: 'car-17', source: 'Car_17.png', ...matrixFields(17) },
  { id: 'car-8-strong', source: 'Car_8_strong.png', ...matrixFields(8) },
  { id: 'car-12-strong', source: 'Car_12_strong.png', ...matrixFields(12) },
  { id: 'car-6-tank', source: 'Car_6_tank.png', ...matrixFields(6) },
  { id: 'car-18', source: 'Car_18.png', ...matrixFields(18) },
  { id: 'car-11', source: 'Car_11.png', ...matrixFields(11) },
  { id: 'car-15', source: 'Car_15.png', ...matrixFields(15) },
  { id: 'car-7-turbo', source: 'Car_7_turbo.png', ...matrixFields(7) },
  { id: 'car-20', source: 'Car_20.png', ...matrixFields(20) },
  { id: 'car-10', source: 'Car_10.png', ...matrixFields(10) },
  { id: 'car-14', source: 'Car_14.png', ...matrixFields(14) },
  { id: 'car-16', source: 'Car_16.png', ...matrixFields(16) },
  { id: 'car-19', source: 'Car_19.png', ...matrixFields(19) },
];
