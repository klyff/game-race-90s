import { airBlade } from './cars/air-blade.car.ts';
import { battleTrak } from './cars/battle-trak.car.ts';
import { dirtDevil } from './cars/dirt-devil.car.ts';
import { havac } from './cars/havac.car.ts';
import { marauder } from './cars/marauder.car.ts';
import type { CarModelDef } from './schema.ts';

/**
 * Every car in the game, in car-select order.
 *
 * Art agents author `cars/<id>.car.ts` and the orchestrator registers it here —
 * that split keeps each agent's task to a single file with no merge conflicts.
 */
export const CAR_MODELS: readonly CarModelDef[] = [
  marauder,
  dirtDevil,
  havac,
  airBlade,
  battleTrak,
];

export function findCarModel(id: string): CarModelDef {
  const model = CAR_MODELS.find((car) => car.id === id);
  if (model === undefined) {
    const known = CAR_MODELS.map((car) => car.id).join(', ');
    throw new Error(`Unknown car id "${id}". Registered cars: ${known}`);
  }
  return model;
}
