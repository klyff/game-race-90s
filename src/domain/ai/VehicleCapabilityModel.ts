/**
 * Roster-normalized vehicle capabilities. Never feed raw mass/maxSpeed into utility.
 *
 * 0 = poor relative to the current roster, 0.5 = average, 1 = excellent.
 * steerSpeedFalloff is inverted: lower falloff is better high-speed authority.
 */

import { contactStats, drivingStats, homeWorldStats } from '../vehicle/CarPerk.ts';
import type { CarPerkProfile } from '../vehicle/CarPerk.ts';
import type { VehicleStats } from '../vehicle/VehicleStats.ts';
import { missileCapacity } from '../weapons/WeaponInventory.ts';
import { clamp01 } from './math.ts';

export interface StatNormalizer {
  normalize(field: keyof VehicleStats, value: number, invert?: boolean): number;
}

export interface VehicleCapabilities {
  readonly speedCapability: number;
  readonly accelerationCapability: number;
  readonly brakingCapability: number;
  readonly corneringCapability: number;
  readonly highSpeedSteeringCapability: number;
  readonly durabilityCapability: number;
  readonly rammingCapability: number;
  readonly weaponCapability: number;
  readonly blockingCapability: number;
  readonly overtakingCapability: number;
  readonly defensiveCapability: number;
}

const FIELDS: readonly (keyof VehicleStats)[] = [
  'mass',
  'enginePower',
  'brakeForce',
  'maxSpeed',
  'grip',
  'steerRate',
  'steerSpeedFalloff',
  'armor',
  'ammoCapacity',
  'collisionRadius',
  'aimRadius',
];

function minMax(values: readonly number[]): { min: number; max: number } {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (!Number.isFinite(value)) {
      continue;
    }
    if (value < min) {
      min = value;
    }
    if (value > max) {
      max = value;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 0 };
  }
  return { min, max };
}

/**
 * Build a normalizer from the actual fleet (or any roster). Equal values → 0.5.
 */
export function buildStatNormalizer(roster: readonly VehicleStats[]): StatNormalizer {
  const ranges = new Map<keyof VehicleStats, { min: number; max: number }>();
  for (const field of FIELDS) {
    ranges.set(
      field,
      minMax(roster.map(stats => Number(stats[field]))),
    );
  }
  return {
    normalize(field, value, invert = false) {
      const range = ranges.get(field);
      if (range === undefined || range.min === range.max) {
        return 0.5;
      }
      const unit = clamp01((value - range.min) / (range.max - range.min));
      return invert ? 1 - unit : unit;
    },
  };
}

function mix(
  terms: readonly { value: number; weight: number }[],
): number {
  let sum = 0;
  let weight = 0;
  for (const term of terms) {
    sum += term.value * term.weight;
    weight += term.weight;
  }
  return weight <= 0 ? 0.5 : clamp01(sum / weight);
}

export function capabilitiesFromStats(
  stats: VehicleStats,
  normalizer: StatNormalizer,
  extras?: { contactMass?: number; missileCap?: number },
): VehicleCapabilities {
  const n = (field: keyof VehicleStats, value: number, invert = false): number =>
    normalizer.normalize(field, value, invert);

  const mass = n('mass', extras?.contactMass ?? stats.mass);
  const engine = n('enginePower', stats.enginePower);
  const brake = n('brakeForce', stats.brakeForce);
  const speed = n('maxSpeed', stats.maxSpeed);
  const grip = n('grip', stats.grip);
  const steer = n('steerRate', stats.steerRate);
  const highSteer = n('steerSpeedFalloff', stats.steerSpeedFalloff, true);
  const armor = n('armor', stats.armor);
  const ammo = n('ammoCapacity', extras?.missileCap ?? stats.ammoCapacity);
  const radius = n('collisionRadius', stats.collisionRadius);
  const aim = n('aimRadius', stats.aimRadius);

  return {
    speedCapability: speed,
    accelerationCapability: engine,
    brakingCapability: brake,
    corneringCapability: mix([
      { value: grip, weight: 0.55 },
      { value: steer, weight: 0.25 },
      { value: highSteer, weight: 0.2 },
    ]),
    highSpeedSteeringCapability: highSteer,
    durabilityCapability: mix([
      { value: armor, weight: 0.6 },
      { value: mass, weight: 0.4 },
    ]),
    overtakingCapability: mix([
      { value: speed, weight: 0.35 },
      { value: engine, weight: 0.25 },
      { value: grip, weight: 0.2 },
      { value: steer, weight: 0.15 },
      { value: brake, weight: 0.05 },
    ]),
    rammingCapability: mix([
      { value: mass, weight: 0.35 },
      { value: armor, weight: 0.25 },
      { value: engine, weight: 0.15 },
      { value: radius, weight: 0.15 },
      { value: speed, weight: 0.1 },
    ]),
    weaponCapability: mix([
      { value: ammo, weight: 0.45 },
      { value: aim, weight: 0.35 },
      { value: speed, weight: 0.1 },
      { value: armor, weight: 0.1 },
    ]),
    blockingCapability: mix([
      { value: grip, weight: 0.25 },
      { value: mass, weight: 0.2 },
      { value: brake, weight: 0.2 },
      { value: steer, weight: 0.2 },
      { value: armor, weight: 0.15 },
    ]),
    defensiveCapability: mix([
      { value: armor, weight: 0.3 },
      { value: mass, weight: 0.25 },
      { value: grip, weight: 0.2 },
      { value: brake, weight: 0.15 },
      { value: steer, weight: 0.1 },
    ]),
  };
}

/**
 * Planning stats the AI should read: home-world + always-on perk, no draft/turbo charge.
 * Mirrors the physics derivation without re-applying bonuses a second time.
 */
export function planningStats(
  base: VehicleStats,
  perk: CarPerkProfile,
  homePlanetId: string | undefined,
  worldAdvantage: number | undefined,
  racePlanetId: string | undefined,
): VehicleStats {
  const worlded = homeWorldStats(base, homePlanetId, worldAdvantage, racePlanetId);
  return drivingStats(worlded, perk, false, 0, false);
}

export function planningCapabilities(
  base: VehicleStats,
  perk: CarPerkProfile,
  homePlanetId: string | undefined,
  worldAdvantage: number | undefined,
  racePlanetId: string | undefined,
  normalizer: StatNormalizer,
): VehicleCapabilities {
  const effective = planningStats(base, perk, homePlanetId, worldAdvantage, racePlanetId);
  const contact = contactStats(effective, perk);
  return capabilitiesFromStats(effective, normalizer, {
    contactMass: contact.mass,
    missileCap: missileCapacity(base, perk),
  });
}
