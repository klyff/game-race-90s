import type { VehicleStats } from './VehicleStats.ts';

/**
 * Car condition states, derived from the integrity level.
 *
 * These states are semantically meaningful for the HUD and the explosion effect;
 * the underlying `integrity` value is what the physics actually uses.
 */
export const CAR_CONDITION = {
  HEALTHY: 'healthy',
  DAMAGED: 'damaged',
  CRITICAL: 'critical',
  DESTROYED: 'destroyed',
} as const;
export type CarCondition = (typeof CAR_CONDITION)[keyof typeof CAR_CONDITION];

/**
 * Role in an impact: who is taking the damage relative to who dealt it.
 *
 * VICTIM: the car being hit (wall collision, side-swiped). Takes full damage.
 * AGGRESSOR: the car that initiated the collision (ran into a wall or another car).
 * The aggressor gets a break: it keeps 40% of the harm, because its reinforced
 * front end is designed to handle impacts, and it was in control of the crash.
 */
export const DAMAGE_ROLE = { VICTIM: 'victim', AGGRESSOR: 'aggressor' } as const;
export type DamageRole = (typeof DAMAGE_ROLE)[keyof typeof DAMAGE_ROLE];

/**
 * Structural integrity of a car, tracking damage and respawn state.
 *
 * `integrity` ranges from 0 (destroyed) to 1 (pristine). The `condition` field
 * derives from `integrity` for semantic meaning — the HUD and explosion effects
 * read this rather than a raw number. While the car is DESTROYED, `respawnRemaining`
 * counts down; when it reaches 0, the car restores to pristine.
 *
 * Both wall collisions (scaled by impact speed) and weapon hits (mitigated by armor)
 * reduce integrity. The `armor` stat 0..1 acts as damage reduction: higher armor,
 * less integrity loss per hit. A car at 0 integrity is DESTROYED and ignores further
 * damage until respawn.
 */
export interface CarIntegrity {
  /** 1 = pristine, 0 = destroyed. Clamped to [0, 1]. */
  readonly integrity: number;
  /** Semantic state derived from integrity thresholds. */
  readonly condition: CarCondition;
  /** Seconds remaining before respawn. 0 when driveable. Clamped to >= 0. */
  readonly respawnRemaining: number;
}

/**
 * Damage threshold speed for wall collisions, world units/s.
 *
 * Below this threshold, a wall contact causes no damage. This prevents
 * constant light scrapes (which happen by design at speed while drifting)
 * from destroying the car over a single lap. A car scraping a wall at 5 u/s
 * while cornering costs nothing; hitting a wall head-on at 70 u/s is severe.
 */
const IMPACT_DAMAGE_THRESHOLD = 6;

/**
 * Denominator for scaling wall impact damage. Impact damage is computed as:
 *
 *   rawDamage = max(0, (impactSpeed - IMPACT_DAMAGE_THRESHOLD)²) / IMPACT_DAMAGE_DENOMINATOR
 *   finalDamage = rawDamage * (1 - armor) * roleShare
 *
 * A full-speed 70 u/s head-on hit as a victim against armor 0.4 (marauder) deals ~90% integrity loss.
 * This constant was tuned so that:
 * - A glancing 5 u/s scrape deals 0 damage (below threshold).
 * - A 70 u/s victim impact scales quadratically, leaving the car nearly destroyed.
 * - One genuine head-on crash is nearly lethal, enforcing that crashes matter.
 *
 * See `tests/domain/CarIntegrity.test.ts` for the arithmetic.
 */
const IMPACT_DAMAGE_DENOMINATOR = 2731;

/**
 * Integrity threshold above which the car is HEALTHY, otherwise it's DAMAGED.
 * At or above this fraction: condition = HEALTHY.
 */
const CONDITION_HEALTHY_THRESHOLD = 0.66;

/**
 * Integrity threshold above which the car is DAMAGED, otherwise it's CRITICAL.
 * Between this and HEALTHY_THRESHOLD: condition = DAMAGED.
 */
const CONDITION_DAMAGED_THRESHOLD = 0.33;

/**
 * Seconds the car sits destroyed before respawning and restoring to pristine.
 * Once the respawn timer reaches 0, the car becomes HEALTHY and driveable again.
 */
const RESPAWN_TIME_SECONDS = 2.0;

/**
 * Fraction of damage retained by an aggressor in a collision.
 *
 * When a car hits another car or a wall, the aggressor (the car that initiated
 * the impact) takes less damage than the victim, because its reinforced front end
 * is built to handle impacts, and the driver was in control of the crash.
 * The aggressor retains 40% of the harm and the victim takes the full 100%.
 *
 * This is applied only to impact damage (wall/car collisions). Weapon damage
 * has no aggressor concept and is never mitigated this way.
 */
const AGGRESSOR_DAMAGE_SHARE = 0.4;

/**
 * Creates a pristine, undamaged car at full integrity and ready to drive.
 */
export function createCarIntegrity(): CarIntegrity {
  return {
    integrity: 1,
    condition: CAR_CONDITION.HEALTHY,
    respawnRemaining: 0,
  };
}

/**
 * Derives the condition from integrity, clamped to [0, 1].
 */
function conditionFromIntegrity(integrity: number): CarCondition {
  const clamped = Math.max(0, Math.min(1, integrity));

  if (clamped > CONDITION_HEALTHY_THRESHOLD) {
    return CAR_CONDITION.HEALTHY;
  } else if (clamped > CONDITION_DAMAGED_THRESHOLD) {
    return CAR_CONDITION.DAMAGED;
  } else if (clamped > 0) {
    return CAR_CONDITION.CRITICAL;
  } else {
    return CAR_CONDITION.DESTROYED;
  }
}

/**
 * Applies damage from a wall collision, scaled by impact speed and mitigated by armor.
 *
 * A collision at `impactSpeed` below `IMPACT_DAMAGE_THRESHOLD` deals no damage; above it,
 * damage scales quadratically with the excess speed, then is reduced by the car's armor.
 * The role determines who is absorbing the impact: a VICTIM takes full damage, while an
 * AGGRESSOR (the car that initiated the collision) takes a reduced share.
 * Once the car reaches 0 integrity, it is DESTROYED and cannot take further damage until
 * `tickIntegrity` restores it.
 *
 * This is pure: the input is never mutated, and the output is always a fresh object.
 *
 * All numeric inputs are guarded against NaN and Infinity; no input can corrupt the state.
 */
export function applyImpactDamage(
  current: CarIntegrity,
  impactSpeed: number,
  stats: VehicleStats,
  role: DamageRole = DAMAGE_ROLE.VICTIM,
  damageScale: number = 1,
): CarIntegrity {
  // Guard against NaN; Infinity is treated as catastrophic damage.
  const safeSpeed = Number.isNaN(impactSpeed) ? 0 : impactSpeed;
  const safeArmor = Number.isFinite(stats.armor) ? stats.armor : 0.5;

  // A destroyed car ignores further damage until respawn.
  if (current.condition === CAR_CONDITION.DESTROYED) {
    return current;
  }

  // Impact below threshold deals no damage.
  const excessSpeed = Math.max(0, safeSpeed - IMPACT_DAMAGE_THRESHOLD);
  if (excessSpeed === 0) {
    return current;
  }

  // Damage scales quadratically with excess speed, then is reduced by armor.
  // Armor 0..1: 0 = no protection, 1 = full protection.
  const squaredExcess = excessSpeed * excessSpeed;
  const rawDamage = squaredExcess / IMPACT_DAMAGE_DENOMINATOR;
  const armorReduction = Math.max(0, Math.min(1, safeArmor));
  let finalDamage = rawDamage * (1 - armorReduction);

  // Apply role share: aggressors take less damage.
  if (role === DAMAGE_ROLE.AGGRESSOR) {
    finalDamage *= AGGRESSOR_DAMAGE_SHARE;
  }

  // A car's signature advantage may make it tougher still (T-037's Anvil and Bulldozer).
  //
  // Applied as a multiplier on the DAMAGE rather than as a bump to `armor`, because
  // `armor` is clamped into 0..1 and saturates: havac already carries 0.6, so expressing
  // "shrugs off damage" as extra armour would do almost nothing for exactly the car whose
  // whole identity is taking hits. Defaults to 1, so every existing call site is unchanged.
  finalDamage *= Number.isFinite(damageScale) ? Math.max(0, damageScale) : 1;

  // Apply damage, clamped to [0, 1].
  const newIntegrity = Math.max(0, current.integrity - finalDamage);
  const condition = conditionFromIntegrity(newIntegrity);

  // If destroyed, set respawn timer. Otherwise leave it at 0.
  const respawnRemaining =
    condition === CAR_CONDITION.DESTROYED ? RESPAWN_TIME_SECONDS : 0;

  return {
    integrity: newIntegrity,
    condition,
    respawnRemaining,
  };
}

/**
 * Applies damage from a weapon hit, mitigated by armor.
 *
 * Weapon damage is a raw value (defined by the weapon system, T-016) that is reduced
 * by the car's armor. A car with higher armor loses less integrity per hit. Once the
 * car reaches 0 integrity, it is DESTROYED and cannot take further damage until
 * `tickIntegrity` restores it.
 *
 * This is pure: the input is never mutated, and the output is always a fresh object.
 *
 * All numeric inputs are guarded against NaN and Infinity; no input can corrupt the state.
 */
export function applyWeaponDamage(
  current: CarIntegrity,
  rawDamage: number,
  stats: VehicleStats,
): CarIntegrity {
  // Guard against NaN; Infinity is treated as catastrophic damage.
  const safeDamage = Number.isNaN(rawDamage) ? 0 : Math.max(0, rawDamage);
  const safeArmor = Number.isFinite(stats.armor) ? stats.armor : 0.5;

  // A destroyed car ignores further damage until respawn.
  if (current.condition === CAR_CONDITION.DESTROYED) {
    return current;
  }

  // No damage means no change.
  if (safeDamage === 0) {
    return current;
  }

  // Armor reduces damage: damage = rawDamage * (1 - armor).
  // Armor 0..1: 0 = no protection, 1 = full protection.
  const armorReduction = Math.max(0, Math.min(1, safeArmor));
  const finalDamage = safeDamage * (1 - armorReduction);

  // Apply damage, clamped to [0, 1].
  const newIntegrity = Math.max(0, current.integrity - finalDamage);
  const condition = conditionFromIntegrity(newIntegrity);

  // If destroyed, set respawn timer. Otherwise leave it at 0.
  const respawnRemaining =
    condition === CAR_CONDITION.DESTROYED ? RESPAWN_TIME_SECONDS : 0;

  return {
    integrity: newIntegrity,
    condition,
    respawnRemaining,
  };
}

/**
 * Ticks the respawn timer down by `deltaSeconds`. Once it reaches 0, the car is
 * restored to pristine HEALTHY condition and is driveable again.
 *
 * While the car is driveable (condition != DESTROYED), the timer stays at 0.
 * Only when DESTROYED does it count down.
 *
 * This is pure: the input is never mutated, and the output is always a fresh object.
 *
 * All numeric inputs are guarded against NaN and Infinity; no input can corrupt the state.
 */
export function tickIntegrity(
  current: CarIntegrity,
  deltaSeconds: number,
): CarIntegrity {
  // Guard against NaN and Infinity.
  const safeDelta = Number.isFinite(deltaSeconds) ? deltaSeconds : 0;

  // If the car is not destroyed, the timer is not running.
  if (current.condition !== CAR_CONDITION.DESTROYED) {
    return current;
  }

  // Count the timer down.
  const newRemaining = Math.max(0, current.respawnRemaining - safeDelta);

  // When the timer reaches 0, restore the car to pristine HEALTHY condition.
  if (newRemaining === 0) {
    return createCarIntegrity();
  }

  // Timer is still running; update the remaining time.
  return {
    ...current,
    respawnRemaining: newRemaining,
  };
}
