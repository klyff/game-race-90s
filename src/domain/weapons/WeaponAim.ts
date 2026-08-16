import { add, distance, dot, fromAngle, scale, subtract } from '../math/Vec2.ts';
import type { Vec2 } from '../math/Vec2.ts';
import {
  AIM_REACH_CAR_LENGTHS,
  CAR_LENGTH_PER_COLLISION_RADIUS,
  DEFAULT_AIM_RADIUS,
} from './WeaponConstants.ts';

export interface AimCandidate {
  readonly carId: string;
  readonly position: Vec2;
  readonly isPlayer: boolean;
}

export interface AimDecision {
  /** True when a target sits inside the aim corridor. */
  readonly shouldFire: boolean;
  /** Preferred target car id, if any. Player wins ties on range. */
  readonly targetCarId: string | null;
}

/**
 * Forward distance from the car centre to the aim reticle, world units — the
 * length of the drawn green line. Derived from the car's `collisionRadius` so a
 * bigger car reaches proportionally further, matching the authored proportions.
 */
export function aimForwardReach(collisionRadius: number): number {
  return (
    AIM_REACH_CAR_LENGTHS *
    CAR_LENGTH_PER_COLLISION_RADIUS *
    Math.max(0, collisionRadius)
  );
}

/** World-space centre of the aim reticle (the green circle). */
export function aimReticleCenter(
  position: Vec2,
  heading: number,
  collisionRadius: number,
): Vec2 {
  return add(position, scale(fromAngle(heading), aimForwardReach(collisionRadius)));
}

/** Shortest distance from point `p` to the segment `a`→`b`. */
function distanceToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const ab = subtract(b, a);
  const abLengthSquared = dot(ab, ab);
  if (abLengthSquared === 0) {
    return distance(p, a);
  }
  const t = Math.max(0, Math.min(1, dot(subtract(p, a), ab) / abLengthSquared));
  const projected = add(a, scale(ab, t));
  return distance(p, projected);
}

/**
 * Missile aim as a forward CAPTURE CORRIDOR, not a cone.
 *
 * The reticle sits `aimForwardReach` ahead of the nose; the aim circle has radius
 * `aimRadius` (the green circle). A target is a valid lock when it is in front of
 * the car AND within `aimRadius` of the corridor running from the nose to the
 * reticle centre. A larger `aimRadius` widens that corridor, so the shot is more
 * forgiving — "quanto maior, mais preciso".
 *
 * Owner rules preserved: if a Player is capturable, every NPC prioritises it;
 * otherwise the nearest capturable rival is chosen.
 */
export function decideMissileAim(
  shooterPosition: Vec2,
  shooterHeading: number,
  shooterCollisionRadius: number,
  aimRadius: number,
  candidates: readonly AimCandidate[],
): AimDecision {
  const forward = fromAngle(shooterHeading);
  const reticle = aimReticleCenter(
    shooterPosition,
    shooterHeading,
    shooterCollisionRadius,
  );
  const captureRadius = aimRadius > 0 ? aimRadius : DEFAULT_AIM_RADIUS;

  let bestPlayer: { carId: string; range: number } | null = null;
  let bestOther: { carId: string; range: number } | null = null;

  for (const candidate of candidates) {
    const offset = subtract(candidate.position, shooterPosition);
    // Only ever lock onto something ahead of the nose.
    if (dot(offset, forward) <= 0) {
      continue;
    }
    if (distanceToSegment(candidate.position, shooterPosition, reticle) > captureRadius) {
      continue;
    }

    const pick = { carId: candidate.carId, range: distance(shooterPosition, candidate.position) };
    if (candidate.isPlayer) {
      if (bestPlayer === null || pick.range < bestPlayer.range) {
        bestPlayer = pick;
      }
    } else if (bestOther === null || pick.range < bestOther.range) {
      bestOther = pick;
    }
  }

  const chosen = bestPlayer ?? bestOther;
  if (chosen === null) {
    return { shouldFire: false, targetCarId: null };
  }
  return { shouldFire: true, targetCarId: chosen.carId };
}
