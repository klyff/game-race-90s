/**
 * Tunables for T-046 weapons. Kept as named constants so a test can assert the
 * owner's numbers rather than magic literals scattered through the rules.
 */

import { isWarTankPerk } from '../constants.ts';

/**
 * Missiles on the grid for EVERY car (owner, 2026-08-16). Refill at the finish
 * line goes up to that car's own `ammoCapacity` (battle-trak 15, air-blade 4).
 */
export const MISSILE_START_COUNT = 6;

/** Oil slicks each car may carry. */
export const OIL_START_COUNT = 4;

/** Landmines each car may carry. */
export const MINE_START_COUNT = 4;

/**
 * Missile travel speed as a multiple of the firing car's authored `maxSpeed`.
 * Owner: "1.4x the max velocity of cars".
 */
export const MISSILE_SPEED_FACTOR = 1.4;

/**
 * Catalog missile damage BEFORE the global weapon scale and armor.
 * Live hits apply `scaledWeaponDamage()` on top (30% for everyone, 70% for
 * the war tank's own cannon) so cars last long enough to buy and equip more kit.
 */
export const MISSILE_RAW_DAMAGE = 0.5;

/**
 * Catalog landmine damage BEFORE the global weapon scale and armor.
 * Was an instant wreck (1.0, armor ignored). Now a real hit that armor can
 * shrug, so a mine is dangerous without ending the race on contact.
 */
export const MINE_RAW_DAMAGE = 1;

/** Everyone else's weapons deal this fraction of the catalog raw values. */
export const WEAPON_DAMAGE_SCALE = 0.3;

/**
 * War tank outgoing weapon scale. Magma Rex (car-6) keeps a real cannon:
 * 30% off the catalog raw, while every other car is cut to 30%.
 */
export const TANK_WEAPON_DAMAGE_SCALE = 0.7;

/** Catalog raw × the FIRING car's outgoing weapon scale. */
export function scaledWeaponDamage(rawDamage: number, attackerPerkId: string | undefined): number {
  const scale = isWarTankPerk(attackerPerkId) ? TANK_WEAPON_DAMAGE_SCALE : WEAPON_DAMAGE_SCALE;
  return rawDamage * scale;
}

/**
 * How long a missile may fly before it is discarded, seconds. Long enough to
 * cross the aim range at missile speed; short enough that a miss does not
 * litter the field forever.
 */
export const MISSILE_LIFETIME_SECONDS = 2.5;

/**
 * NPC aim range, world units.
 *
 * Owner asked for "~300 ft in scale". A car's collision diameter is roughly one
 * car length (~15 ft on a real road), and `collisionRadius` for the marauder is
 * 1.7, so one world unit ≈ 15 / (2 * 1.7) ≈ 4.41 ft. 300 ft / 4.41 ≈ 68.
 * Recorded here so the conversion is not re-derived from a guess next session.
 */
export const MISSILE_AIM_RANGE_WORLD_UNITS = 68;

/** Half-angle of the NPC missile aim cone, radians (~20°). Legacy cone model. */
export const MISSILE_AIM_HALF_ANGLE = 0.35;

/**
 * The green aim line reaches this many CAR LENGTHS ahead of the nose, and the
 * per-car aim circle (`VehicleStats.aimRadius`) sits at its end. Owner:
 * "uma linha verde que sai do meio do carro até 2.5x o tamanho do carro".
 */
export const AIM_REACH_CAR_LENGTHS = 2.5;

/**
 * Converts a car's `collisionRadius` into an approximate car length for the aim
 * reach. The marauder is ~4.0 long with a 1.7 collision radius (4.0 / 1.7 ≈ 2.35),
 * so this keeps the reticle distance honest against the authored proportions.
 */
export const CAR_LENGTH_PER_COLLISION_RADIUS = 2.35;

/**
 * Aim circle radius (world units) for a car that does not author one. A larger
 * circle is a larger capture zone for a missile lock — "quanto maior, mais preciso".
 */
export const DEFAULT_AIM_RADIUS = 3;

/**
 * Seconds between NPC weapon decisions. Arsenal divides this by its
 * `reloadMultiplier` so the perk is a felt rate boost, not a silent flag.
 */
export const NPC_WEAPON_COOLDOWN_SECONDS = 1.2;

/**
 * Oil slick diameter as a fraction of the dropper's car length.
 * Owner: at most 0.9 of a car.
 */
export const OIL_SIZE_OF_CAR = 0.9;

/**
 * Landmine / grenade diameter as a fraction of the dropper's car length.
 * Owner: a quarter of a car, plus a little.
 */
export const MINE_SIZE_OF_CAR = 0.28;

/** Gasoline barrel diameter as a fraction of a typical car length. Same puck as a mine. */
export const GASOLINE_SIZE_OF_CAR = MINE_SIZE_OF_CAR;

/** Visual explosion scale for a gasoline barrel vs a car wreck (1.8×). */
export const GASOLINE_BURST_SCALE = 1.8;

/** Weapon / hazard puff intensity fed to `ExplosionEffect.burst`. */
export const HAZARD_BURST_INTENSITY = 0.4;

/** Clamp a burst scale option so a missing or junk value still draws at 1×. */
export function resolveBurstScale(scale: number | undefined): number {
  if (!Number.isFinite(scale) || (scale as number) <= 0) {
    return 1;
  }
  return scale as number;
}

/**
 * Oil lifetime as a multiple of one estimated lap on the current track.
 * Owner: "persist for the time of a 1.6-lap run on that track".
 */
export const OIL_LIFETIME_LAPS = 1.6;

/**
 * How long a car-wreck burn mark stays on the asphalt, in estimated laps.
 * Owner: leave the scorch for one and a half laps of the current track.
 */
export const BURN_MARK_LIFETIME_LAPS = 1.5;

/**
 * Mean race speed used to turn a track length into an estimated lap time for
 * oil lifetime, world units/s. Measured marauder on Thunder Basin averages
 * ~45 u/s (1505 units / 33.2 s); this is that number, not a guess.
 */
export const OIL_LAP_REFERENCE_SPEED = 45;

/**
 * Absolute yaw-spin applied when a car drives through oil, before armor
 * resistance. Decays via `YAW_SPIN_DECAY_PER_SECOND`; a value this large costs
 * well over four seconds of race time even though the spin itself fades in ~2 s
 * (owner: "loses at least 4 seconds" of control / race position).
 */
export const OIL_YAW_SPIN = 14;

/**
 * How far behind the rear bumper a mine / oil is thrown, in car lengths.
 * Two lengths plus the bumper/radius offset keeps the puck out from under
 * the dropper, including fat sprites like the war tank.
 */
export const DROP_BEHIND_CAR_LENGTHS = 2;

/**
 * How close behind an NPC a rival must be, in world units, before the NPC drops
 * an oil slick in its path. Loose enough to be a real threat when chased.
 */
export const NPC_OIL_DROP_GAP_UNITS = 16;

/**
 * How close behind an NPC a rival must be before it drops a landmine. Tighter
 * than oil because a mine destroys outright — the AI only spends one when the
 * chaser is right on its tail.
 */
export const NPC_MINE_DROP_GAP_UNITS = 10;
