/**
 * One collision box from the authored solids.
 * The sprite cell can be large; this is what actually hits.
 */

import { bestCollisionBox, collisionSquares } from '../../src/domain/vehicle/CollisionMap.ts';
import type { CollisionBox } from '../../src/domain/vehicle/CollisionMap.ts';
import type { VehicleStats } from '../../src/domain/vehicle/VehicleStats.ts';
import { buildFaces, groundExtents } from './geometry.ts';
import { findCarModel } from './registry.ts';
import type { CarModelDef } from './schema.ts';

/** Fleet sheet id → procedural model that owns the world solids. */
const FLEET_MODEL_ID: Readonly<Record<string, string>> = {
  'car-1': 'marauder',
  'car-2': 'marauder',
  'car-5': 'marauder',
  delorean: 'delorean',
  'car-9-turbo': 'air-blade',
  'car-7-turbo': 'air-blade',
  'car-20': 'air-blade',
  'car-3': 'air-boat',
  'car-13': 'air-boat',
  'car-4': 'snow-car',
  'car-17': 'snow-car',
  'car-8-strong': 'havac',
  'car-12-strong': 'havac',
  'car-18': 'havac',
  'car-6-tank': 'magma-rex',
  'car-11': 'neon-ronin',
  'car-15': 'neon-ronin',
  'car-10': 'battle-trak',
  'car-14': 'battle-trak',
  'car-16': 'dirt-devil',
  'car-19': 'dirt-devil',
};

function rounded(value: number): number {
  return Number(value.toFixed(4));
}

export function collisionBoxFromDef(def: CarModelDef): CollisionBox {
  const { halfLength, halfWidth } = groundExtents(buildFaces(def));
  const box = bestCollisionBox(halfLength, halfWidth);
  return { along: rounded(box.along), across: rounded(box.across) };
}

export function withCollisionBox(stats: VehicleStats, box: CollisionBox): VehicleStats {
  const squares = collisionSquares(box.along, box.across);
  return {
    ...stats,
    collisionAlong: box.along,
    collisionAcross: box.across,
    collisionSquareMin: rounded(squares.min),
    collisionSquareMax: rounded(squares.max),
    collisionSquare: rounded(squares.mid),
  };
}

export function collisionBoxForCarId(carId: string): CollisionBox {
  const modelId = FLEET_MODEL_ID[carId] ?? carId;
  return collisionBoxFromDef(findCarModel(modelId));
}
