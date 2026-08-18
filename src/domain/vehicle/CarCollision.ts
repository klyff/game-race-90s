import type { VehicleState } from './Vehicle.ts';
import type { VehicleStats } from './VehicleStats.ts';
import { overlapObb } from './CollisionMap.ts';
import type { CollisionBox } from './CollisionMap.ts';
import { add, distance, dot, normalize, scale, subtract } from '../math/Vec2.ts';
import type { Vec2 } from '../math/Vec2.ts';

/**
 * Coefficient of restitution for car-to-car collisions: 0.25.
 *
 * This sits in the soft end of arcade-style collisions (walls use 0.3). Cars are
 * heavier relative to their speed and designed for scraping and nudging rather than
 * hard bounces. A coefficient less than 1 means some kinetic energy is lost — a
 * realistic property that feels good and prevents cars from gaining energy by
 * bouncing off each other repeatedly.
 */
const CAR_RESTITUTION = 0.25;

/** Result of testing two cars for collision. */
export interface CarContact {
  /** The first car's state after resolution, or unchanged if no contact. */
  readonly a: VehicleState;
  /** The second car's state after resolution, or unchanged if no contact. */
  readonly b: VehicleState;
  /** True when the cars were overlapping and have been resolved. */
  readonly touched: boolean;
  /**
   * Closing speed along the contact normal at the moment of impact, world units/s.
   * Zero when there is no contact or the cars are already separating.
   */
  readonly impactSpeed: number;
  /** A's speed toward B along the contact normal, before the impulse. */
  readonly incomingA: number;
  /** B's speed toward A along the contact normal, before the impulse. */
  readonly incomingB: number;
  /** How hard A bounced back (impulse / mass). Less residual = planted attacker. */
  readonly returnA: number;
  /** How hard B bounced back (impulse / mass). */
  readonly returnB: number;
}

export const CONTACT_ATTACKER = {
  A: 'a',
  B: 'b',
  NEITHER: 'neither',
} as const;
export type ContactAttacker = (typeof CONTACT_ATTACKER)[keyof typeof CONTACT_ATTACKER];

export interface ContactAttackCredit {
  readonly attacker: ContactAttacker;
  /** 0..1 share of a full ram bounty. Mutual head-ons shrink toward 0. */
  readonly factor: number;
}

/** Ignore crawl-speed noise when deciding who drove into whom. */
const DRIVE_EPSILON = 0.35;

/**
 * Resolves a contact between two cars — an elastic-ish impulse exchange along the
 * line joining their centres, weighted by mass, plus a positional push to separate
 * any overlap. Momentum is conserved along the contact normal.
 *
 * This is a pure function: inputs are never mutated, and all outputs are fresh objects.
 * Cars that are not overlapping are returned unchanged with `touched: false`.
 *
 * Contact is a circle when no box is given, or the shared heading-aligned
 * box when both cars have one. The sprite cell can be large; the box is what hits.
 */
export function resolveCarContact(
  a: VehicleState,
  aStats: VehicleStats,
  b: VehicleState,
  bStats: VehicleStats,
  aBox?: CollisionBox,
  bBox?: CollisionBox,
): CarContact {
  const centerDistance = distance(a.position, b.position);
  let normal: Vec2 = { x: 1, y: 0 };
  let overlap = 0;

  if (aBox !== undefined && bBox !== undefined) {
    const hit = overlapObb(
      a.position,
      aBox,
      a.heading,
      b.position,
      bBox,
      b.heading,
    );
    if (hit === undefined) {
      return { a, b, touched: false, impactSpeed: 0, incomingA: 0, incomingB: 0, returnA: 0, returnB: 0 };
    }
    normal = hit.normal;
    overlap = hit.overlap;
  } else {
    const touchDistance = aStats.collisionRadius + bStats.collisionRadius;
    if (centerDistance > touchDistance) {
      return { a, b, touched: false, impactSpeed: 0, incomingA: 0, incomingB: 0, returnA: 0, returnB: 0 };
    }
    if (centerDistance > 0) {
      normal = normalize(subtract(b.position, a.position));
    }
    overlap = Math.max(0, touchDistance - centerDistance);
  }

  // Compute the closing speed along the normal.
  // Positive means the cars are moving together; negative means separating.
  const relativeVelocity = subtract(a.velocity, b.velocity);
  const closingSpeed = dot(relativeVelocity, normal);

  // Impulse is only applied if the cars are moving towards each other.
  // If they are already separating, leave them untouched to prevent "sticking" —
  // otherwise a glancing blow would cause the cars to re-collide repeatedly.
  const impactSpeed = closingSpeed > 0 ? closingSpeed : 0;
  const incomingA = Math.max(0, dot(a.velocity, normal));
  const incomingB = Math.max(0, -dot(b.velocity, normal));
  let returnA = 0;
  let returnB = 0;

  let resultA = a;
  let resultB = b;

  if (closingSpeed > 0) {
    // Apply impulse along the normal, split by mass.
    // Impulse magnitude j is derived from:
    //   - Momentum conservation: m_a * v_a' + m_b * v_b' = m_a * v_a + m_b * v_b
    //   - Restitution: v_b' - v_a' = -e * (v_b - v_a) · normal
    // Solving these together gives:
    //   j = -(1 + e) * closingSpeed / (1/m_a + 1/m_b)
    const totalMassReciprocal = 1 / aStats.mass + 1 / bStats.mass;
    const impulseMagnitude = -((1 + CAR_RESTITUTION) * closingSpeed) / totalMassReciprocal;
    const bounce = (1 + CAR_RESTITUTION) * closingSpeed / totalMassReciprocal;
    returnA = bounce / aStats.mass;
    returnB = bounce / bStats.mass;

    // Apply impulse: car a gains -j/m_a * normal, car b gains +j/m_a * normal.
    const impulseA = scale(normal, impulseMagnitude / aStats.mass);
    const impulseB = scale(normal, -impulseMagnitude / bStats.mass);

    resultA = {
      ...a,
      velocity: add(a.velocity, impulseA),
    };

    resultB = {
      ...b,
      velocity: add(b.velocity, impulseB),
    };
  }

  // Separate the overlap positionally, split by mass.
  // If they are still overlapping after the impulse (a zero-distance case or very slow speeds),
  // push them apart proportionally to their inverse masses so energy is conserved.
  // The amount to separate is the overlap: touchDistance - centerDistance.
  // The distribution is inverse-mass-weighted: heavier cars move less.
  if (overlap > 0) {
    const massReciprocal_a = 1 / aStats.mass;
    const massReciprocal_b = 1 / bStats.mass;
    const totalReciprocal = massReciprocal_a + massReciprocal_b;

    // Fraction of the overlap to push each car.
    // The heavier car (smaller reciprocal mass) moves less.
    const fractionA = massReciprocal_b / totalReciprocal;
    const fractionB = massReciprocal_a / totalReciprocal;

    // Push them apart: a moves away from b by fractionA * overlap along -normal,
    // b moves away from a by fractionB * overlap along +normal.
    const positionCorrection_a = scale(normal, -fractionA * overlap);
    const positionCorrection_b = scale(normal, fractionB * overlap);

    resultA = {
      ...resultA,
      position: add(resultA.position, positionCorrection_a),
    };

    resultB = {
      ...resultB,
      position: add(resultB.position, positionCorrection_b),
    };
  }

  return {
    a: resultA,
    b: resultB,
    touched: true,
    impactSpeed,
    incomingA,
    incomingB,
    returnA,
    returnB,
  };
}

/**
 * Who earned the ram bounty, and how much of it.
 *
 * Drive into the other car (incoming along the contact normal) is the first
 * test: a rear-end is one incoming vector. A head-on has both; then the
 * residual return force (bounce / mass) decides — whoever bounced less
 * attacked more. The bounty is the base value scaled by the return-force
 * delta, so a mutual crash pays little and a planted hit pays most of it.
 */
export function contactAttackCredit(contact: CarContact): ContactAttackCredit {
  if (!contact.touched || contact.impactSpeed <= 0) {
    return { attacker: CONTACT_ATTACKER.NEITHER, factor: 0 };
  }
  const driveA = contact.incomingA > DRIVE_EPSILON;
  const driveB = contact.incomingB > DRIVE_EPSILON;
  if (!driveA && !driveB) {
    return { attacker: CONTACT_ATTACKER.NEITHER, factor: 0 };
  }

  if (driveA && driveB) {
    const delta = Math.abs(contact.returnA - contact.returnB);
    const sum = contact.returnA + contact.returnB;
    if (sum <= 0 || delta <= 0) {
      return { attacker: CONTACT_ATTACKER.NEITHER, factor: 0 };
    }
    const attacker = contact.returnA < contact.returnB ? CONTACT_ATTACKER.A : CONTACT_ATTACKER.B;
    const contrary = Math.min(contact.returnA, contact.returnB);
    const factor = Math.min(1, delta / sum / (1 + contrary / delta));
    return { attacker, factor };
  }

  const incoming = contact.incomingA + contact.incomingB;
  if (incoming <= 0) {
    return { attacker: CONTACT_ATTACKER.NEITHER, factor: 0 };
  }
  const attacker = driveA ? CONTACT_ATTACKER.A : CONTACT_ATTACKER.B;
  const contrary = attacker === CONTACT_ATTACKER.A ? contact.returnA : contact.returnB;
  const victimReturn = attacker === CONTACT_ATTACKER.A ? contact.returnB : contact.returnA;
  const incomingShare =
    (attacker === CONTACT_ATTACKER.A ? contact.incomingA : contact.incomingB) / incoming;
  const planted = victimReturn + contrary > 0 ? victimReturn / (victimReturn + contrary) : 1;
  return { attacker, factor: Math.min(1, incomingShare * planted) };
}
