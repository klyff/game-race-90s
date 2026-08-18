import { add, distance, fromAngle, scale } from '../math/Vec2.ts';
import type { Vec2 } from '../math/Vec2.ts';
import {
  CAR_LENGTH_PER_COLLISION_RADIUS,
  DROP_BEHIND_CAR_LENGTHS,
  MINE_SIZE_OF_CAR,
  OIL_SIZE_OF_CAR,
  OIL_YAW_SPIN,
} from './WeaponConstants.ts';

export const HAZARD_KIND = {
  OIL: 'oil',
  MINE: 'mine',
} as const;
export type HazardKind = (typeof HAZARD_KIND)[keyof typeof HAZARD_KIND];

/**
 * A hazard placed on the track. Position is world-space, but it is DROPPED from
 * arc length (the caller's responsibility): the rules here only care about the
 * circle that cars must avoid.
 */
export interface TrackHazard {
  readonly id: number;
  readonly kind: HazardKind;
  readonly ownerCarId: string;
  readonly position: Vec2;
  readonly radius: number;
  /** Oil only: seconds until the slick evaporates. Mines last forever. */
  readonly lifeRemaining: number;
  /**
   * Arc length of the drop, recorded so a future pickup system can reason about
   * the track the same way T-017 planned. Not used for collision today.
   */
  readonly distance: number;
  /**
   * False until the owner drives off the blast radius. Prevents a drop under
   * the bumper from exploding the thrower; after they leave, anyone (including
   * the owner on a later lap) can hit it.
   */
  readonly ownerArmed: boolean;
}

export interface HazardHit {
  readonly hazardId: number;
  readonly kind: HazardKind;
  readonly targetCarId: string;
}

let nextHazardId = 1;

export function resetHazardIds(next: number = 1): void {
  nextHazardId = next;
}

function dropBehind(position: Vec2, heading: number, collisionRadius: number, hazardRadius: number): Vec2 {
  const carLength = CAR_LENGTH_PER_COLLISION_RADIUS * collisionRadius;
  const dropDistance = carLength / 2 + carLength * DROP_BEHIND_CAR_LENGTHS + hazardRadius;
  const back = fromAngle(heading + Math.PI);
  return add(position, scale(back, dropDistance));
}

export function dropOil(
  ownerCarId: string,
  position: Vec2,
  heading: number,
  collisionRadius: number,
  distanceAlongTrack: number,
  lifetimeSeconds: number,
): TrackHazard {
  const carLength = CAR_LENGTH_PER_COLLISION_RADIUS * collisionRadius;
  const radius = Math.max(0.1, (carLength * OIL_SIZE_OF_CAR) / 2);
  return {
    id: nextHazardId++,
    kind: HAZARD_KIND.OIL,
    ownerCarId,
    position: dropBehind(position, heading, collisionRadius, radius),
    radius,
    lifeRemaining: Math.max(0, lifetimeSeconds),
    distance: distanceAlongTrack,
    ownerArmed: false,
  };
}

export function dropMine(
  ownerCarId: string,
  position: Vec2,
  heading: number,
  collisionRadius: number,
  distanceAlongTrack: number,
): TrackHazard {
  const carLength = CAR_LENGTH_PER_COLLISION_RADIUS * collisionRadius;
  const radius = Math.max(0.1, (carLength * MINE_SIZE_OF_CAR) / 2);
  return {
    id: nextHazardId++,
    kind: HAZARD_KIND.MINE,
    ownerCarId,
    position: dropBehind(position, heading, collisionRadius, radius),
    radius,
    // Mines persist until hit; a huge life is simpler than a separate flag.
    lifeRemaining: Number.POSITIVE_INFINITY,
    distance: distanceAlongTrack,
    ownerArmed: false,
  };
}

/** Age oil slicks; remove anything whose fuse has run out. Mines never age out. */
export function ageHazards(
  hazards: readonly TrackHazard[],
  stepSeconds: number,
): TrackHazard[] {
  const dt = Number.isFinite(stepSeconds) && stepSeconds > 0 ? stepSeconds : 0;
  const next: TrackHazard[] = [];
  for (const hazard of hazards) {
    if (hazard.kind === HAZARD_KIND.MINE) {
      next.push(hazard);
      continue;
    }
    const lifeRemaining = hazard.lifeRemaining - dt;
    if (lifeRemaining > 0) {
      next.push({ ...hazard, lifeRemaining, ownerArmed: hazard.ownerArmed });
    }
  }
  return next;
}

export interface HazardTarget {
  readonly carId: string;
  readonly position: Vec2;
  readonly radius: number;
}

/** Arm any hazard whose owner has left the blast circle. */
export function armHazards(
  hazards: readonly TrackHazard[],
  targets: readonly HazardTarget[],
): TrackHazard[] {
  return hazards.map(hazard => {
    if (hazard.ownerArmed) {
      return hazard;
    }
    const owner = targets.find(target => target.carId === hazard.ownerCarId);
    if (owner === undefined) {
      return { ...hazard, ownerArmed: true };
    }
    if (distance(hazard.position, owner.position) > hazard.radius + owner.radius) {
      return { ...hazard, ownerArmed: true };
    }
    return hazard;
  });
}

/**
 * First hazard overlapping a target. The owner is immune until they drive off
 * the drop (`ownerArmed`); after that anyone, including the owner, can hit it.
 */
export function findHazardHits(
  hazards: readonly TrackHazard[],
  targets: readonly HazardTarget[],
): HazardHit[] {
  const hits: HazardHit[] = [];
  const claimedHazards = new Set<number>();
  const claimedCars = new Set<string>();

  for (const hazard of hazards) {
    if (claimedHazards.has(hazard.id)) {
      continue;
    }
    for (const target of targets) {
      if (claimedCars.has(target.carId)) {
        continue;
      }
      if (!hazard.ownerArmed && target.carId === hazard.ownerCarId) {
        continue;
      }
      if (distance(hazard.position, target.position) <= hazard.radius + target.radius) {
        hits.push({
          hazardId: hazard.id,
          kind: hazard.kind,
          targetCarId: target.carId,
        });
        claimedHazards.add(hazard.id);
        claimedCars.add(target.carId);
        break;
      }
    }
  }
  return hits;
}

/**
 * Yaw-spin an oil hit applies, reduced by armor (spinout resistance on
 * `VehicleStats`). Never below a still-violent floor so a heavy car still spins.
 */
export function oilYawSpinForArmor(armor: number): number {
  const safeArmor = Number.isFinite(armor) ? Math.max(0, Math.min(1, armor)) : 0;
  return OIL_YAW_SPIN * (1 - safeArmor * 0.5);
}
