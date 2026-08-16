import { add, distance, fromAngle, scale } from '../math/Vec2.ts';
import type { Vec2 } from '../math/Vec2.ts';
import {
  DROP_BEHIND_FACTOR,
  MINE_RADIUS_FACTOR,
  OIL_RADIUS_FACTOR,
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

function dropBehind(position: Vec2, heading: number, carRadius: number): Vec2 {
  const back = fromAngle(heading + Math.PI);
  return add(position, scale(back, carRadius * DROP_BEHIND_FACTOR));
}

export function dropOil(
  ownerCarId: string,
  position: Vec2,
  heading: number,
  collisionRadius: number,
  distanceAlongTrack: number,
  lifetimeSeconds: number,
): TrackHazard {
  const radius = Math.max(0.1, collisionRadius * OIL_RADIUS_FACTOR);
  return {
    id: nextHazardId++,
    kind: HAZARD_KIND.OIL,
    ownerCarId,
    position: dropBehind(position, heading, collisionRadius),
    radius,
    lifeRemaining: Math.max(0, lifetimeSeconds),
    distance: distanceAlongTrack,
  };
}

export function dropMine(
  ownerCarId: string,
  position: Vec2,
  heading: number,
  collisionRadius: number,
  distanceAlongTrack: number,
): TrackHazard {
  const radius = Math.max(0.1, collisionRadius * MINE_RADIUS_FACTOR);
  return {
    id: nextHazardId++,
    kind: HAZARD_KIND.MINE,
    ownerCarId,
    position: dropBehind(position, heading, collisionRadius),
    radius,
    // Mines persist until hit; a huge life is simpler than a separate flag.
    lifeRemaining: Number.POSITIVE_INFINITY,
    distance: distanceAlongTrack,
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
      next.push({ ...hazard, lifeRemaining });
    }
  }
  return next;
}

export interface HazardTarget {
  readonly carId: string;
  readonly position: Vec2;
  readonly radius: number;
}

/**
 * First hazard overlapping a target. Owner immunity lasts until they drive off
 * the drop — a car may re-hit its own oil on a later lap, which is fair.
 * Immunity is "same step as drop" and is enforced by the caller skipping the
 * dropper on the spawn step; here every living car is fair game.
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
