import { CAR_PERK } from '../constants.ts';
import type { CarPerkId } from '../constants.ts';
import { DAMAGE_ROLE } from './CarIntegrity.ts';
import type { DamageRole } from './CarIntegrity.ts';
import { TARMAC } from './ArcadeCarPhysics.ts';
import type { SurfaceConditions } from './Vehicle.ts';
import type { VehicleStats } from './VehicleStats.ts';

/**
 * The numbers behind each car's one signature advantage.
 *
 * A player cannot feel `grip: 30` against `grip: 35` while driving, but they can feel a
 * mechanic — winning a shove, cutting a corner across the dirt, being towed along a
 * straight. That is what these are: one felt advantage per car, which is what the owner
 * asked for when the game was "muito fácil para o jogador".
 *
 * **The perk ID travels as data in `cars.json`; these tunables deliberately do not.** The
 * manifest stays small, the numbers stay unit-testable in Node, and re-tuning a perk never
 * means regenerating a sprite sheet.
 *
 * **Every field is a MULTIPLIER OR A FRACTION, never an absolute.** Each rule below turns a
 * profile into a DERIVED value — an adjusted `VehicleStats`, an adjusted `SurfaceConditions`,
 * a damage scale — which the caller then hands to the ordinary physics. **No perk may write
 * velocity, position or heading**, the same rule that keeps the AI honest (locked decision
 * 12): a perk it cannot express is a perk it cannot cheat with.
 */
export interface CarPerkProfile {
  readonly id: CarPerkId;
  /** Shown to the player on the car-select screen. */
  readonly displayName: string;
  /** One line explaining what the driver will actually notice. */
  readonly description: string;
  /**
   * Multiplier on the mass a CAR-TO-CAR contact sees. 1 leaves contact untouched.
   *
   * Expressed as effective mass rather than as a bespoke impulse, because
   * `resolveCarContact` already splits an impulse by reciprocal mass: a heavier car both
   * shoves harder and is shoved less, which is exactly "wins contact" and "immovable",
   * and momentum stays conserved with respect to the masses actually used. Inventing a
   * second impulse rule would have neither property.
   */
  readonly contactMassMultiplier: number;
  /** Multiplier on impact damage this car TAKES. Below 1 shrugs hits off. */
  readonly impactDamageMultiplier: number;
  /**
   * How far off-road conditions are pulled back toward tarmac, 0..1.
   * 0 leaves the full penalty; 1 would make dirt indistinguishable from the road.
   */
  readonly offroadRecovery: number;
  /** Multiplier on the grip limit while the brake is applied. 1 changes nothing. */
  readonly brakingGripMultiplier: number;
  /**
   * Fraction added to engine power AND top speed at a full draft. 0 cannot draft.
   * See `draftedStats` for why both have to move together.
   */
  readonly slipstreamBonus: number;
  /**
   * Multiplier on weapon reload rate. Arsenal divides the NPC fire cooldown by
   * this and raises the missile refill ceiling via `missileCapacity`, so the
   * perk is a felt advantage once T-046's weapon system is live.
   */
  readonly reloadMultiplier: number;
}

/** A car with no perk. Every rule below is a no-op against this. */
export const NEUTRAL_PERK: CarPerkProfile = {
  id: CAR_PERK.ARSENAL,
  displayName: 'None',
  description: 'No signature advantage.',
  contactMassMultiplier: 1,
  impactDamageMultiplier: 1,
  offroadRecovery: 0,
  brakingGripMultiplier: 1,
  slipstreamBonus: 0,
  reloadMultiplier: 1,
};

function profile(overrides: Partial<CarPerkProfile> & Pick<CarPerkProfile, 'id' | 'displayName' | 'description'>): CarPerkProfile {
  return { ...NEUTRAL_PERK, ...overrides };
}

/**
 * One profile per perk. The bounds are deliberately modest: a perk has to be FELT, not
 * decisive, or the car select stops being a choice and becomes a correct answer.
 */
export const CAR_PERKS: Readonly<Record<CarPerkId, CarPerkProfile>> = Object.freeze({
  [CAR_PERK.BULLDOZER]: profile({
    id: CAR_PERK.BULLDOZER,
    displayName: 'Bulldozer',
    description: 'Wins contact. Shoves harder and pays less for the hit it started.',
    contactMassMultiplier: 1.8,
    // On TOP of the 40% share an aggressor already pays, so barging is genuinely cheap
    // for this car and expensive for everyone else.
    impactDamageMultiplier: 0.6,
  }),
  [CAR_PERK.OFF_ROAD_ACE]: profile({
    id: CAR_PERK.OFF_ROAD_ACE,
    displayName: 'Off-road Ace',
    description: 'Barely notices dirt. Can cut where nobody else dares.',
    // 0.7 of the way back to tarmac: dirt still costs something, so cutting is a
    // judgement call rather than a free racing line.
    offroadRecovery: 0.7,
  }),
  [CAR_PERK.ANVIL]: profile({
    id: CAR_PERK.ANVIL,
    displayName: 'Anvil',
    description: 'Immovable. Bounces others off and shrugs the damage off too.',
    contactMassMultiplier: 3,
    impactDamageMultiplier: 0.5,
  }),
  [CAR_PERK.SLIPSTREAM]: profile({
    id: CAR_PERK.SLIPSTREAM,
    displayName: 'Slipstream',
    description: 'Tows along in another car’s wake, then slings past.',
    slipstreamBonus: 0.14,
  }),
  [CAR_PERK.TRENCH_GRIP]: profile({
    id: CAR_PERK.TRENCH_GRIP,
    displayName: 'Trench Grip',
    description: 'Tracks bite under braking. Brakes later into a corner than anything else.',
    brakingGripMultiplier: 1.45,
  }),
  [CAR_PERK.ARSENAL]: profile({
    id: CAR_PERK.ARSENAL,
    displayName: 'Arsenal',
    description: 'Carries and reloads far more ordnance.',
    reloadMultiplier: 3,
  }),
});

/** The profile for a perk id, or the neutral profile when a car has no perk. */
export function perkProfile(id: CarPerkId | undefined): CarPerkProfile {
  if (id === undefined) {
    return NEUTRAL_PERK;
  }
  return CAR_PERKS[id] ?? NEUTRAL_PERK;
}

/**
 * The stats a CAR-TO-CAR contact should be resolved with.
 *
 * Only `mass` moves, and only for the duration of the contact — the roster's authored mass
 * is shared data read from `cars.json` and must never be mutated.
 */
export function contactStats(stats: VehicleStats, perk: CarPerkProfile): VehicleStats {
  if (perk.contactMassMultiplier === 1) {
    return stats;
  }
  return { ...stats, mass: stats.mass * perk.contactMassMultiplier };
}

/**
 * The surface this car actually experiences, given the surface everyone else would.
 *
 * Blends toward tarmac rather than branching on "is this off-road", which means the
 * function is a no-op on tarmac by construction — lerping tarmac toward tarmac cannot
 * change it — so there is no condition here to get backwards.
 *
 * This does NOT breach locked decision 11. That decision forbids folding the current
 * surface into the DRAG derivation, which stays a function of the car alone; adjusting the
 * surface's own grip and rolling resistance is precisely what the off-road penalty is made
 * of, and the penalty survives, merely reduced.
 */
export function perkSurface(surface: SurfaceConditions, perk: CarPerkProfile): SurfaceConditions {
  const recovery = clampUnit(perk.offroadRecovery);
  if (recovery === 0) {
    return surface;
  }
  return {
    gripMultiplier: lerp(surface.gripMultiplier, TARMAC.gripMultiplier, recovery),
    rollingResistance: lerp(surface.rollingResistance, TARMAC.rollingResistance, recovery),
  };
}

/**
 * Multiplier to apply to impact damage.
 *
 * Applied to the damage rather than folded into `armor`, because `armor` is clamped into
 * 0..1 and saturates: havac already carries 0.6, so expressing Anvil as an armour bump
 * would quietly do almost nothing for exactly the car that needs it most.
 */
export function perkDamageMultiplier(perk: CarPerkProfile, _role: DamageRole): number {
  return Math.max(0, perk.impactDamageMultiplier);
}

/** True when this perk cares about the damage role at all. Kept for the caller's clarity. */
export function isAggressorRole(role: DamageRole): boolean {
  return role === DAMAGE_ROLE.AGGRESSOR;
}

/**
 * The stats to drive one step with, once braking grip and any draft are accounted for.
 *
 * **Why a draft has to move `maxSpeed` as well as `enginePower`:** the drag coefficient is
 * DERIVED as `(enginePower - rollingResistance) / maxSpeed²` so that an authored `maxSpeed`
 * is exactly the terminal speed with no clamp (locked decision 11). Raise engine power
 * alone and the derived drag rises by the same factor, so the car accelerates harder and
 * tops out at precisely the same speed — a draft that cannot pull you past the car ahead,
 * which is the one thing a draft is for. Scaling both by `1 + bonus` makes terminal speed
 * rise by exactly `bonus` and keeps the derivation intact.
 *
 * `draftFactor` is the 0..1 tow strength from `Slipstream`; `braking` is whether the driver
 * is on the brake this step. Both are per-step inputs, so nothing is cached and nothing
 * goes stale — the trap that produced T-039.
 */
export function drivingStats(
  stats: VehicleStats,
  perk: CarPerkProfile,
  braking: boolean,
  draftFactor: number,
): VehicleStats {
  let result = stats;

  if (braking && perk.brakingGripMultiplier !== 1) {
    result = { ...result, grip: result.grip * Math.max(0, perk.brakingGripMultiplier) };
  }

  const draft = clampUnit(draftFactor) * Math.max(0, perk.slipstreamBonus);
  if (draft > 0) {
    const boost = 1 + draft;
    result = {
      ...result,
      enginePower: result.enginePower * boost,
      maxSpeed: result.maxSpeed * boost,
    };
  }

  return result;
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}
