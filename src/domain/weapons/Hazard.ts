import { worldOffsetBehindClock } from '../math/IsoClock.ts';
import { add, distance } from '../math/Vec2.ts';
import type { Vec2 } from '../math/Vec2.ts';
import { CRATE_SIZE_OF_CAR } from '../traps/TrapRules.ts';
import {
  CAR_LENGTH_PER_COLLISION_RADIUS,
  DROP_BEHIND_CAR_LENGTHS,
  DROP_BEHIND_PIXELS_PER_UNIT,
  DROP_BEHIND_SCREEN_PX,
  GASOLINE_SIZE_OF_CAR,
  MINE_SIZE_OF_CAR,
  OIL_SIZE_OF_CAR,
  OIL_YAW_SPIN,
} from './WeaponConstants.ts';

export const HAZARD_KIND = {
  OIL: 'oil',
  MINE: 'mine',
  GASOLINE: 'gasoline',
  CRATE: 'crate',
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
   * False until the owner drives off the blast radius. The dropper is always
   * immune; this flag only arms the puck for everyone else.
   */
  readonly ownerArmed: boolean;
  /** 0 = on the asphalt. Stacked traps sit above this. */
  readonly stackIndex: number;
}

export interface HazardHit {
  readonly hazardId: number;
  readonly kind: HazardKind;
  readonly targetCarId: string;
}

/** Presentation cue for a mine / gasoline burst at the hazard, not the car. */
export interface HazardBurst {
  readonly position: Vec2;
  readonly scale: number;
  readonly leaveBurnMark?: boolean;
}

let nextHazardId = 1;

export function resetHazardIds(next: number = 1): void {
  nextHazardId = next;
}

/** Sprite-pixel offset along the clock rear: bumper + a short gap, capped. */
export function dropBehindScreenPx(collisionRadius: number): number {
  const carLength = CAR_LENGTH_PER_COLLISION_RADIUS * collisionRadius;
  const fromBumper =
    (carLength * 0.5 + carLength * DROP_BEHIND_CAR_LENGTHS) * DROP_BEHIND_PIXELS_PER_UNIT;
  return Math.min(DROP_BEHIND_SCREEN_PX, Math.max(0, fromBumper));
}

function dropBehind(position: Vec2, heading: number, collisionRadius: number): Vec2 {
  return add(
    position,
    worldOffsetBehindClock(heading, dropBehindScreenPx(collisionRadius), DROP_BEHIND_PIXELS_PER_UNIT),
  );
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
    position: dropBehind(position, heading, collisionRadius),
    radius,
    lifeRemaining: Math.max(0, lifetimeSeconds),
    distance: distanceAlongTrack,
    ownerArmed: false,
    stackIndex: 0,
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
    position: dropBehind(position, heading, collisionRadius),
    radius,
    // Mines persist until hit; a huge life is simpler than a separate flag.
    lifeRemaining: Number.POSITIVE_INFINITY,
    distance: distanceAlongTrack,
    ownerArmed: false,
    stackIndex: 0,
  };
}

/**
 * Track-placed gasoline barrel. Already armed: there is no dropper to protect.
 * Same puck size as a mine; the larger boom is a presentation scale.
 */
export function placeGasoline(
  position: Vec2,
  collisionRadius: number,
  distanceAlongTrack: number,
  stackIndex: number = 0,
): TrackHazard {
  const carLength = CAR_LENGTH_PER_COLLISION_RADIUS * collisionRadius;
  const radius = Math.max(0.1, (carLength * GASOLINE_SIZE_OF_CAR) / 2);
  return {
    id: nextHazardId++,
    kind: HAZARD_KIND.GASOLINE,
    ownerCarId: '',
    position,
    radius,
    lifeRemaining: Number.POSITIVE_INFINITY,
    distance: distanceAlongTrack,
    ownerArmed: true,
    stackIndex,
  };
}

/**
 * Track-placed wooden crate. Already armed. Hitting one costs speed and a little energy.
 */
export function placeCrate(
  position: Vec2,
  collisionRadius: number,
  distanceAlongTrack: number,
  stackIndex: number = 0,
): TrackHazard {
  const carLength = CAR_LENGTH_PER_COLLISION_RADIUS * collisionRadius;
  const radius = Math.max(0.1, (carLength * CRATE_SIZE_OF_CAR) / 2);
  return {
    id: nextHazardId++,
    kind: HAZARD_KIND.CRATE,
    ownerCarId: '',
    position,
    radius,
    lifeRemaining: Number.POSITIVE_INFINITY,
    distance: distanceAlongTrack,
    ownerArmed: true,
    stackIndex,
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
    if (
      hazard.kind === HAZARD_KIND.MINE ||
      hazard.kind === HAZARD_KIND.GASOLINE ||
      hazard.kind === HAZARD_KIND.CRATE
    ) {
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
 * First hazard overlapping a target. The dropper never hits their own oil or
 * mine. Track traps (`ownerCarId` empty) hit everyone. `ownerArmed` only
 * delays rivals until the thrower has left the blast circle.
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
      if (hazard.ownerCarId !== '' && target.carId === hazard.ownerCarId) {
        continue;
      }
      if (!hazard.ownerArmed) {
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

export function isTrackTrap(hazard: TrackHazard): boolean {
  return hazard.kind === HAZARD_KIND.CRATE || hazard.kind === HAZARD_KIND.GASOLINE;
}

/** First crate or drum a missile overlaps. Oil and mines are not traps. */
export function findMissileTrapHit(
  missile: { readonly position: Vec2; readonly radius: number },
  hazards: readonly TrackHazard[],
): TrackHazard | null {
  for (const hazard of hazards) {
    if (!isTrackTrap(hazard)) {
      continue;
    }
    if (distance(missile.position, hazard.position) <= missile.radius + hazard.radius) {
      return hazard;
    }
  }
  return null;
}

/**
 * Yaw-spin an oil hit applies, reduced by armor (spinout resistance on
 * `VehicleStats`). Never below a still-violent floor so a heavy car still spins.
 */
export function oilYawSpinForArmor(armor: number): number {
  const safeArmor = Number.isFinite(armor) ? Math.max(0, Math.min(1, armor)) : 0;
  return OIL_YAW_SPIN * (1 - safeArmor * 0.5);
}
