import type { VehicleState } from './Vehicle.ts';
import type { VehicleStats } from './VehicleStats.ts';
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
}

/**
 * Resolves a contact between two cars — an elastic-ish impulse exchange along the
 * line joining their centres, weighted by mass, plus a positional push to separate
 * any overlap. Momentum is conserved along the contact normal.
 *
 * This is a pure function: inputs are never mutated, and all outputs are fresh objects.
 * Cars that are not overlapping are returned unchanged with `touched: false`.
 *
 * Contact is defined as distance between centres < aStats.collisionRadius + bStats.collisionRadius.
 */
export function resolveCarContact(
  a: VehicleState,
  aStats: VehicleStats,
  b: VehicleState,
  bStats: VehicleStats,
): CarContact {
  const touchDistance = aStats.collisionRadius + bStats.collisionRadius;
  const centerDistance = distance(a.position, b.position);

  // No contact: both cars unchanged.
  if (centerDistance > touchDistance) {
    return { a, b, touched: false, impactSpeed: 0 };
  }

  // Handle the degenerate case: both cars at exactly the same position.
  // Pick a deterministic normal to avoid NaN: the unit vector (1, 0).
  // This is never-zero and follows the same principle as the wall model: a
  // deterministic direction rather than branching logic.
  let normal: Vec2 = { x: 1, y: 0 };
  if (centerDistance > 0) {
    // Normal points from a to b.
    normal = normalize(subtract(b.position, a.position));
  }

  // Compute the closing speed along the normal.
  // Positive means the cars are moving together; negative means separating.
  const relativeVelocity = subtract(a.velocity, b.velocity);
  const closingSpeed = dot(relativeVelocity, normal);

  // Impulse is only applied if the cars are moving towards each other.
  // If they are already separating, leave them untouched to prevent "sticking" —
  // otherwise a glancing blow would cause the cars to re-collide repeatedly.
  const impactSpeed = closingSpeed > 0 ? closingSpeed : 0;

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

    // Apply impulse: car a gains -j/m_a * normal, car b gains +j/m_a * normal.
    const impulseA = scale(normal, impulseMagnitude / aStats.mass);
    const impulseB = scale(normal, -impulseMagnitude / bStats.mass);

    resultA = {
      position: a.position,
      velocity: add(a.velocity, impulseA),
      heading: a.heading,
      yawSpin: a.yawSpin,
    };

    resultB = {
      position: b.position,
      velocity: add(b.velocity, impulseB),
      heading: b.heading,
      yawSpin: b.yawSpin,
    };
  }

  // Separate the overlap positionally, split by mass.
  // If they are still overlapping after the impulse (a zero-distance case or very slow speeds),
  // push them apart proportionally to their inverse masses so energy is conserved.
  // The amount to separate is the overlap: touchDistance - centerDistance.
  // The distribution is inverse-mass-weighted: heavier cars move less.
  const overlap = Math.max(0, touchDistance - centerDistance);
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
      position: add(resultA.position, positionCorrection_a),
      velocity: resultA.velocity,
      heading: resultA.heading,
      yawSpin: resultA.yawSpin,
    };

    resultB = {
      position: add(resultB.position, positionCorrection_b),
      velocity: resultB.velocity,
      heading: resultB.heading,
      yawSpin: resultB.yawSpin,
    };
  }

  return { a: resultA, b: resultB, touched: true, impactSpeed };
}
