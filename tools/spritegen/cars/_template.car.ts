import { CAR_PERK, WORLD_ADVANTAGE } from '../../../src/domain/constants.ts';
import type { FleetCarDef } from '../fleet.ts';

/**
 * TEMPLATE — copy this object, change ONLY the fields marked "muda só isto".
 * Do not invent stats: copy a row from `src/data/cars/CarStatMatrix.ts`.
 *
 * muda só isto:
 *   id, source, displayName, archetype, perk, homePlanetId, worldAdvantage, stats
 */
export const templateCar: FleetCarDef = {
  id: 'car-0',
  source: 'Car_0.png',
  displayName: 'Car 0',
  archetype: 'One-line flavour',
  perk: CAR_PERK.BULLDOZER,
  homePlanetId: 'thunder-basin',
  worldAdvantage: WORLD_ADVANTAGE.PRIMARY,
  stats: {
    mass: 1000,
    enginePower: 34,
    brakeForce: 46,
    maxSpeed: 78,
    grip: 30,
    steerRate: 2.5,
    steerSpeedFalloff: 0.45,
    armor: 0.4,
    ammoCapacity: 5,
    collisionRadius: 1.7,
    aimRadius: 3.5,
  },
};
