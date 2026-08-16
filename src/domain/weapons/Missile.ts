import { add, distance, fromAngle, scale } from '../math/Vec2.ts';
import type { Vec2 } from '../math/Vec2.ts';
import { MISSILE_LIFETIME_SECONDS, MISSILE_SPEED_FACTOR } from './WeaponConstants.ts';

export interface Missile {
  readonly id: number;
  readonly ownerCarId: string;
  readonly position: Vec2;
  readonly velocity: Vec2;
  readonly radius: number;
  readonly lifeRemaining: number;
}

export interface MissileHit {
  readonly missileId: number;
  readonly targetCarId: string;
  readonly ownerCarId: string;
}

let nextMissileId = 1;

/** Test helper: keep ids deterministic across suites. */
export function resetMissileIds(next: number = 1): void {
  nextMissileId = next;
}

/**
 * Spawn a missile travelling in a STRAIGHT line along the car's current heading
 * at `MISSILE_SPEED_FACTOR` × the car's authored max speed. Owner forbade any
 * homing — the aim decision happens at fire time, not in flight.
 */
export function launchMissile(
  ownerCarId: string,
  position: Vec2,
  heading: number,
  maxSpeed: number,
  hitRadius: number,
): Missile {
  const speed = Math.max(0, maxSpeed) * MISSILE_SPEED_FACTOR;
  const direction = fromAngle(heading);
  // Spawn slightly ahead of the nose so the firer cannot immediately hit themselves.
  const nose = add(position, scale(direction, hitRadius * 1.5));
  return {
    id: nextMissileId++,
    ownerCarId,
    position: nose,
    velocity: scale(direction, speed),
    radius: hitRadius,
    lifeRemaining: MISSILE_LIFETIME_SECONDS,
  };
}

/** Advance one missile; returns null when its fuse runs out. */
export function stepMissile(missile: Missile, stepSeconds: number): Missile | null {
  const dt = Number.isFinite(stepSeconds) && stepSeconds > 0 ? stepSeconds : 0;
  const lifeRemaining = missile.lifeRemaining - dt;
  if (lifeRemaining <= 0) {
    return null;
  }
  return {
    ...missile,
    position: add(missile.position, scale(missile.velocity, dt)),
    lifeRemaining,
  };
}

export interface MissileTarget {
  readonly carId: string;
  readonly position: Vec2;
  readonly radius: number;
}

/**
 * Pure hit test: a missile that overlaps any living target other than its owner
 * scores a hit. First overlap wins; a missile never hits two cars in one step.
 */
export function findMissileHit(
  missile: Missile,
  targets: readonly MissileTarget[],
): MissileHit | null {
  for (const target of targets) {
    if (target.carId === missile.ownerCarId) {
      continue;
    }
    const reach = missile.radius + target.radius;
    if (distance(missile.position, target.position) <= reach) {
      return {
        missileId: missile.id,
        targetCarId: target.carId,
        ownerCarId: missile.ownerCarId,
      };
    }
  }
  return null;
}
